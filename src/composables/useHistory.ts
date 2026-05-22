export interface ViewedItem {
  id: number | string;
  title: string;
  image: string | null;
  rating: number;
  categories: number[];
  adult: boolean;
  type: 'movie' | 'tv' | 'anime';
}
const MAX_HISTORY_LENGTH = 20;

import { useStorage } from '@vueuse/core';
import { watch } from 'vue';
import { getCurrentUser, pushUserDataToSupabase } from '../lib/auth';

export const searchHistory = useStorage<string[]>('searchHistory', []);
export const viewHistory = useStorage<ViewedItem[]>('viewHistory', []);

export function addSearchTerm(term: string): void {
  const value = term.trim();
  if (!value) return;
  const index = searchHistory.value.indexOf(value);
  if (index !== -1) searchHistory.value.splice(index, 1);
  searchHistory.value.unshift(value);
  if (searchHistory.value.length > MAX_HISTORY_LENGTH) {
    searchHistory.value = searchHistory.value.slice(0, 20);
  }
  
  // Sync to Supabase if user is logged in
  const user = getCurrentUser();
  if (user) {
    pushUserDataToSupabase(user, [], undefined, searchHistory.value);
  }
}

export function addViewedItem(item: ViewedItem): void {
  const index = viewHistory.value.findIndex(
    i => i.id === item.id && i.type === item.type
  );
  if (index !== -1) viewHistory.value.splice(index, 1);
  viewHistory.value.unshift(item);
  if (viewHistory.value.length > MAX_HISTORY_LENGTH) {
    viewHistory.value = viewHistory.value.slice(0, 20);
  }
  
  // Sync to Supabase if user is logged in
  const user = getCurrentUser();
  if (user) {
    pushUserDataToSupabase(user, [], viewHistory.value, undefined);
  }
}

// Auto-sync watch history with Supabase when user is logged in
if (typeof window !== 'undefined') {
  watch(
    viewHistory,
    (newVal) => {
      const user = getCurrentUser();
      if (user) {
        pushUserDataToSupabase(user, [], newVal, undefined);
      }
    },
    { deep: true }
  );
}

export function useHistory() {
  return {
    searchHistory,
    viewHistory,
    addSearchTerm,
    addViewedItem
  };
}
