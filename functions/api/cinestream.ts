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

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      cf: { cacheTtl: 3600 }
    });
    
    clearTimeout(timeoutId);
    
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
    // Log error for debugging (will be visible in Cloudflare logs)
    console.error('[Playsrc Error]', err.message);
    return { options: [], captions: [] };
  }
}

// Vidflix Resolver
async function scrapeVidflix(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://madplay.site/api/movies/holly?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      cf: { cacheTtl: 3600 }
    });
    
    clearTimeout(timeoutId);
    
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
    console.error('[Vidflix Error]', err.message);
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

    // Add timeout for Videasy API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

    const res = await fetch(url, { 
      headers, 
      signal: controller.signal,
      cf: { cacheTtl: 3600 } 
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;

    const encryptedText = await res.text();
    if (!encryptedText) return null;

    // Send encrypted text to dec-videasy endpoint with timeout
    const decController = new AbortController();
    const decTimeoutId = setTimeout(() => decController.abort(), 5000); // 5 second timeout for decryption
    
    const decRes = await fetch('https://enc-dec.app/api/dec-videasy', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: decController.signal,
      body: JSON.stringify({
        text: encryptedText,
        id: Number(tmdbId)
      })
    });
    
    clearTimeout(decTimeoutId);
    
    if (!decRes.ok) return null;

    const decData = await decRes.json();
    if (decData && decData.result) {
      const result = decData.result;
      const options = [];
      const captions = [];

      if (Array.isArray(result.sources)) {
        result.sources.forEach(src => {
          options.push({
            url: `/api/cinestream?proxyUrl=${encodeURIComponent(src.url)}`,
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
            url: `/api/cinestream?proxyUrl=${encodeURIComponent(sub.url)}`,
            language: sub.language || 'English',
            languageCode: sub.languageCode || 'en'
          });
        });
      }

      return { options, captions };
    }
  } catch (err) {
    // Silently fail for individual Videasy servers
    console.error(`[Videasy ${server} Error]`, err.message);
  }
  return null;
}
          });
        });
      }

      if (Array.isArray(result.subtitles)) {
        result.subtitles.forEach(sub => {
          captions.push({
            url: `/api/cinestream?proxyUrl=${encodeURIComponent(sub.url)}`,
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

  // Unified HLS Playlist and Subtitle Proxy Tunneling
  const proxyUrl = url.searchParams.get('proxyUrl');
  if (proxyUrl) {
    try {
      const headers = {
        'User-Agent': USER_AGENT,
        'Origin': 'https://www.cineby.sc',
        'Referer': 'https://www.cineby.sc/'
      };
      const proxyRes = await fetch(proxyUrl, { headers });
      if (!proxyRes.ok) return new Response('Proxy offline', { status: proxyRes.status });

      const contentType = proxyRes.headers.get('content-type') || '';
      
      // If VTT subtitle
      if (proxyUrl.includes('.vtt') || contentType.includes('text/vtt') || proxyUrl.includes('type=vtt')) {
        const text = await proxyRes.text();
        return new Response(text, {
          headers: {
            'content-type': 'text/vtt',
            'access-control-allow-origin': '*',
            'cache-control': 'public, max-age=86400'
          }
        });
      }

      // If HLS Playlist
      if (proxyUrl.includes('.m3u8') || contentType.includes('application/x-mpegURL') || contentType.includes('application/vnd.apple.mpegurl')) {
        const text = await proxyRes.text();
        const lines = text.split('\n');
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const absoluteUrl = new URL(trimmed, proxyUrl).href;
              return `/api/cinestream?proxyUrl=${encodeURIComponent(absoluteUrl)}`;
            } catch(e) {
              return line;
            }
          }
          return line;
        });
        
        return new Response(rewrittenLines.join('\n'), {
          headers: {
            'content-type': 'application/vnd.apple.mpegurl',
            'access-control-allow-origin': '*'
          }
        });
      }

      // Any other binary resource (e.g., .ts chunk or variant playlist)
      return new Response(proxyRes.body, {
        headers: {
          'content-type': contentType,
          'access-control-allow-origin': '*',
          'access-control-expose-headers': '*'
        }
      });
    } catch (err) {
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
        'access-control-allow-origin': '*'
      }
    });
  }

  // Dynamic TMDB mapping for Anime requests
  if (type === 'anime') {
    try {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=dfa4c2c7c1de1005adee824dc5593672&query=${encodeURIComponent(title)}`, {
        cf: { cacheTtl: 86400 }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData.results && searchData.results.length > 0) {
          // Prefer animation genre (16) to avoid live-action adaptations
          let mappedResult = searchData.results.find(r => r.genre_ids && r.genre_ids.includes(16));
          if (!mappedResult) {
            mappedResult = searchData.results[0];
          }
          id = String(mappedResult.id);
          type = 'tv';
          season = '1';
        }
      }
    } catch (err) {
      // Ignore fallback
    }
  }

  // Priority 4: Progressive Loading - Return first available stream immediately
  const allOptions = [];
  const allCaptions = [];
  let firstStreamReturned = false;

  // Helper to deduplicate and format response
  const buildResponse = (opts, caps) => {
    const seenUrls = new Set();
    const options = opts.filter(opt => {
      if (seenUrls.has(opt.url)) return false;
      seenUrls.add(opt.url);
      return true;
    });

    const seenSubs = new Set();
    const captions = caps.filter(sub => {
      if (seenSubs.has(sub.url)) return false;
      seenSubs.add(sub.url);
      return true;
    });

    return { options, captions };
  };

  // Priority 1: Try quick providers with Promise.allSettled (not race) for better reliability
  const quickProviders = await Promise.allSettled([
    scrapePlaysrc(type, id, season, episode),
    scrapeVidflix(type, id, season, episode)
  ]);

  // Collect results from successful quick providers
  const quickOptions = [];
  const quickCaptions = [];
  
  quickProviders.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      quickOptions.push(...result.value.options);
      quickCaptions.push(...result.value.captions);
    }
  });
  
  // If we got quick results, return immediately
  if (quickOptions.length > 0 && !firstStreamReturned) {
    firstStreamReturned = true;
    const { options, captions } = buildResponse(quickOptions, quickCaptions);
    
    console.log(`[CineStream] Quick response with ${options.length} options from fast providers`);
    
    // Start background fetching for Videasy servers (don't await)
    context.waitUntil((async () => {
      try {
        // Race Videasy servers with 3-second timeout per server
        const videasyPromises = VIDEASY_SERVERS.map(server =>
          Promise.race([
            scrapeVideasyForServer(server, type, id, title, year, season, episode),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
          ])
            .then(res => res || null)
            .catch(() => null)
        );

        const videasyResults = [];
        for (const promise of videasyPromises) {
          try {
            const result = await promise;
            if (result) {
              videasyResults.push(result);
              if (videasyResults.length >= 3) break; // Stop after 3 successful servers
            }
          } catch (e) {
            // Continue to next server
          }
        }
        console.log(`[CineStream] Background fetch completed with ${videasyResults.length} Videasy servers`);
      } catch (e) {
        console.error('[CineStream Background Error]', e);
      }
    })());

    return new Response(JSON.stringify({
      stream: options[0],
      options: options,
      captions: captions
    }), {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=1800' // Cache for 30 minutes
      }
    });
  }

  // Fallback: If quick providers failed, try Videasy servers
  console.log('[CineStream] Quick providers failed, trying Videasy servers...');
  
  // Try first 5 Videasy servers in parallel with timeout
  const videasyPromises = VIDEASY_SERVERS.slice(0, 5).map(server =>
    Promise.race([
      scrapeVideasyForServer(server, type, id, title, year, season, episode),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000))
    ])
      .then(res => res || null)
      .catch(() => null)
  );

  const videasyResults = await Promise.allSettled(videasyPromises);
  
  videasyResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      allOptions.push(...result.value.options);
      allCaptions.push(...result.value.captions);
    }
  });

  const { options, captions } = buildResponse(allOptions, allCaptions);

  if (options.length === 0) {
    console.error('[CineStream] All providers failed');
    return new Response(JSON.stringify({ 
      error: 'No streamable direct links found for this item. All providers are currently unavailable. Please try again in a moment.' 
    }), {
      status: 503, // Service Unavailable (temporary)
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'retry-after': '5' // Suggest retry after 5 seconds
      }
    });
  }

  const defaultStream = options[0];

  console.log(`[CineStream] Fallback response with ${options.length} options from Videasy`);

  return new Response(JSON.stringify({
    stream: defaultStream,
    options: options,
    captions: captions
  }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=1800' // Cache for 30 minutes
    }
  });
}


  }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=1800' // Cache for 30 minutes
    }
  });
}
