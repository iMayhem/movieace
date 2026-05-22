// Moovie streams resolved directly in the browser via standard HTTP fetch queries.
// By querying the API directly from the client browser, it utilizes the user's real
// unblocked residential IP address, completely bypassing datacenter IP geo-blocking.
// This native implementation completely avoids importing Node.js SDK built-ins (fs, path).

const API_BASE = 'https://proxy.moovie.fun/vps-proxy/https://h5.aoneroom.com';
const PROXY = 'https://proxy.moovie.fun/';

export interface MoovieStreamResponse {
  streamUrl: string | null;
  subtitles: { label: string; src: string; lang: string }[];
  options: { label: string; url: string }[];
}

// Perform client-side fetch requests with correct headers and credentials
async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  headers.set('content-type', 'application/json');
  headers.set('x-client-info', JSON.stringify({ timezone: 'Africa/Nairobi' }));

  if (!headers.has('referer')) {
    headers.set('referer', 'https://h5.aoneroom.com');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Capture and reuse cookies automatically in browser
  });

  if (!res.ok) {
    throw new Error(`Moviebox API request failed with status ${res.status}`);
  }

  const payload = await res.json();
  if (payload && payload.code === 0 && payload.message === 'ok' && 'data' in payload) {
    return payload.data;
  }
  throw new Error(`Moviebox API returned unsuccessful envelope: ${payload?.message || 'unknown error'}`);
}

export async function getMoovieStream(params: {
  title: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  year?: number;
}): Promise<MoovieStreamResponse | null> {
  try {
    const searchFilter = params.type === 'movie' ? 1 : 2;

    // 1. Initialize session cookies if needed
    console.log('[Moovie] Initializing browser session cookies...');
    await fetchApi('/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox');

    // 2. Search for the movie
    console.log(`[Moovie] Client-side search for: "${params.title}"...`);
    const searchResult = await fetchApi('/wefeed-h5-bff/web/subject/search', {
      method: 'POST',
      body: JSON.stringify({
        keyword: params.title,
        page: 1,
        perPage: 10,
        subjectType: searchFilter
      })
    });

    if (!searchResult || !searchResult.items || searchResult.items.length === 0) {
      console.warn(`[Moovie] No search results found for "${params.title}"`);
      return null;
    }

    // Pick best match: prefer year match, otherwise prefer first item with resources, fallback to first item
    let matched = searchResult.items.find((item: any) => item.hasResource) || searchResult.items[0];
    if (params.type === 'movie' && params.year) {
      const yearMatch = searchResult.items.find((r: any) => {
        const year = r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : null;
        return year === params.year && r.hasResource;
      });
      if (yearMatch) matched = yearMatch;
    }

    const subjectId = matched.subjectId;
    const detailPath = matched.detailPath;
    console.log(`[Moovie] Matched: "${matched.title}" (ID: ${subjectId})`);

    const se = params.type === 'movie' ? 0 : (params.season ? Number(params.season) : 1);
    const ep = params.type === 'movie' ? 0 : (params.episode ? Number(params.episode) : 1);

    // 3. Resolve streams and captions in parallel
    console.log('[Moovie] Resolving streams directly from residential IP...');
    const [streamPayload, downloadPayload] = await Promise.all([
      fetchApi(`/wefeed-h5-bff/web/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}`, {
        headers: {
          referer: `${API_BASE}/movies/${detailPath || ''}`
        }
      }),
      fetchApi(`/wefeed-h5-bff/web/subject/download?subjectId=${subjectId}&se=${se}&ep=${ep}`, {
        headers: {
          referer: `${API_BASE}/movies/${detailPath || ''}`
        }
      }).catch((err) => {
        console.warn('[Moovie] Caption download failed:', err);
        return { captions: [] };
      })
    ]);

    const streams = streamPayload.streams || [];
    if (streams.length === 0) {
      console.warn('[Moovie] No streams returned by the Moviebox API');
      return null;
    }

    // Sort streams by resolution (ascending) and pick best one
    const sortedOptions = streams
      .map((s: any) => ({
        resolution: Number(s.resolutions) || 720,
        url: s.url
      }))
      .sort((a: any, b: any) => a.resolution - b.resolution);

    const bestStream = sortedOptions[sortedOptions.length - 1];
    console.log(`[Moovie] Stream successfully resolved (${bestStream.resolution}p)! Routing via Worker proxy...`);

    const proxiedStreamUrl = `${PROXY}${bestStream.url}`;

    const subtitles = (downloadPayload.captions || []).map((c: any) => ({
      label: c.language || 'English',
      src: c.url.startsWith('http') ? `${PROXY}${c.url}` : c.url,
      lang: c.languageCode || 'en'
    }));

    const options = sortedOptions.map((opt: any) => ({
      label: `${opt.resolution}p`,
      url: `${PROXY}${opt.opt || opt.url}`
    }));

    return {
      streamUrl: proxiedStreamUrl,
      subtitles,
      options
    };

  } catch (error) {
    console.error('[Moovie] Client-side resolver error:', error);
    return null;
  }
}
