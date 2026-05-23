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
  const { type, id, title, year, season, episode } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: 'Missing required query parameters: id, type' });
  }

  console.log(`[CineStream] Starting resolution for type=${type}, id=${id}, title=${title}, year=${year}`);

  // Fetch results concurrently across all available engines
  const [playsrcData, vidflixData, videasyData] = await Promise.all([
    scrapePlaysrc(type, id, season, episode),
    scrapeVidflix(type, id, season, episode),
    scrapeVideasy(type, id, title, year, season, episode)
  ]);

  const allOptions = [...playsrcData.options, ...vidflixData.options, ...videasyData.options];
  const allCaptions = [...playsrcData.captions, ...vidflixData.captions, ...videasyData.captions];

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
    return res.status(404).json({ error: 'No streamable direct links found for this item.' });
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
