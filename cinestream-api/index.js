const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to double escape title for Videasy
function doubleEscapeTitle(title) {
  if (!title) return '';
  // Equivalent to Kotlin's quote(quote(title))
  return encodeURIComponent(encodeURIComponent(title));
}

// User-Agent constant matching Kotlin source
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ── 1. Playsrc Scraper Engine ────────────────────────────────
async function scrapePlaysrc(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://api.madplay.site/api/playsrc?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    console.log(`[Playsrc] Fetching url: ${url}`);
    const res = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 6000
    });

    const list = Array.isArray(res.data) ? res.data : [];
    const options = [];
    const captions = [];

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

    return { options, captions };
  } catch (err) {
    console.error(`[Playsrc Error] ${err.message}`);
    return { options: [], captions: [] };
  }
}

// ── 2. Vidflix Scraper Engine ────────────────────────────────
async function scrapeVidflix(type, tmdbId, season, episode) {
  try {
    const url = type === 'movie'
      ? `https://madplay.site/api/movies/holly?id=${tmdbId}&token=direct`
      : `https://madplay.site/api/movies/holly?id=${tmdbId}&season=${season}&episode=${episode}&token=direct`;

    console.log(`[Vidflix] Fetching url: ${url}`);
    const res = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 6000
    });

    const list = Array.isArray(res.data) ? res.data : [];
    const options = [];
    const captions = [];

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

    return { options, captions };
  } catch (err) {
    console.error(`[Vidflix Error] ${err.message}`);
    return { options: [], captions: [] };
  }
}

// ── 3. Videasy Scraper Engine ────────────────────────────────
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

    console.log(`[Videasy - ${server}] Fetching url`);
    const res = await axios.get(url, { headers, timeout: 5000 });

    if (!res.data) return null;

    // Send encrypted text to multiDecrypt API
    const decRes = await axios.post('https://enc-dec.app/api/dec-videasy', {
      text: res.data,
      id: Number(tmdbId)
    }, { timeout: 5000 });

    if (decRes.data && decRes.data.result) {
      const result = decRes.data.result;
      const options = [];
      const captions = [];

      if (Array.isArray(result.sources)) {
        result.sources.forEach(src => {
          const proxiedUrl = `http://localhost:3000/api/cinestream/proxy?url=${encodeURIComponent(src.url)}`;
          options.push({
            url: proxiedUrl,
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
            url: `http://localhost:3000/api/cinestream/proxy?url=${encodeURIComponent(sub.url)}`,
            language: sub.language || 'English',
            languageCode: sub.languageCode || 'en'
          });
        });
      }

      return { options, captions };
    }
  } catch (err) {
    console.error(`[Videasy Error - ${server}]`, err.message);
  }
  return null;
}

async function scrapeVideasy(type, tmdbId, title, year, season, episode) {
  const options = [];
  const captions = [];

  // Scrape servers in parallel with standard limits
  const promises = VIDEASY_SERVERS.map(server => 
    scrapeVideasyForServer(server, type, tmdbId, title, year, season, episode)
  );

  const results = await Promise.all(promises);
  results.forEach(res => {
    if (res) {
      options.push(...res.options);
      captions.push(...res.captions);
    }
  });

  return { options, captions };
}

// ── Main Unified Resolution Route ─────────────────────────────
app.get('/api/cinestream/resolve', async (req, res) => {
  let { type, id, title, year, season, episode } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: 'Missing required query parameters: id, type' });
  }

  // Handle anime dynamic mapping to tv type on TMDB
  if (type === 'anime') {
    try {
      const searchRes = await axios.get(`https://api.themoviedb.org/3/search/tv`, {
        params: {
          api_key: 'dfa4c2c7c1de1005adee824dc5593672',
          query: title
        },
        timeout: 4000
      });
      if (searchRes.data && searchRes.data.results && searchRes.data.results.length > 0) {
        // Prefer animation genre (16) to avoid live-action adaptations
        let mappedResult = searchRes.data.results.find(r => r.genre_ids && r.genre_ids.includes(16));
        if (!mappedResult) {
          mappedResult = searchRes.data.results[0];
        }
        id = String(mappedResult.id);
        type = 'tv';
        season = '1';
        console.log(`[CineStream Anime Mapping] Mapped title "${title}" to TMDB TV ID: ${id}`);
      } else {
        console.log(`[CineStream Anime Mapping] No TMDB results found for title "${title}"`);
      }
    } catch (err) {
      console.error(`[CineStream Anime Mapping Error] ${err.message}`);
    }
  }

  console.log(`[CineStream] Starting resolution for type=${type}, id=${id}, title=${title}, year=${year}, season=${season}, episode=${episode}`);

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

  // Priority 1: Try quick providers with Promise.allSettled (better than race)
  const quickProviders = await Promise.allSettled([
    scrapePlaysrc(type, id, season, episode),
    scrapeVidflix(type, id, season, episode)
  ]);

  // Collect ALL successful results from quick providers
  const quickOptions = [];
  const quickCaptions = [];
  
  quickProviders.forEach(result => {
    if (result.status === 'fulfilled' && result.value && result.value.options) {
      quickOptions.push(...result.value.options);
      quickCaptions.push(...result.value.captions);
    }
  });
  
  if (quickOptions.length > 0 && !firstStreamReturned) {
    // Return immediately with first available stream
    firstStreamReturned = true;
    const { options, captions } = buildResponse(quickOptions, quickCaptions);
    
    console.log(`[CineStream] Quick response with ${options.length} options`);
    
    // Continue fetching remaining providers in background (don't await)
    (async () => {
      // Try Videasy servers in background for more options
      const videasyPromises = VIDEASY_SERVERS.slice(0, 5).map(server =>
        scrapeVideasyForServer(server, type, id, title, year, season, episode)
          .then(res => res || null)
          .catch(() => null)
      );

      const videasyResults = await Promise.allSettled(videasyPromises);
      const successCount = videasyResults.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`[CineStream] Background fetch completed with ${successCount} Videasy servers`);
    })();

      // Priority 1: Race Videasy servers, return first 3 successful responses
      const videasyPromises = VIDEASY_SERVERS.map(server =>
        scrapeVideasyForServer(server, type, id, title, year, season, episode)
          .then(res => res || null)
          .catch(() => null)
      );

      const videasyResults = [];
      for (const promise of videasyPromises) {
        try {
          const result = await Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))]);
          if (result) {
            videasyResults.push(result);
            if (videasyResults.length >= 3) break;
          }
        } catch (e) {
          // Continue to next server
        }
      }
      console.log(`[CineStream] Background fetch completed with ${videasyResults.length} Videasy servers`);
    })();

    return res.json({
      stream: options[0],
      options: options,
      captions: captions
    });
  }

  // Fallback: If quick providers failed, try Videasy servers immediately
  console.log('[CineStream] Quick providers failed, trying Videasy servers...');
  
  // Try first 5 Videasy servers in parallel (faster than all 14)
  const videasyPromises = VIDEASY_SERVERS.slice(0, 5).map(server =>
    scrapeVideasyForServer(server, type, id, title, year, season, episode)
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
    console.error('[CineStream] All providers failed - Playsrc, Vidflix, and first 5 Videasy servers');
    return res.status(503).json({ 
      error: 'No streamable direct links found for this item. All providers are currently unavailable. Please try again in a moment.' 
    });
  }

  // Set the first source as default stream
  const defaultStream = options[0];

  res.json({
    stream: defaultStream,
    options: options,
    captions: captions
  });
});

app.get('/api/cinestream/subtitle', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');
  try {
    const subRes = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 6000
    });
    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(subRes.data);
  } catch (err) {
    console.error(`[Subtitle Proxy Error] ${err.message}`);
    res.status(500).send('Failed to fetch subtitle');
  }
});

app.get('/api/cinestream/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url parameter');
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      'Origin': 'https://www.cineby.sc',
      'Referer': 'https://www.cineby.sc/'
    };
    const proxyRes = await axios.get(url, {
      headers,
      responseType: 'arraybuffer',
      timeout: 15000
    });

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (url.includes('.m3u8')) {
      const text = proxyRes.data.toString('utf-8');
      const lines = text.split('\n');
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          try {
            const absoluteUrl = new URL(trimmed, url).href;
            return `http://localhost:3000/api/cinestream/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          } catch(e) {
            return line;
          }
        }
        return line;
      }).join('\n');
      res.setHeader('Content-Type', 'application/x-mpegURL');
      res.send(rewritten);
    } else {
      res.setHeader('Content-Type', proxyRes.headers['content-type']);
      res.send(proxyRes.data);
    }
  } catch (err) {
    console.error(`[Proxy Error] ${err.message}`);
    res.status(500).send('Proxy error');
  }
});

app.listen(PORT, () => {
  console.log(`CineStream Microservice running on port ${PORT}`);
});
