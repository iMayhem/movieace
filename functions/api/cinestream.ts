// Cloudflare Pages Function for CineStream scraping
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const TIMEOUT = {
  PLAYSRC: 8000,
  VIDFLIX: 8000,
  VIDEASY: 6000,
  DECRYPT: 5000,
  TMDB: 4000,
  PROXY: 30000,
};

const VIDEASY_PARALLEL = 8;
const VIDEASY_MAX_SUCCESS = 3;

function doubleEscapeTitle(title) {
  if (!title) return '';
  return encodeURIComponent(encodeURIComponent(title));
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 8000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Playsrc Resolver
async function scrapePlaysrc(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://api.madplay.site/api/playsrc?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': USER_AGENT },
      cf: { cacheTtl: 3600 },
      timeoutMs: TIMEOUT.PLAYSRC,
    });
    if (!res.ok) return { options: [], captions: [] };

    const list = await res.json();
    const options = [];
    const captions = [];

    if (Array.isArray(list)) {
      list.forEach((item, index) => {
        if (item.file) {
          options.push({
            url: item.file,
            quality: 'Auto',
            format: item.file.includes('.m3u8') ? 'm3u8' : 'mp4',
            server: `Playsrc [S${index + 1}]`,
            headers: item.headers || {},
          });
        }
      });
    }

    return { options, captions };
  } catch {
    return { options: [], captions: [] };
  }
}

// Vidflix Resolver
async function scrapeVidflix(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://madplay.site/api/movies/holly?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': USER_AGENT },
      cf: { cacheTtl: 3600 },
      timeoutMs: TIMEOUT.VIDFLIX,
    });
    if (!res.ok) return { options: [], captions: [] };

    const list = await res.json();
    const options = [];
    const captions = [];

    if (Array.isArray(list)) {
      list.forEach((item, index) => {
        if (item.file) {
          const headers = {};
          if (item.headers) {
            if (item.headers.Referer) headers.Referer = item.headers.Referer;
            if (item.headers.Origin) headers.Origin = item.headers.Origin;
          }
          options.push({
            url: item.file,
            quality: 'Auto',
            format: item.file.includes('.m3u8') ? 'm3u8' : 'mp4',
            server: `Vidflix [S${index + 1}]`,
            headers,
          });
        }
      });
    }

    return { options, captions };
  } catch {
    return { options: [], captions: [] };
  }
}

// Videasy Server List
const VIDEASY_SERVERS = [
  'myflixerzupcloud',
  '1movies',
  'moviebox',
  'primewire',
  'm4uhd',
  'hdmovie',
  'cdn',
  'primesrcme',
  'visioncine',
  'overflix',
  'superflix',
  'cuevana',
  'lamovie',
  'mb-flix',
];

async function scrapeVideasyForServer(server, type, tmdbId, title, year, season, episode) {
  try {
    const encTitle = doubleEscapeTitle(title);
    const headers = {
      Accept: '*/*',
      'User-Agent': USER_AGENT,
      Origin: 'https://www.cineby.sc',
      Referer: 'https://www.cineby.sc/',
    };

    const url = type === 'movie'
      ? `https://api.videasy.net/${server}/sources-with-title?title=${encTitle}&mediaType=movie&year=${year}&tmdbId=${tmdbId}`
      : `https://api.videasy.net/${server}/sources-with-title?title=${encTitle}&mediaType=tv&year=${year}&tmdbId=${tmdbId}&episodeId=${episode}&seasonId=${season}`;

    const res = await fetchWithTimeout(url, { headers, cf: { cacheTtl: 3600 }, timeoutMs: TIMEOUT.VIDEASY });
    if (!res.ok) return null;

    const encryptedText = await res.text();
    if (!encryptedText) return null;

    const decRes = await fetchWithTimeout('https://enc-dec.app/api/dec-videasy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: encryptedText,
        id: Number(tmdbId),
      }),
      timeoutMs: TIMEOUT.DECRYPT,
    });
    if (!decRes.ok) return null;

    const decData = await decRes.json();
    if (decData && decData.result) {
      const result = decData.result;
      const options = [];
      const captions = [];

      if (Array.isArray(result.sources)) {
        result.sources.forEach((src) => {
          options.push({
            url: `/api/cinestream?proxyUrl=${encodeURIComponent(src.url)}`,
            quality: src.quality || 'Auto',
            format: src.url.includes('.m3u8') ? 'm3u8' : 'mp4',
            server: `Videasy [${server.toUpperCase()}]`,
            headers,
          });
        });
      }

      if (Array.isArray(result.subtitles)) {
        result.subtitles.forEach((sub) => {
          captions.push({
            url: `/api/cinestream?proxyUrl=${encodeURIComponent(sub.url)}`,
            language: sub.language || 'English',
            languageCode: sub.languageCode || 'en',
          });
        });
      }

      return { options, captions };
    }
  } catch {
    // Ignore server failures
  }
  return null;
}

async function collectVideasyResults(type, id, title, year, season, episode) {
  const servers = VIDEASY_SERVERS.slice(0, VIDEASY_PARALLEL);
  const globalDeadlineMs = TIMEOUT.VIDEASY + TIMEOUT.DECRYPT + 2000;

  const tasks = servers.map((server) =>
    Promise.race([
      scrapeVideasyForServer(server, type, id, title, year, season, episode),
      new Promise((resolve) => setTimeout(() => resolve(null), globalDeadlineMs)),
    ]),
  );

  const settled = await Promise.allSettled(tasks);
  const merged = { options: [], captions: [] };
  let successCount = 0;

  for (const result of settled) {
    if (successCount >= VIDEASY_MAX_SUCCESS) break;
    if (result.status !== 'fulfilled' || !result.value) continue;
    merged.options.push(...result.value.options);
    merged.captions.push(...result.value.captions);
    successCount += 1;
  }

  return merged;
}

function mergeProviderResults(settled) {
  const options = [];
  const captions = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    options.push(...(result.value.options || []));
    captions.push(...(result.value.captions || []));
  }
  return { options, captions };
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const proxyUrl = url.searchParams.get('proxyUrl');
  if (proxyUrl) {
    try {
      const headers = {
        'User-Agent': USER_AGENT,
        Origin: 'https://www.cineby.sc',
        Referer: 'https://www.cineby.sc/',
      };
      const proxyRes = await fetchWithTimeout(proxyUrl, { headers, timeoutMs: TIMEOUT.PROXY });
      if (!proxyRes.ok) return new Response('Proxy offline', { status: proxyRes.status });

      const contentType = proxyRes.headers.get('content-type') || '';

      if (proxyUrl.includes('.vtt') || contentType.includes('text/vtt') || proxyUrl.includes('type=vtt')) {
        const text = await proxyRes.text();
        return new Response(text, {
          headers: {
            'content-type': 'text/vtt',
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=86400',
          },
        });
      }

      if (proxyUrl.includes('.m3u8') || contentType.includes('application/x-mpegURL') || contentType.includes('application/vnd.apple.mpegurl')) {
        const text = await proxyRes.text();
        const lines = text.split('\n');
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const absoluteUrl = new URL(trimmed, proxyUrl).href;
              return `/api/cinestream?proxyUrl=${encodeURIComponent(absoluteUrl)}`;
            } catch {
              return line;
            }
          }
          return line;
        });

        return new Response(rewrittenLines.join('\n'), {
          headers: {
            'content-type': 'application/vnd.apple.mpegurl',
            'access-control-allow-origin': '*',
          },
        });
      }

      return new Response(proxyRes.body, {
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
          'access-control-expose-headers': '*',
        },
      });
    } catch {
      return new Response('Proxy error', { status: 500 });
    }
  }

  let type = url.searchParams.get('type');
  let id = url.searchParams.get('id');
  const title = url.searchParams.get('title') || '';
  const year = url.searchParams.get('year') || '';
  let season = url.searchParams.get('season') || '';
  const episode = url.searchParams.get('episode') || '';

  if (!id || !type) {
    return new Response(JSON.stringify({ error: 'Missing required query parameters: id, type' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  }

  if (type === 'anime') {
    try {
      const searchRes = await fetchWithTimeout(
        `https://api.themoviedb.org/3/search/tv?api_key=dfa4c2c7c1de1005adee824dc5593672&query=${encodeURIComponent(title)}`,
        { cf: { cacheTtl: 86400 }, timeoutMs: TIMEOUT.TMDB },
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData?.results?.length > 0) {
          let mappedResult = searchData.results.find((r) => r.genre_ids?.includes(16));
          if (!mappedResult) mappedResult = searchData.results[0];
          id = String(mappedResult.id);
          type = 'tv';
          season = '1';
        }
      }
    } catch {
      // Ignore fallback
    }
  }

  const buildResponse = (opts, caps) => {
    const seenUrls = new Set();
    const options = opts.filter((opt) => {
      if (seenUrls.has(opt.url)) return false;
      seenUrls.add(opt.url);
      return true;
    });

    const seenSubs = new Set();
    const captions = caps.filter((sub) => {
      if (seenSubs.has(sub.url)) return false;
      seenSubs.add(sub.url);
      return true;
    });

    return { options, captions };
  };

  const jsonHeaders = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  };

  const quickSettled = await Promise.allSettled([
    scrapePlaysrc(type, id, season, episode),
    scrapeVidflix(type, id, season, episode),
  ]);

  const quickMerged = mergeProviderResults(quickSettled);

  if (quickMerged.options.length > 0) {
    const { options, captions } = buildResponse(quickMerged.options, quickMerged.captions);

    context.waitUntil(collectVideasyResults(type, id, title, year, season, episode));

    return new Response(
      JSON.stringify({
        stream: options[0],
        options,
        captions,
      }),
      {
        headers: {
          ...jsonHeaders,
          'cache-control': 'public, max-age=1800',
        },
      },
    );
  }

  const videasyMerged = await collectVideasyResults(type, id, title, year, season, episode);
  const allOptions = [...quickMerged.options, ...videasyMerged.options];
  const allCaptions = [...quickMerged.captions, ...videasyMerged.captions];

  const { options, captions } = buildResponse(allOptions, allCaptions);

  if (options.length === 0) {
    return new Response(JSON.stringify({ error: 'No streamable direct links found for this item.' }), {
      status: 404,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      stream: options[0],
      options,
      captions,
    }),
    {
      headers: {
        ...jsonHeaders,
        'cache-control': 'public, max-age=1800',
      },
    },
  );
}
