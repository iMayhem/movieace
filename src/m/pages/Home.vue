<template>
    <MobileShell>
        <section v-if="hero" class="m-home__hero">
            <router-link :to="movie(hero.id)" class="m-home__hero-link">
                <img
                    v-if="heroBackdrop"
                    :src="heroBackdrop"
                    :alt="hero.title"
                    class="m-home__hero-img"
                    fetchpriority="high"
                />
                <div class="m-home__hero-scrim" aria-hidden="true" />
                <div class="m-home__hero-body">
                    <p class="eyebrow m-home__hero-eyebrow">Featured</p>
                    <h1 class="m-home__hero-title">{{ hero.title }}</h1>
                    <p v-if="hero.overview" class="m-home__hero-desc">{{ heroOverview }}</p>
                </div>
            </router-link>
        </section>

        <ContinueShelf class="m-home__continue" />

        <MobileSection
            v-if="topTenItems.length"
            title="Top 10 Today"
            eyebrow="Trending"
            :more-to="movies"
        >
            <MobileMediaGrid :items="topTenItems" />
        </MobileSection>

        <MobileSection
            v-if="nowPlayingItems.length"
            title="Now Playing"
            eyebrow="New"
            :more-to="movies"
        >
            <MobileMediaGrid :items="nowPlayingItems" />
        </MobileSection>

        <MobileSection
            v-if="seriesItems.length"
            title="Series in rotation"
            eyebrow="TV"
            :more-to="tvShows"
        >
            <MobileMediaGrid :items="seriesItems" />
        </MobileSection>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import MobileShell from '../layout/MobileShell.vue';
import MobileSection from '../components/MobileSection.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import ContinueShelf from '../../components/rails/ContinueShelf.vue';
import { useHighlights, highLightOptions } from '../../composables/useHighlights';
import { useTvShows, newShows } from '../../composables/useTvShows';
import { primeGenres } from '../../composables/useGenreLookup';
import { useAppPaths } from '../../composables/useAppPaths';
import { useWebImage } from '../../utils/useWebImage';

const { movie, movies, tvShows } = useAppPaths();
const { fetchAllHighlights } = useHighlights();
const { fetchNewShows } = useTvShows();

const hero = computed(() => highLightOptions.featured.data?.[0] ?? null);

const heroBackdrop = computed(() => {
    const path = hero.value?.backdrop_path || hero.value?.poster_path;
    return path ? useWebImage(path, 'large') : '';
});

const heroOverview = computed(() => {
    const text = hero.value?.overview ?? '';
    return text.length > 140 ? `${text.slice(0, 137).trim()}…` : text;
});

const topTenItems = computed(() =>
    (highLightOptions.popular.data ?? []).slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path,
        type: 'movie' as const
    }))
);

const nowPlayingItems = computed(() =>
    (highLightOptions.new.data ?? []).slice(0, 12).map(m => ({
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

const seriesItems = computed(() =>
    (newShows.value ?? []).slice(0, 12).map(s => ({
        id: s.id,
        title: s.name,
        posterPath: s.poster_path,
        rating: s.vote_average,
        releaseDate: s.release_date,
        genreIds: s.genre_ids,
        adult: s.adult,
        type: 'tv' as const
    }))
);

onMounted(async () => {
    document.title = 'Moovie';
    primeGenres();
    await Promise.all([fetchAllHighlights(), fetchNewShows()]);
});
</script>

<style lang="scss" scoped>
.m-home {
    &__hero {
        margin: 0 var(--s-4) var(--s-4);
        border-radius: var(--r-md);
        overflow: hidden;
    }

    &__hero-link {
        position: relative;
        display: block;
        aspect-ratio: 16 / 10;
        color: inherit;
        text-decoration: none;
    }

    &__hero-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    &__hero-scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 20%, rgba(11, 10, 8, 0.92) 100%);
    }

    &__hero-body {
        position: absolute;
        inset: auto 0 0 0;
        padding: var(--s-4);
    }

    &__hero-eyebrow {
        color: var(--ember);
        margin-bottom: var(--s-1);
    }

    &__hero-title {
        font-family: var(--font-display);
        font-size: clamp(1.4rem, 5vw, 1.75rem);
        font-weight: 500;
        line-height: 1.1;
        margin: 0 0 var(--s-2);
    }

    &__hero-desc {
        margin: 0;
        font-size: var(--fs-sm);
        color: var(--bone-300);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    &__continue {
        margin: 0 var(--s-4) var(--s-2);
    }
}
</style>
