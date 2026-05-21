import { useStorage } from '@vueuse/core';
import { watch } from 'vue';
import { getCurrentUser, pushUserDataToSupabase } from '../lib/auth';

export interface WatchlistItem {
  id: number | string;
  title: string;
  image: string | null;
  rating: number;
  categories: number[];
  adult: boolean;
  type: 'movie' | 'tv';
  addedAt?: number;
  watched?: boolean;
  watchedAt?: number;
}

const WATCHLIST_KEY = 'watchlist';

export const watchlist = useStorage<WatchlistItem[]>(WATCHLIST_KEY, []);

// Auto-sync state with Supabase when user is logged in
if (typeof window !== 'undefined') {
  watch(
    watchlist,
    (newVal) => {
      const user = getCurrentUser();
      if (user) {
        pushUserDataToSupabase(user, newVal);
      }
    },
    { deep: true }
  );

  const handleAuthOrDataChange = () => {
    const raw = localStorage.getItem(WATCHLIST_KEY) || '[]';
    try {
      watchlist.value = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  };

  window.addEventListener('movora_auth_change', handleAuthOrDataChange);
  window.addEventListener('movora_userdata_change', handleAuthOrDataChange);
}

export function isInWatchlist(id: number | string, type: 'movie' | 'tv'): boolean {
  return watchlist.value.some(item => item.id === id && item.type === type);
}

export function addToWatchlist(item: WatchlistItem): void {
  if (!isInWatchlist(item.id, item.type)) {
    watchlist.value.unshift({
      ...item,
      addedAt: item.addedAt ?? Date.now()
    });
  }
}

export function removeFromWatchlist(id: number | string, type: 'movie' | 'tv'): void {
  watchlist.value = watchlist.value.filter(item => !(item.id === id && item.type === type));
}

export function toggleWatchlistItem(item: WatchlistItem): void {
  if (isInWatchlist(item.id, item.type)) {
    removeFromWatchlist(item.id, item.type);
  } else {
    addToWatchlist(item);
  }
}

export function setWatched(
  id: number | string,
  type: 'movie' | 'tv',
  watched: boolean
): void {
  const idx = watchlist.value.findIndex(i => i.id === id && i.type === type);
  if (idx === -1) return;
  const next = [...watchlist.value];
  next[idx] = {
    ...next[idx],
    watched,
    watchedAt: watched ? Date.now() : undefined
  };
  watchlist.value = next;
}

export function isWatched(id: number | string, type: 'movie' | 'tv'): boolean {
  return watchlist.value.some(i => i.id === id && i.type === type && i.watched === true);
}

export function clearWatchlist(): void {
  watchlist.value = [];
}

export function replaceWatchlist(items: WatchlistItem[]): void {
  watchlist.value = items;
}

export function useWatchlist() {
  return {
    watchlist,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlistItem,
    setWatched,
    isWatched,
    clearWatchlist,
    replaceWatchlist
  };
}
