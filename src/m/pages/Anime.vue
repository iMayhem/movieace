<template>
    <MobileShell>
        <div class="m-discover">
            <header class="m-discover__head">
                <p class="eyebrow">Discover</p>
                <h1 class="m-discover__title">Anime</h1>
            </header>

            <details class="m-discover__filters">
                <summary>Filters</summary>
                <AnimeFilterPanel
                    :genres="animeGenresList"
                    :filters="filters"
                    :year-bounds="yearBounds"
                    @update:filters="onFiltersChange"
                    @reset="resetFilters"
                />
            </details>

            <div v-if="isLoading && !results.length" class="m-discover__loading">
                <div class="m-discover__spinner" aria-hidden="true" />
            </div>

            <MobileMediaGrid v-else-if="results.length" :items="gridItems" />

            <div v-if="hasMore" class="m-discover__more">
                <button type="button" :disabled="isLoadingMore" @click="loadMore">Load more</button>
            </div>
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import MobileShell from '../layout/MobileShell.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import AnimeFilterPanel, { AnimeFilters } from '../../components/discover/AnimeFilterPanel.vue';
import { useAniList, AnimeMedia } from '../../composables/useAniList';

const ANIME_GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

const CURRENT_YEAR = new Date().getFullYear();
const yearBounds: [number, number] = [1960, CURRENT_YEAR];

const { discoverAnime } = useAniList();
const results = ref<AnimeMedia[]>([]);
const filters = ref<AnimeFilters>({
    genres: [],
    yearRange: [...yearBounds],
    sortBy: 'TRENDING_DESC'
});
const currentPage = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const isLoadingMore = ref(false);

const animeGenresList = ANIME_GENRES.map(genre => ({ id: genre, name: genre }));
const hasMore = computed(() => currentPage.value < totalPages.value);

const gridItems = computed(() =>
    results.value.map(anime => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        posterPath: anime.coverImage.large,
        rating: anime.averageScore ? anime.averageScore / 10 : 0,
        releaseDate: anime.seasonYear?.toString() || '',
        type: 'anime' as const
    }))
);

async function load(page = 1, append = false) {
    if (append) isLoadingMore.value = true;
    else isLoading.value = true;
    try {
        const response = await discoverAnime({
            page,
            perPage: 20,
            genres: filters.value.genres,
            yearStart: filters.value.yearRange[0] !== yearBounds[0] ? filters.value.yearRange[0] : undefined,
            yearEnd: filters.value.yearRange[1] !== yearBounds[1] ? filters.value.yearRange[1] : undefined,
            sort: filters.value.sortBy
        });
        const batch = response.data.Page.media ?? [];
        results.value = append ? [...results.value, ...batch] : batch;
        totalPages.value = response.data.Page.pageInfo.lastPage ?? 1;
        currentPage.value = page;
    } finally {
        isLoading.value = false;
        isLoadingMore.value = false;
    }
}

function onFiltersChange(next: AnimeFilters) {
    filters.value = next;
}

function resetFilters() {
    filters.value = { genres: [], yearRange: [...yearBounds], sortBy: 'TRENDING_DESC' };
}

function loadMore() {
    if (!hasMore.value || isLoadingMore.value) return;
    load(currentPage.value + 1, true);
}

watch(filters, () => load(1, false), { deep: true });

onMounted(() => {
    document.title = 'Anime — Moovie';
    load(1, false);
});
</script>

<style lang="scss" scoped>
.m-discover {
    padding-bottom: var(--s-6);

    &__head {
        padding: var(--s-4);
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
        }
    }

    &__loading {
        display: flex;
        justify-content: center;
        padding: var(--s-8);
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
        padding: var(--s-5);

        button {
            min-height: 2.75rem;
            padding: 0 var(--s-5);
            border-radius: var(--r-pill);
            border: 1px solid var(--rule-strong);
            background: var(--ink-800);
            color: var(--bone-100);
        }
    }
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
