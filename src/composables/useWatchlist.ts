import { useStorage } from '@vueuse/core';
import { watch } from 'vue';
import { getCurrentUser, pushUserDataToSupabase, syncUserDataWithSupabase } from '../lib/auth';

export interface WatchlistItem {
  id: number | string;
  title: string;
  image: string | null;
  rating: number;
  categories: number[];
  adult: boolean;
  type: 'movie' | 'tv' | 'anime';
  addedAt?: number;
  watched?: boolean;
  watchedAt?: number;
}

const WATCHLIST_KEY = 'watchlist';
const SYNC_REMINDER_KEY = 'watchlist_sync_reminder_shown';

export const watchlist = useStorage<WatchlistItem[]>(WATCHLIST_KEY, []);

// Helper to show sync reminder
function showSyncReminder() {
  if (typeof window === 'undefined') return;
  
  const user = getCurrentUser();
  if (user) return; // Already logged in, no need to remind
  
  const reminderShown = sessionStorage.getItem(SYNC_REMINDER_KEY);
  if (reminderShown) return; // Already shown this session
  
  // Mark as shown for this session
  sessionStorage.setItem(SYNC_REMINDER_KEY, 'true');
  
  // Dispatch custom event for toast notification
  window.dispatchEvent(new CustomEvent('watchlist_sync_reminder', {
    detail: { message: 'Sign in to sync your watchlist to the cloud and access it from any device.' }
  }));
}

// Auto-sync state with Supabase when user is logged in
if (typeof window !== 'undefined') {
  watch(
    watchlist,
    (newVal) => {
      const user = getCurrentUser();
      if (user) {
        // User is logged in - sync to Supabase immediately
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

  // When user logs in, sync local watchlist to Supabase
  const handleAuthChange = async () => {
    const user = getCurrentUser();
    if (user) {
      // User just logged in - merge local watchlist with cloud
      const localWatchlist = [...watchlist.value];
      
      // Fetch cloud watchlist
      await syncUserDataWithSupabase(user);
      
      // Merge: keep local items that aren't in cloud
      const cloudWatchlist = watchlist.value;
      const merged = [...cloudWatchlist];
      
      localWatchlist.forEach(localItem => {
        const existsInCloud = cloudWatchlist.some(
          cloudItem => cloudItem.id === localItem.id && cloudItem.type === localItem.type
        );
        if (!existsInCloud) {
          merged.push(localItem);
        }
      });
      
      // Update both local and cloud with merged list
      watchlist.value = merged;
      await pushUserDataToSupabase(user, merged);
      
      // Show success message
      window.dispatchEvent(new CustomEvent('watchlist_synced', {
        detail: { message: 'Watchlist synced to cloud successfully!' }
      }));
    }
    
    handleAuthOrDataChange();
  };

  window.addEventListener('movora_auth_change', handleAuthChange);
  window.addEventListener('movora_userdata_change', handleAuthOrDataChange);
}

export function isInWatchlist(id: number | string, type: 'movie' | 'tv' | 'anime'): boolean {
  return watchlist.value.some(item => item.id === id && item.type === type);
}

export function addToWatchlist(item: WatchlistItem): void {
  if (!isInWatchlist(item.id, item.type)) {
    watchlist.value.unshift({
      ...item,
      addedAt: item.addedAt ?? Date.now()
    });
    
    // Show sync reminder if not logged in
    showSyncReminder();
  }
}

export function removeFromWatchlist(id: number | string, type: 'movie' | 'tv' | 'anime'): void {
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
  type: 'movie' | 'tv' | 'anime',
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

export function isWatched(id: number | string, type: 'movie' | 'tv' | 'anime'): boolean {
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
