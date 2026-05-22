import { MovieboxSession, search, getMovieStreamUrl, getEpisodeStreamUrl } from 'moviebox-js-sdk';

const session = new MovieboxSession({
  host: 'h5.aoneroom.com',
  mirrorHosts: ['h5.aoneroom.com', 'movieboxapp.in'],
  fetch: (url, init) => {
    const proxyUrl = 'https://proxy.moovie.fun/';
    const originalUrl = url.toString();
    const proxiedUrl = `${proxyUrl}${originalUrl}`;

    const headers = new Headers(init?.headers);
    const existingReferer = headers.get('referer') || headers.get('Referer');
    if (existingReferer && existingReferer.startsWith(proxyUrl)) {
      headers.set('referer', existingReferer.replace(proxyUrl, ''));
    } else if (!existingReferer) {
      headers.set('referer', 'https://h5.aoneroom.com');
    }

    return fetch(proxiedUrl, { ...init, headers });
  }
});

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const { title, type, season, episode, year } = params;

  if (!title || !type) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required parameters: title and type' })
    };
  }

  if (type !== 'movie' && type !== 'tv') {
    return {
      statusCode: 400,
      headers,
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
        headers,
        body: JSON.stringify({ error: `No results found for "${title}"` })
      };
    }

    let matched = searchResults.results[0];
    if (type === 'movie' && year) {
      const yearMatch = searchResults.results.find(r => r.releaseYear === Number(year));
      if (yearMatch) matched = yearMatch;
    }

    const detailPath = matched.raw?.detailPath || matched.pageUrl;
    if (!detailPath) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No detail path found for matched title' })
      };
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

    if (!streamResult) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No streaming resource found' })
      };
    }

    const subtitles = (streamResult.captions || []).map(c => ({
      label: c.language || 'English',
      src: c.url,
      lang: c.languageCode || 'en'
    }));

    const options = (streamResult.options || []).map(opt => ({
      label: `${opt.quality || opt.resolution}p`,
      url: opt.url
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        streamUrl: streamResult.stream?.url || null,
        subtitles,
        options
      })
    };
  } catch (error) {
    console.error('Moviebox function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error while resolving stream' })
    };
  }
};
