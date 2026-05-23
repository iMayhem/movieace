<template>
    <MobileShell>
        <div class="m-search">
            <header class="m-search__head">
                <h1 class="m-search__title">Search</h1>
                <form role="search" @submit.prevent>
                    <input
                        v-model="searchTerm"
                        type="search"
                        class="m-search__input"
                        placeholder="Movies, TV, people…"
                        aria-label="Search"
                        autocomplete="off"
                    />
                </form>
            </header>

            <LmTabs
                v-if="searchTerm"
                v-model="activeTab"
                :tabs="tabs"
                variant="underline"
                class="m-search__tabs"
            />

            <div v-if="isLoading" class="m-search__loading">
                <div class="m-discover__spinner" aria-hidden="true" />
            </div>

            <MobileMediaGrid v-else-if="activeTab === 'movies' && movies.length" :items="movieItems" />
            <MobileMediaGrid v-else-if="activeTab === 'shows' && shows.length" :items="showItems" />

            <div v-else-if="searchTerm && !isLoading" class="m-search__empty meta">No results.</div>
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import debounce from 'lodash.debounce';
import MobileShell from '../layout/MobileShell.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import LmTabs from '../../components/primitives/Tabs.vue';
import {
    useSearch,
    discoveredMovies,
    discoveredTv
} from '../../composables/useSearch';

const searchTerm = ref('');
const activeTab = ref<'movies' | 'shows'>('movies');
const isLoading = ref(false);
const { fetchSearchResults } = useSearch();
const movies = discoveredMovies;
const shows = discoveredTv;

const tabs = [
    { value: 'movies', label: 'Movies' },
    { value: 'shows', label: 'TV' }
];

const movieItems = computed(() =>
    movies.value.map(m => ({
        id: m.id,
        title: m.title || m.original_title || '',
        posterPath: m.poster_path,
        rating: m.vote_average || 0,
        releaseDate: m.release_date || '',
        genreIds: m.genre_ids || [],
        adult: m.adult || false,
        type: 'movie' as const
    }))
);

const showItems = computed(() =>
    shows.value.map(s => ({
        id: s.id,
        title: s.name || '',
        posterPath: s.poster_path,
        rating: s.vote_average || 0,
        releaseDate: s.first_air_date || '',
        genreIds: s.genre_ids || [],
        adult: false,
        type: 'tv' as const
    }))
);

const runSearch = debounce(async () => {
    const q = searchTerm.value.trim();
    if (!q) return;
    isLoading.value = true;
    try {
        await fetchSearchResults(q, 1);
    } finally {
        isLoading.value = false;
    }
}, 350);

watch(searchTerm, runSearch);

watch(
    () => searchTerm.value,
    () => {
        document.title = searchTerm.value ? `“${searchTerm.value}” — Moovie` : 'Search — Moovie';
    }
);
</script>

<style lang="scss" scoped>
.m-search {
    padding-bottom: var(--s-6);

    &__head {
        padding: var(--s-4);
    }

    &__title {
        font-family: var(--font-display);
        font-size: 1.5rem;
        margin: 0 0 var(--s-3);
    }

    &__input {
        width: 100%;
        min-height: 2.75rem;
        padding: 0 var(--s-4);
        border-radius: var(--r-pill);
        border: 1px solid var(--rule-strong);
        background: var(--ink-850);
        color: var(--bone-50);
        font-size: 1rem;
    }

    &__tabs {
        padding: 0 var(--s-4) var(--s-3);
    }

    &__loading,
    &__empty {
        padding: var(--s-8) var(--s-4);
        text-align: center;
    }
}
</style>
