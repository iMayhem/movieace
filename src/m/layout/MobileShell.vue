<template>
    <div class="m-app">
        <header class="m-app__header">
            <router-link :to="home" class="m-app__logo" aria-label="moovie home">
                <span class="m-app__mark">moovie</span>
            </router-link>

            <div class="m-app__header-actions">
                <router-link :to="search" class="m-app__icon-btn" aria-label="Search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </svg>
                </router-link>
                <router-link :to="watchlist" class="m-app__icon-btn" aria-label="Watchlist">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </router-link>
            </div>
        </header>

        <main id="main" class="m-app__main">
            <slot />
        </main>

        <nav class="m-app__tabbar" aria-label="Mobile primary">
            <router-link
                v-for="tab in tabs"
                :key="tab.to"
                :to="tab.to"
                class="m-app__tab"
                :class="{ 'is-active': isTabActive(tab) }"
            >
                <span class="m-app__tab-icon" aria-hidden="true">{{ tab.icon }}</span>
                <span class="m-app__tab-label">{{ tab.label }}</span>
            </router-link>
        </nav>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppPaths } from '../../composables/useAppPaths';

const { home, movies, tvShows, animeList, actors, search, watchlist } = useAppPaths();
const route = useRoute();

const tabs = computed(() => [
    { to: home.value, label: 'Home', icon: '⌂', match: (p: string) => p === '/m' },
    { to: movies.value, label: 'Movies', icon: '▶', match: (p: string) => p.startsWith('/m/movies') || p.startsWith('/m/movie/') },
    { to: tvShows.value, label: 'TV', icon: '▦', match: (p: string) => p.startsWith('/m/tv') },
    { to: animeList.value, label: 'Anime', icon: '✦', match: (p: string) => p.startsWith('/m/anime') },
    { to: actors.value, label: 'Cast', icon: '◎', match: (p: string) => p.startsWith('/m/actor') }
]);

function isTabActive(tab: { match: (p: string) => boolean }) {
    return tab.match(route.path);
}
</script>

<style lang="scss" scoped>
.m-app {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--ink-900);
    color: var(--bone-50);
    padding-bottom: calc(4.25rem + env(safe-area-inset-bottom, 0px));

    &__header {
        position: sticky;
        top: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--s-3);
        padding: max(env(safe-area-inset-top, 0px), var(--s-2)) var(--s-4) var(--s-2);
        background: rgba(11, 10, 8, 0.92);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--rule);
    }

    &__logo {
        color: inherit;
        text-decoration: none;
    }

    &__mark {
        font-family: var(--font-display);
        font-size: 1.35rem;
        font-weight: 500;
        letter-spacing: var(--ls-tight);
        color: var(--bone-50);
    }

    &__header-actions {
        display: flex;
        gap: var(--s-2);
    }

    &__icon-btn {
        display: grid;
        place-items: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: var(--r-pill);
        color: var(--bone-200);
        background: var(--ink-800);
        border: 1px solid var(--rule);

        svg {
            width: 1.15rem;
            height: 1.15rem;
        }
    }

    &__main {
        flex: 1;
        width: 100%;
    }

    &__tabbar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 60;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0;
        padding: var(--s-2) var(--s-1) calc(var(--s-2) + env(safe-area-inset-bottom, 0px));
        background: rgba(11, 10, 8, 0.96);
        backdrop-filter: blur(16px);
        border-top: 1px solid var(--rule-strong);
    }

    &__tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.15rem;
        min-height: 3rem;
        padding: 0.25rem;
        color: var(--bone-400);
        text-decoration: none;
        font-family: var(--font-ui);
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        border-radius: var(--r-sm);
        transition: color var(--dur-fast) var(--ease-out);

        &.is-active {
            color: var(--ember);
        }
    }

    &__tab-icon {
        font-size: 1rem;
        line-height: 1;
    }
}
</style>
