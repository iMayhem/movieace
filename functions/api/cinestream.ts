// Cloudflare Pages Function for CineStream scraping
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function doubleEscapeTitle(title) {
  if (!title) return '';
  return encodeURIComponent(encodeURIComponent(title));
}

// Playsrc Resolver
async function scrapePlaysrc(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://api.madplay.site/api/playsrc?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      cf: { cacheTtl: 3600 }
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
            headers: item.headers || {}
          });
        }
      });
    }

    return { options, captions };
  } catch (err) {
    return { options: [], captions: [] };
  }
}

// Vidflix Resolver
async function scrapeVidflix(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://madplay.site/api/movies/holly?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      cf: { cacheTtl: 3600 }
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
            headers
          });
        }
      });
    }

    return { options, captions };
  } catch (err) {
    return { options: [], captions: [] };
  }
}

// Videasy Server List
const VIDEASY_SERVERS = [
  "myflixerzupcloud",
  "1movies",
  "moviebox",
  "primewire",
  "m4uhd",
  "hdmovie",
  "cdn",
  "primesrcme",
  "visioncine",
  "overflix",
  "superflix",
  "cuevana",
  "lamovie",
  "mb-flix"
];

async function scrapeVideasyForServer(server, type, tmdbId, title, year, season, episode) {
  try {
    const encTitle = doubleEscapeTitle(title);
    const headers = {
      "Accept": "*/*",
      "User-Agent": USER_AGENT,
      "Origin": "https://www.cineby.sc",
      "Referer": "https://www.cineby.sc/"
    };

    const url = type === 'movie'
      ? `https://api.videasy.net/${server}/sources-with-title?title=${encTitle}&mediaType=movie&year=${year}&tmdbId=${tmdbId}`
      : `https://api.videasy.net/${server}/sources-with-title?title=${encTitle}&mediaType=tv&year=${year}&tmdbId=${tmdbId}&episodeId=${episode}&seasonId=${season}`;

    const res = await fetch(url, { headers, cf: { cacheTtl: 3600 } });
    if (!res.ok) return null;

    const encryptedText = await res.text();
    if (!encryptedText) return null;

    // Send encrypted text to dec-videasy endpoint
    const decRes = await fetch('https://enc-dec.app/api/dec-videasy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: encryptedText,
        id: Number(tmdbId)
      })
    });
    if (!decRes.ok) return null;

    const decData = await decRes.json();
    if (decData && decData.result) {
      const result = decData.result;
      const options = [];
      const captions = [];

      if (Array.isArray(result.sources)) {
        result.sources.forEach(src => {
          options.push({
            url: src.url,
            quality: src.quality || 'Auto',
            format: src.url.includes('.m3u8') ? 'm3u8' : 'mp4',
            server: `Videasy [${server.toUpperCase()}]`,
            headers
          });
        });
      }

      if (Array.isArray(result.subtitles)) {
        result.subtitles.forEach(sub => {
          captions.push({
            url: sub.url,
            language: sub.language || 'English',
            languageCode: sub.languageCode || 'en'
          });
        });
      }

      return { options, captions };
    }
  } catch (err) {
    // Ignore server failures
  }
  return null;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  const title = url.searchParams.get('title') || '';
  const year = url.searchParams.get('year') || '';
  const season = url.searchParams.get('season') || '';
  const episode = url.searchParams.get('episode') || '';

  if (!id || !type) {
    return new Response(JSON.stringify({ error: 'Missing required query parameters: id, type' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      }
    });
  }

  // Scrape concurrently
  const [playsrcData, vidflixData] = await Promise.all([
    scrapePlaysrc(type, id, season, episode),
    scrapeVidflix(type, id, season, episode)
  ]);

  // Scrape Videasy servers in parallel
  const videasyPromises = VIDEASY_SERVERS.map(server =>
    scrapeVideasyForServer(server, type, id, title, year, season, episode)
  );
  const videasyResults = await Promise.all(videasyPromises);

  const allOptions = [...playsrcData.options, ...vidflixData.options];
  const allCaptions = [...playsrcData.captions, ...vidflixData.captions];

  videasyResults.forEach(res => {
    if (res) {
      allOptions.push(...res.options);
      allCaptions.push(...res.captions);
    }
  });

  // Deduplicate options by streaming URL
  const seenUrls = new Set();
  const options = allOptions.filter(opt => {
    if (seenUrls.has(opt.url)) return false;
    seenUrls.add(opt.url);
    return true;
  });

  // Deduplicate subtitles by URL
  const seenSubs = new Set();
  const captions = allCaptions.filter(sub => {
    if (seenSubs.has(sub.url)) return false;
    seenSubs.add(sub.url);
    return true;
  });

  if (options.length === 0) {
    return new Response(JSON.stringify({ error: 'No streamable direct links found for this item.' }), {
      status: 404,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      }
    });
  }

  const defaultStream = options[0];

  return new Response(JSON.stringify({
    stream: defaultStream,
    options: options,
    captions: captions
  }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
