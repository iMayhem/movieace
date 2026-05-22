// Moviebox streams are resolved server-side via a Netlify function.
// This module is a thin browser-safe fetch wrapper — no Node.js SDK here.

export interface MovieboxStreamResponse {
  streamUrl: string | null;
  subtitles: { label: string; src: string; lang: string }[];
  options: { label: string; url: string }[];
}

export async function getMovieboxStream(params: {
  title: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  year?: number;
}): Promise<MovieboxStreamResponse | null> {
  const query = new URLSearchParams({ title: params.title, type: params.type });

  if (params.type === 'tv') {
    if (params.season !== undefined) query.append('season', String(params.season));
    if (params.episode !== undefined) query.append('episode', String(params.episode));
  }

  if (params.year !== undefined) {
    query.append('year', String(params.year));
  }

  const res = await fetch(`/.netlify/functions/moviebox?${query.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('Moviebox API error:', body);
    return null;
  }

  return res.json() as Promise<MovieboxStreamResponse>;
}
