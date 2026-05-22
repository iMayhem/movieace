import { MovieboxSession, search, getMovieStreamUrl, getEpisodeStreamUrl } from 'moviebox-js-sdk';

const PROXY = 'https://proxy.moovie.fun/';

const session = new MovieboxSession({
  host: 'h5.aoneroom.com',
  mirrorHosts: ['h5.aoneroom.com', 'movieboxapp.in'],
  fetch: (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set('referer', 'https://h5.aoneroom.com');
    // Proxy all backend API calls through the trusted VPS proxy to bypass Cloudflare IP geo-blocking
    const proxiedUrl = `${PROXY}${url.toString()}`;
    return fetch(proxiedUrl, { ...init, headers });
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const url = new URL(request.url);
  const title = url.searchParams.get('title') || '';
  const type = url.searchParams.get('type') || '';
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');
  const year = url.searchParams.get('year');

  if (!title || !type) {
    return new Response(JSON.stringify({ error: 'Missing required parameters: title and type' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  if (type !== 'movie' && type !== 'tv') {
    return new Response(JSON.stringify({ error: 'Invalid type. Must be "movie" or "tv"' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const searchFilter = type === 'movie' ? 'movie' : 'tv';

    const searchResults = await search(session, {
      query: title,
      type: searchFilter,
      page: 1,
      perPage: 10
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      return new Response(JSON.stringify({ error: `No results found for "${title}"` }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Best match: prefer year match for movies, fallback to first result
    let matched = searchResults.results[0];
    if (type === 'movie' && year) {
      const yearMatch = searchResults.results.find(r => r.releaseYear === Number(year));
      if (yearMatch) matched = yearMatch;
    }

    const detailPath = matched.raw?.detailPath || matched.pageUrl;
    if (!detailPath) {
      return new Response(JSON.stringify({ error: 'No detail path found for matched title' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    let streamResult;
    if (type === 'movie') {
      streamResult = await getMovieStreamUrl(session, { detailPath, quality: 'best' });
    } else {
      streamResult = await getEpisodeStreamUrl(session, {
        detailPath,
        season: season ? Number(season) : 1,
        episode: episode ? Number(episode) : 1,
        quality: 'best'
      });
    }

    if (!streamResult || !streamResult.stream?.url) {
      return new Response(JSON.stringify({ error: 'No streaming resource found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const rawStreamUrl = streamResult.stream.url;
    const proxiedStreamUrl = `${PROXY}${rawStreamUrl}`;

    const subtitles = (streamResult.captions || []).map(c => ({
      label: c.language || 'English',
      src: c.url,
      lang: c.languageCode || 'en'
    }));

    const options = (streamResult.options || []).map(opt => ({
      label: `${opt.quality || opt.resolution}p`,
      url: `${PROXY}${opt.url}`
    }));

    return new Response(JSON.stringify({ streamUrl: proxiedStreamUrl, subtitles, options }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Moovie function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error while resolving stream',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
