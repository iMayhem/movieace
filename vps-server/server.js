/**
 * ============================================================================
 * MovieAce VPS Resolver — High-Performance Metadata & Stream Resolution API
 * ============================================================================
 * 
 * Architecture:
 *   Vue Frontend → Node.js Resolver (this server) → Moviebox H5 API
 *                                                  ↓
 *                                    Nginx Proxy → CDN Streams
 * 
 * This server handles:
 *   1. Guest session cookie management (auto-refresh)
 *   2. Search & metadata resolution from Moviebox API
 *   3. Stream URL extraction & rewriting to route through Nginx
 *   4. Subtitle fetching & SRT → WebVTT conversion
 *   5. In-memory caching for blazing-fast responses
 * 
 * Port: 8080 (internal, proxied by Nginx on port 80/443)
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const NGINX_PROXY_BASE = process.env.NGINX_PROXY_BASE || 'http://161.118.191.46';

// ============================================================================
// Cache Configuration
// ============================================================================
const guestCookieCache = new NodeCache({ stdTTL: 3600 }); // 1 hour
const searchCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes
const streamCache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// ============================================================================
// Middleware
// ============================================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Moviebox API Client Configuration
// ============================================================================
const MOVIEBOX_API_BASE = 'https://h5.aoneroom.com';
const MOVIEBOX_BFF_BASE = 'https://h5.aoneroom.com/wefeed-h5-bff';

const movieboxClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'moviebox-js-sdk/preview',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.5',
    'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
    'Content-Type': 'application/json'
  }
});

// ============================================================================
// Guest Cookie Manager
// ============================================================================
async function getGuestCookie() {
  const cached = guestCookieCache.get('guest_cookie');
  if (cached) {
    console.log('[COOKIE] Using cached guest session');
    return cached;
  }

  try {
    console.log('[COOKIE] Fetching new guest session...');
    const response = await movieboxClient.get(
      `${MOVIEBOX_API_BASE}/wefeed-h5-bff/app/get-latest-app-pkgs`,
      {
        params: { app_name: 'moviebox' }
      }
    );

    const cookies = response.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      throw new Error('No cookies received from Moviebox API');
    }

    // Extract session cookie
    const sessionCookie = cookies
      .map(c => c.split(';')[0])
      .join('; ');

    guestCookieCache.set('guest_cookie', sessionCookie);
    console.log('[COOKIE] New guest session established');
    return sessionCookie;
  } catch (error) {
    console.error('[COOKIE_ERROR]', error.message);
    throw new Error('Failed to establish guest session with Moviebox API');
  }
}

// ============================================================================
// Search Endpoint
// ============================================================================
app.get('/vps-proxy/search', async (req, res) => {
  try {
    const { q, type = 'movie' } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const cacheKey = `search:${type}:${q}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log('[SEARCH] Cache hit');
      return res.json(cached);
    }

    const cookie = await getGuestCookie();
    
    // Map type to subjectType code (0=all, 1=movie, 2=tv, 6=music)
    const subjectTypeMap = {
      'all': 0,
      'movie': 1,
      'tv': 2,
      'music': 6
    };
    
    console.log(`[SEARCH] Querying Moviebox API: "${q}" (${type})`);
    const response = await movieboxClient.post(
      `${MOVIEBOX_BFF_BASE}/web/subject/search`,
      {
        keyword: q,
        page: 1,
        perPage: 24,
        subjectType: subjectTypeMap[type] || 0
      },
      {
        headers: {
          'Cookie': cookie
        }
      }
    );

    // Unwrap envelope: response.data should have {code: 0, message: 'ok', data: {...}}
    const envelope = response.data || {};
    if (envelope.code !== 0 || envelope.message !== 'ok') {
      throw new Error(`API returned error: ${envelope.message || 'Unknown error'}`);
    }

    const data = envelope.data || {};
    const items = data.items || [];

    // Format results
    const results = items.map(item => {
      const releaseYear = item.releaseDate ? parseInt(item.releaseDate.slice(0, 4), 10) : null;
      const typeMap = { 1: 'movie', 2: 'tv', 6: 'music' };
      
      return {
        id: item.subjectId,
        title: item.title,
        year: releaseYear,
        posterPath: item.image?.url || item.cover?.url || null,
        backdropPath: item.cover?.url || null,
        category: typeMap[item.subjectType] || 'unknown',
        rating: parseFloat(item.imdbRatingValue) || null,
        description: item.description || '',
        genres: item.genre ? item.genre.split(',').map(g => g.trim()) : [],
        hasResource: Boolean(item.hasResource),
        raw: {
          detailPath: item.detailPath,
          subjectId: item.subjectId
        }
      };
    });

    const result = { 
      results, 
      total: data.pager?.totalCount || results.length,
      page: data.pager?.page || 1,
      hasMore: data.pager?.hasMore || false
    };
    
    searchCache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('[SEARCH_ERROR]', error.message);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// ============================================================================
// Stream Resolution Endpoint
// ============================================================================
app.get('/vps-proxy/resolve', async (req, res) => {
  try {
    const { detailPath, subjectId, type = 'movie', season = 0, episode = 0 } = req.query;

    if (!detailPath || !subjectId) {
      return res.status(400).json({
        error: 'Parameters "detailPath" and "subjectId" are required'
      });
    }

    const se = type === 'tv' ? parseInt(season) : 0;
    const ep = type === 'tv' ? parseInt(episode) : 0;

    const cacheKey = `stream:${subjectId}:${type}:${se}:${ep}`;
    const cached = streamCache.get(cacheKey);
    if (cached) {
      console.log('[RESOLVE] Cache hit');
      return res.json(cached);
    }

    const cookie = await getGuestCookie();

    console.log(`[RESOLVE] Fetching stream data for ${type} ID: ${subjectId} (S${se}E${ep})`);
    
    // Extract slug from detailPath for referer
    const pathParts = detailPath.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || detailPath;
    const refererUrl = `${MOVIEBOX_API_BASE}/movies/${slug}`;
    
    // Step 1: Get play/stream info
    const playResponse = await movieboxClient.get(
      `${MOVIEBOX_BFF_BASE}/web/subject/play`,
      {
        params: {
          subjectId: subjectId,
          se: se,
          ep: ep
        },
        headers: {
          'Cookie': cookie,
          'Referer': refererUrl
        }
      }
    );

    const playEnvelope = playResponse.data || {};
    if (playEnvelope.code !== 0) {
      throw new Error(`Play API error: ${playEnvelope.message || 'Unknown error'}`);
    }

    const playData = playEnvelope.data || {};
    
    // Step 2: Get download info (for captions)
    const downloadResponse = await movieboxClient.get(
      `${MOVIEBOX_BFF_BASE}/web/subject/download`,
      {
        params: {
          subjectId: subjectId,
          se: se,
          ep: ep
        },
        headers: {
          'Cookie': cookie,
          'Referer': refererUrl
        }
      }
    );

    const downloadEnvelope = downloadResponse.data || {};
    const downloadData = downloadEnvelope.code === 0 ? (downloadEnvelope.data || {}) : {};

    // Check if content has resources
    if (!playData.hasResource && !downloadData.hasResource) {
      return res.status(404).json({
        error: 'No streaming sources available',
        message: 'This content may not be available for streaming'
      });
    }

    // Step 3: Extract and normalize stream options
    const streams = playData.streams || [];
    
    if (streams.length === 0) {
      return res.status(404).json({
        error: 'No streams found',
        message: 'No streaming URLs available for this content'
      });
    }

    const streamOptions = streams
      .map(stream => {
        const resolution = parseInt(stream.resolutions) || 0;
        const sizeBytes = parseInt(stream.size) || 0;
        const durationSeconds = parseInt(stream.duration) || 0;
        
        // Rewrite URL to route through Nginx proxy
        const originalUrl = stream.url;
        const proxiedUrl = `${NGINX_PROXY_BASE}/proxy-media/${originalUrl}`;
        
        return {
          id: stream.id,
          quality: `${resolution}p`,
          resolution: resolution,
          format: stream.format || 'mp4',
          codec: stream.codecName || 'h264',
          size: sizeBytes,
          duration: durationSeconds,
          url: proxiedUrl,
          originalUrl: originalUrl
        };
      })
      .sort((a, b) => b.resolution - a.resolution); // Highest quality first

    // Step 4: Extract and normalize captions/subtitles
    const captions = (downloadData.captions || []).map(caption => ({
      language: caption.language || 'English',
      languageCode: caption.languageCode || 'en',
      url: `${NGINX_PROXY_BASE}/vps-proxy/subtitle?url=${encodeURIComponent(caption.url)}`
    }));

    const result = {
      stream: streamOptions[0], // Default to highest quality
      options: streamOptions,
      captions: captions,
      hasResource: Boolean(playData.hasResource || downloadData.hasResource),
      freeStreamsRemaining: playData.freeNum || null,
      isLimited: Boolean(playData.limited)
    };

    streamCache.set(cacheKey, result);
    res.json(result);

  } catch (error) {
    console.error('[RESOLVE_ERROR]', error.message);
    if (error.response) {
      console.error('[RESOLVE_ERROR] Response:', error.response.status, error.response.data);
    }
    res.status(500).json({
      error: 'Stream resolution failed',
      message: error.message
    });
  }
});

// ============================================================================
// Subtitle Proxy & Conversion (SRT → WebVTT)
// ============================================================================
app.get('/vps-proxy/subtitle', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" is required' });
    }

    console.log('[SUBTITLE] Fetching:', url);
    
    const response = await axios.get(url, {
      responseType: 'text',
      timeout: 10000
    });

    let content = response.data;

    // Convert SRT to WebVTT if needed
    if (!content.startsWith('WEBVTT')) {
      content = convertSRTtoWebVTT(content);
    }

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);

  } catch (error) {
    console.error('[SUBTITLE_ERROR]', error.message);
    res.status(500).json({
      error: 'Subtitle fetch failed',
      message: error.message
    });
  }
});

/**
 * Convert SRT subtitle format to WebVTT
 */
function convertSRTtoWebVTT(srt) {
  let vtt = 'WEBVTT\n\n';
  
  // Replace SRT timestamp format (00:00:00,000) with WebVTT format (00:00:00.000)
  vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  return vtt;
}

// ============================================================================
// Health Check
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cache: {
      guestCookie: guestCookieCache.keys().length > 0,
      searches: searchCache.keys().length,
      streams: streamCache.keys().length
    }
  });
});

// ============================================================================
// Error Handler
// ============================================================================
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// Start Server
// ============================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MovieAce VPS Resolver — High-Performance Streaming API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Status: ONLINE`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Nginx Proxy: ${NGINX_PROXY_BASE}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET  /health                    - Health check`);
  console.log(`    GET  /vps-proxy/search          - Search movies/TV`);
  console.log(`    GET  /vps-proxy/resolve         - Resolve stream URLs`);
  console.log(`    GET  /vps-proxy/subtitle        - Fetch & convert subtitles`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Received SIGINT, closing server...');
  process.exit(0);
});
