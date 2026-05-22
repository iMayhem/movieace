import { MovieboxSession, search, getMovieStreamUrl, getEpisodeStreamUrl } from 'moviebox-js-sdk';

const PROXY = 'https://proxy.moovie.fun/';

const session = new MovieboxSession({
  host: 'h5.aoneroom.com',
  mirrorHosts: ['h5.aoneroom.com', 'movieboxapp.in'],
  fetch: (url, init) => {
    const originalUrl = url.toString();
    const proxiedUrl = `${PROXY}${originalUrl}`;

    const headers = new Headers(init?.headers);
    const existingReferer = headers.get('referer') || headers.get('Referer');
    if (existingReferer && existingReferer.startsWith(PROXY)) {
      // Strip proxy prefix to preserve the real aoneroom.com referer
      headers.set('referer', existingReferer.replace(PROXY, ''));
    } else if (!existingReferer) {
      headers.set('referer', 'https://h5.aoneroom.com');
    }

    return fetch(proxiedUrl, { ...init, headers });
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders
    };
  }

  const { title, type, season, episode, year } = event.queryStringParameters || {};

  if (!title || !type) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required parameters: title and type' })
    };
  }

  if (type !== 'movie' && type !== 'tv') {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid type. Must be "movie" or "tv"' })
    };
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
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: `No results found for "${title}"` })
      };
    }

    // Best match: prefer year match for movies, fallback to first result
    let matched = searchResults.results[0];
    if (type === 'movie' && year) {
      const yearMatch = searchResults.results.find(r => r.releaseYear === Number(year));
      if (yearMatch) matched = yearMatch;
    }

    const detailPath = matched.raw?.detailPath || matched.pageUrl;
    if (!detailPath) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No detail path found for matched title' })
      };
    }

    console.log(`Moovie: matched "${matched.title}" → ${detailPath}`);

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
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No streaming resource found' })
      };
    }

    // The raw CDN stream URL requires the proxy to play in the browser.
    // Wrap it so the browser fetches it through proxy.moovie.fun.
    const rawStreamUrl = streamResult.stream.url;
    const proxiedStreamUrl = `${PROXY}${rawStreamUrl}`;

    const subtitles = (streamResult.captions || []).map(c => ({
      label: c.language || 'English',
      src: c.url,
      lang: c.languageCode || 'en'
    }));

    // Also proxy quality options
    const options = (streamResult.options || []).map(opt => ({
      label: `${opt.quality || opt.resolution}p`,
      url: `${PROXY}${opt.url}`
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ streamUrl: proxiedStreamUrl, subtitles, options })
    };

  } catch (error) {
    console.error('Moovie function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error while resolving stream' })
    };
  }
};
