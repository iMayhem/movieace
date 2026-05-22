import { ref } from 'vue';
import { getMovieboxStream, type MovieboxStreamResponse } from '@/lib/moviebox';

export interface MovieboxStreamParams {
  title: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  year?: number;
}

const isLoading = ref(false);
const error = ref<string | null>(null);
const streamData = ref<MovieboxStreamResponse | null>(null);

export function useMovieboxStream() {
  async function fetchMovieboxStream(params: MovieboxStreamParams): Promise<MovieboxStreamResponse | null> {
    isLoading.value = true;
    error.value = null;
    streamData.value = null;

    try {
      const result = await getMovieboxStream(params);
      
      if (!result || !result.streamUrl) {
        error.value = 'No stream found for this title';
        return null;
      }

      streamData.value = result;
      return result;
    } catch (err) {
      console.error('Error fetching Moviebox stream:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch stream';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function clearStream() {
    streamData.value = null;
    error.value = null;
  }

  return {
    isLoading,
    error,
    streamData,
    fetchMovieboxStream,
    clearStream
  };
}
