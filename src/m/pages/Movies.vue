<template>
    <MobileShell>
        <div class="m-discover">
            <header class="m-discover__head">
                <p class="eyebrow">Discover</p>
                <h1 class="m-discover__title">Movies</h1>
            </header>

            <details class="m-discover__filters">
                <summary>Filters &amp; sort</summary>
                <FilterPanel
                    kind="movie"
                    :genres="genres"
                    :genres-loading="!genres.length"
                    :filters="filters"
                    :year-bounds="yearBounds"
                    @update:filters="onFiltersChange"
                    @reset="resetFilters"
                />
            </details>

            <p v-if="totalResults" class="m-discover__count meta">{{ totalResults.toLocaleString() }} results</p>

            <div v-if="isLoading && !results.length" class="m-discover__loading" role="status">
                <div class="m-discover__spinner" aria-hidden="true" />
                <span class="meta">Loading…</span>
            </div>

            <MobileMediaGrid v-else-if="results.length" :items="gridItems" />

            <div v-else class="m-discover__empty">
                <p class="meta">No movies match these filters.</p>
                <button type="button" @click="resetFilters">Reset filters</button>
            </div>

            <div v-if="hasMore" class="m-discover__more">
                <button type="button" :disabled="isLoadingMore" @click="loadMore">
                    {{ isLoadingMore ? 'Loading…' : 'Load more' }}
                </button>
            </div>
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import MobileShell from '../layout/MobileShell.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import FilterPanel, { DiscoverFilters } from '../../components/discover/FilterPanel.vue';
import { useMovies } from '../../composables/useMovies';
import { Movie } from '../../composables/useHighlights';
import { primeGenres, getGenres, Genre } from '../../composables/useGenreLookup';

const CURRENT_YEAR = new Date().getFullYear();
const yearBounds: [number, number] = [1950, CURRENT_YEAR + 2];

const makeDefaultFilters = (): DiscoverFilters => ({
    genres: [],
    yearRange: [...yearBounds],
    minRating: 0,
    runtimeBand: 'any',
    language: '',
    sortBy: 'popularity.desc'
});

const MOVIE_RUNTIME_BANDS = [
    { value: 'any', label: 'Any' },
    { value: 'short', lte: 89 },
    { value: 'standard', gte: 90, lte: 119 },
    { value: 'feature', gte: 120, lte: 149 },
    { value: 'epic', gte: 150 }
];

const { fetchDiscoverMovies } = useMovies();
const genres = ref<Genre[]>([]);
const results = ref<Movie[]>([]);
const page = ref(1);
const totalPages = ref(1);
const totalResults = ref(0);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const filters = ref<DiscoverFilters>(makeDefaultFilters());

const hasMore = computed(() => page.value < totalPages.value);

const gridItems = computed(() =>
    results.value.map(m => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        rating: m.vote_average,
        releaseDate: m.release_date,
        genreIds: m.genre_ids,
        adult: m.adult,
        type: 'movie' as const
    }))
);

function buildDiscoverUrl(pageNum: number): string {
    const f = filters.value;
    const params = new URLSearchParams({
        language: 'en-US',
        sort_by: f.sortBy,
        page: String(pageNum),
        include_adult: 'false'
    });
    if (f.genres.length) params.set('with_genres', f.genres.join(','));
    if (f.yearRange[0] !== yearBounds[0]) {
        params.set('primary_release_date.gte', `${f.yearRange[0]}-01-01`);
    }
    if (f.yearRange[1] !== yearBounds[1]) {
        params.set('primary_release_date.lte', `${f.yearRange[1]}-12-31`);
    }
    if (f.minRating > 0) {
        params.set('vote_average.gte', String(f.minRating));
        params.set('vote_count.gte', '50');
    }
    const band = MOVIE_RUNTIME_BANDS.find(b => b.value === f.runtimeBand);
    if (band && 'gte' in band && band.gte !== undefined) params.set('with_runtime.gte', String(band.gte));
    if (band && 'lte' in band && band.lte !== undefined) params.set('with_runtime.lte', String(band.lte));
    if (f.language) params.set('with_original_language', f.language);
    return `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
}

async function fetchPage(pageNum: number, append: boolean) {
    if (append) isLoadingMore.value = true;
    else isLoading.value = true;
    try {
        const { data } = await fetchDiscoverMovies(buildDiscoverUrl(pageNum));
        const fresh = (data.value?.results ?? []) as Movie[];
        totalPages.value = data.value?.total_pages ?? 1;
        totalResults.value = data.value?.total_results ?? 0;
        page.value = pageNum;
        results.value = append ? [...results.value, ...fresh] : fresh;
    } finally {
        isLoading.value = false;
        isLoadingMore.value = false;
    }
}

function onFiltersChange(next: DiscoverFilters) {
    filters.value = next;
    fetchPage(1, false);
}

function resetFilters() {
    filters.value = makeDefaultFilters();
    fetchPage(1, false);
}

function loadMore() {
    if (isLoadingMore.value || page.value >= totalPages.value) return;
    fetchPage(page.value + 1, true);
}

onMounted(async () => {
    document.title = 'Movies — Moovie';
    await primeGenres();
    genres.value = await getGenres('movie');
    await fetchPage(1, false);
});
</script>

<style lang="scss" scoped>
.m-discover {
    padding-bottom: var(--s-6);

    &__head {
        padding: var(--s-4) var(--s-4) var(--s-3);
    }

    &__title {
        font-family: var(--font-display);
        font-size: 1.6rem;
        margin: 0;
    }

    &__filters {
        margin: 0 var(--s-4) var(--s-4);
        padding: var(--s-3);
        border: 1px solid var(--rule);
        border-radius: var(--r-md);
        background: var(--ink-850);

        summary {
            cursor: pointer;
            font-weight: 600;
            font-family: var(--font-ui);
            list-style: none;

            &::-webkit-details-marker {
                display: none;
            }
        }
    }

    &__count {
        padding: 0 var(--s-4) var(--s-3);
    }

    &__loading,
    &__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--s-3);
        padding: var(--s-8) var(--s-4);
        text-align: center;
    }

    &__spinner {
        width: 2rem;
        height: 2rem;
        border: 2px solid var(--rule);
        border-top-color: var(--ember);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    &__more {
        display: flex;
        justify-content: center;
        padding: var(--s-5) var(--s-4);

        button {
            min-height: 2.75rem;
            padding: 0 var(--s-5);
            border-radius: var(--r-pill);
            border: 1px solid var(--rule-strong);
            background: var(--ink-800);
            color: var(--bone-100);
            font-weight: 600;
        }
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
