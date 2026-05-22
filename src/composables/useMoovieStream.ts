import { ref } from 'vue';
import { getMoovieStream, type MoovieStreamResponse } from '../lib/moovie';

export interface MoovieStreamParams {
  title: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  year?: number;
}

const isLoading = ref(false);
const error = ref<string | null>(null);
const streamData = ref<MoovieStreamResponse | null>(null);

export function useMoovieStream() {
  async function fetchMoovieStream(params: MoovieStreamParams): Promise<MoovieStreamResponse | null> {
    isLoading.value = true;
    error.value = null;
    streamData.value = null;

    try {
      const result = await getMoovieStream(params);

      if (!result || !result.streamUrl) {
        error.value = 'No stream found for this title';
        return null;
      }

      streamData.value = result;
      return result;
    } catch (err) {
      console.error('Error fetching Moovie stream:', err);
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
    fetchMoovieStream,
    clearStream
  };
}
