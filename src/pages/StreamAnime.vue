<template>
    <div class="watch-stage">
        <header class="watch-stage__chrome">
            <div class="watch-stage__chrome-inner">
                <div class="watch-stage__crumb">
                    <button
                        type="button"
                        class="watch-stage__back"
                        aria-label="Back to anime"
                        @click="goBack"
                    >
                        <ArrowLeft />
                    </button>
                    <p class="eyebrow">Now projecting</p>
                </div>

                <div class="watch-stage__title-block">
                    <h1 v-if="anime" class="watch-stage__title">{{ animeTitle }}</h1>
                    <span v-else class="watch-stage__title-skeleton" aria-hidden="true" />
                    <p class="meta watch-stage__code">
                        Episode {{ currentEpisode }}
                    </p>
                </div>

                <div class="watch-stage__actions">
                    <a
                        v-if="anime"
                        :href="partyHref"
                        class="watch-stage__party-btn"
                        title="Watch Together with friends!"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="watch-stage__party-icon">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span class="button-text">Watch Together</span>
                    </a>
                </div>
            </div>
        </header>

        <main class="watch-stage__main" id="main">
            <div class="watch-stage__theater">
                <div class="watch-stage__player-container">
                    <div class="player-stage-container">
                        <iframe
                            :src="currentEmbedUrl"
                            class="stream-iframe"
                            allowfullscreen
                            allow="autoplay; encrypted-media"
                            :title="animeTitle || 'Anime Player'"
                        ></iframe>
                    </div>
                </div>

                <div class="watch-stage__aside">
                    <!-- Premium Dub / Sub Switcher -->
                    <div class="language-switcher">
                        <p class="eyebrow language-switcher__header">Language Pref</p>
                        <div class="language-switcher__tabs">
                            <button
                                type="button"
                                class="language-switcher__btn"
                                :class="{ 'is-active': activeLanguage === 'sub' }"
                                @click="activeLanguage = 'sub'"
                            >
                                Subtitled
                            </button>
                            <button
                                type="button"
                                class="language-switcher__btn"
                                :class="{ 'is-active': activeLanguage === 'dub' }"
                                @click="activeLanguage = 'dub'"
                            >
                                Dubbed
                            </button>
                        </div>
                    </div>

                    <div class="server-selector">
                        <p class="eyebrow server-selector__header">Select Stream Mirror</p>
                        <ul class="server-selector__list">
                            <li
                                v-for="(srv, idx) in availableServers"
                                :key="srv.id"
                                class="server-selector__item"
                            >
                                <button
                                    type="button"
                                    class="server-selector__btn"
                                    :class="{ 'is-active': activeServerIndex === idx }"
                                    @click="activeServerIndex = idx"
                                >
                                    <span class="server-selector__name">{{ srv.name }}</span>
                                    <span class="server-selector__badge">Auto</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <section v-if="anime" class="watch-stage__rack">
                <div class="episode-navigator">
                    <div class="episode-navigator__header">
                        <h3 class="episode-navigator__title">Episodes</h3>
                        <div class="episode-navigator__actions">
                            <button
                                type="button"
                                class="episode-navigator__control"
                                :disabled="currentEpisode <= 1"
                                @click="goToEpisode(currentEpisode - 1)"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                class="episode-navigator__control"
                                :disabled="currentEpisode >= totalEpisodes"
                                @click="goToEpisode(currentEpisode + 1)"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                    <div class="episode-navigator__grid">
                        <button
                            v-for="ep in totalEpisodes"
                            :key="ep"
                            type="button"
                            class="episode-navigator__btn"
                            :class="{ 'is-active': ep === currentEpisode }"
                            @click="goToEpisode(ep)"
                        >
                            {{ ep }}
                        </button>
                    </div>
                </div>
            </section>

            <section v-if="anime" class="watch-stage__feature">
                <div class="watch-stage__poster">
                    <img
                        :src="anime.coverImage.large"
                        :alt="animeTitle"
                        loading="lazy"
                    />
                </div>

                <div class="watch-stage__feature-body">
                    <p class="eyebrow">Project details</p>
                    <h2 class="watch-stage__feature-title">{{ animeTitle }}</h2>

                    <ul class="watch-stage__meta">
                        <li v-if="anime.seasonYear">
                            <span class="meta">Year</span>
                            <span>{{ anime.seasonYear }}</span>
                        </li>
                        <li v-if="anime.format">
                            <span class="meta">Format</span>
                            <span>{{ anime.format }}</span>
                        </li>
                        <li v-if="anime.status">
                            <span class="meta">Status</span>
                            <span>{{ anime.status }}</span>
                        </li>
                    </ul>

                    <p v-if="anime.description" class="watch-stage__overview" v-html="anime.description"></p>
                </div>
            </section>

            <p class="watch-stage__disclaimer meta">
                Streams are mirrored from third-party providers. Movieace does not host video files.
            </p>
        </main>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAniList } from '../composables/useAniList';
import { saveProgress } from '../composables/useProgress';
import { addViewedItem } from '../composables/useHistory';
import ArrowLeft from '../components/svg/outline/arrow-left-long.vue';

export default defineComponent({
    name: 'StreamAnime',
    components: {
        ArrowLeft
    },
    setup() {
        const route = useRoute();
        const router = useRouter();
        const { fetchAnimeById } = useAniList();

        const animeId = ref<number>(Number(route.params.id));
        const anime = ref<any | null>(null);
        const currentEpisode = ref<number>(1);
        const activeServerIndex = ref<number>(0);
        const activeLanguage = ref<'sub' | 'dub'>('sub');

        const availableServers = [
            { id: 'animeplay_ani', name: 'AnimePlay CFD (Native)', url: 'https://animeplay.cfd/stream/ani/{id}/{episode}/{lang}' },
            { id: 'animeplay_mal', name: 'AnimePlay CFD (MAL Link)', url: 'https://animeplay.cfd/stream/mal/{malId}/{episode}/{lang}' },
            { id: 'animeplay_s2', name: 'AnimePlay CFD (Anikoto)', url: 'https://animeplay.cfd/stream/s-2/{id}/{lang}' }
        ];

        const animeTitle = computed(() => {
            if (!anime.value) return '';
            return anime.value.title.english || anime.value.title.romaji || anime.value.title.native;
        });

        const totalEpisodes = computed(() => {
            return anime.value?.episodes || 1;
        });

        const currentEmbedUrl = computed(() => {
            const server = availableServers[activeServerIndex.value];
            const malId = anime.value?.idMal ? String(anime.value.idMal) : String(animeId.value);
            return server.url
                .replace('{id}', String(animeId.value))
                .replace('{malId}', malId)
                .replace('{episode}', String(currentEpisode.value))
                .replace('{lang}', activeLanguage.value);
        });

        const partyHref = computed(() => {
            const titleStr = `${animeTitle.value} - Episode ${currentEpisode.value}`;
            return `/party/?room=anime_${animeId.value}_ep${currentEpisode.value}&title=${encodeURIComponent(titleStr)}`;
        });

        const loadAnime = async (id: number) => {
            try {
                const response = await fetchAnimeById(id);
                const media = response?.data?.Media ?? null;
                anime.value = media;

                if (media) {
                    // Record in history for Continue Watching support
                    addViewedItem({
                        id: animeId.value,
                        title: animeTitle.value,
                        image: media.coverImage.large,
                        rating: media.averageScore ? media.averageScore / 10 : 0,
                        categories: [],
                        adult: false,
                        type: 'anime'
                    });
                }
            } catch (err) {
                console.error('Failed to load anime for streaming:', err);
            }
        };

        const goBack = () => {
            router.push(`/anime/${animeId.value}`);
        };

        const goToEpisode = (ep: number) => {
            if (ep >= 1 && ep <= totalEpisodes.value) {
                currentEpisode.value = ep;
                router.push(`/stream/anime/${animeId.value}/episode/${ep}`);
            }
        };

        // Real-time message listener for auto-next and watch progress saving
        const handlePlayerMessage = (event: MessageEvent) => {
            let data = event.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    return;
                }
            }
            if (!data) return;

            // Handle watch progress saving
            if (data.event === 'time' && data.time !== undefined && data.duration !== undefined) {
                saveProgress(animeId.value, 'anime', data.time, data.duration, undefined, currentEpisode.value);
            } else if (data.type === 'watching-log' && data.currentTime !== undefined && data.duration !== undefined) {
                saveProgress(animeId.value, 'anime', data.currentTime, data.duration, undefined, currentEpisode.value);
            }

            // Handle auto-next
            if (data.event === 'complete') {
                if (currentEpisode.value < totalEpisodes.value) {
                    goToEpisode(currentEpisode.value + 1);
                }
            }
        };

        onMounted(() => {
            const epParam = route.params.episode;
            if (epParam) {
                currentEpisode.value = parseInt(epParam as string) || 1;
            }
            loadAnime(animeId.value);
            window.addEventListener('message', handlePlayerMessage);
        });

        onUnmounted(() => {
            window.removeEventListener('message', handlePlayerMessage);
        });

        watch(
            () => route.params.episode,
            newEp => {
                if (newEp) {
                    currentEpisode.value = parseInt(newEp as string) || 1;
                }
            }
        );

        return {
            animeId,
            anime,
            animeTitle,
            currentEpisode,
            totalEpisodes,
            activeServerIndex,
            availableServers,
            currentEmbedUrl,
            partyHref,
            activeLanguage,
            goBack,
            goToEpisode
        };
    }
});
</script>

<style lang="scss" scoped>
.watch-stage {
    min-height: 100dvh;
    background-color: var(--ink-950);
    color: var(--bone-50);
    display: flex;
    flex-direction: column;

    &__chrome {
        background: rgba(10, 10, 12, 0.85);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--rule);
        position: sticky;
        top: 0;
        z-index: 10;
    }

    &__chrome-inner {
        max-width: 1440px;
        margin: 0 auto;
        padding: 0.75rem var(--s-6);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--s-4);
    }

    &__crumb {
        display: flex;
        align-items: center;
        gap: var(--s-3);
    }

    &__back {
        background: none;
        border: none;
        color: var(--bone-200);
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color var(--dur-fast), transform var(--dur-fast);

        &:hover {
            color: var(--ember);
            transform: translateX(-2px);
        }

        svg {
            width: 20px;
            height: 20px;
        }
    }

    &__title-block {
        text-align: center;
    }

    &__title {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.15rem;
        margin: 0;
        color: var(--bone-50);
    }

    &__code {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--ember);
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    &__actions {
        display: flex;
        align-items: center;
    }

    &__party-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--s-2);
        padding: 0.5rem 1rem;
        border-radius: var(--r-pill);
        background: linear-gradient(135deg, var(--ember) 0%, #ff8a00 100%);
        color: #000;
        font-weight: 600;
        font-size: 0.85rem;
        text-decoration: none;
        transition: transform var(--dur-fast), box-shadow var(--dur-fast);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(255, 90, 31, 0.35);
        }
    }

    &__party-icon {
        width: 16px;
        height: 16px;
    }

    &__main {
        max-width: 1440px;
        width: 100%;
        margin: 0 auto;
        padding: var(--s-6);
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--s-6);
    }

    &__theater {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--s-4);

        @media (min-width: 1024px) {
            grid-template-columns: 1fr 280px;
        }
    }

    &__player-container {
        aspect-ratio: 16 / 9;
        background: #000;
        border-radius: var(--r-md);
        overflow: hidden;
        border: 1px solid var(--rule);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .player-stage-container {
        width: 100%;
        height: 100%;
    }

    .stream-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: #000;
    }

    &__aside {
        display: flex;
        flex-direction: column;
        gap: var(--s-4);
    }

    &__rack {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--rule);
        border-radius: var(--r-md);
        padding: var(--s-5);
    }

    &__feature {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--s-6);
        background: rgba(255, 255, 255, 0.01);
        border: 1px solid var(--rule);
        border-radius: var(--r-md);
        padding: var(--s-6);

        @media (min-width: 768px) {
            grid-template-columns: 180px 1fr;
        }
    }

    &__poster {
        aspect-ratio: 2 / 3;
        border-radius: var(--r-sm);
        overflow: hidden;
        border: 1px solid var(--rule);

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__feature-body {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    &__feature-title {
        font-family: var(--font-display);
        font-size: 1.5rem;
        font-weight: 600;
        margin-top: var(--s-1);
        margin-bottom: var(--s-3);
    }

    &__meta {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--s-4) 0;
        display: flex;
        gap: var(--s-5);
        font-size: var(--fs-sm);

        li {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .meta {
            font-size: var(--fs-xs);
            color: var(--bone-450);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    }

    &__overview {
        color: var(--bone-300);
        line-height: 1.6;
        font-size: var(--fs-sm);
        max-width: 72ch;
    }

    &__disclaimer {
        text-align: center;
        margin-top: var(--s-4);
        color: var(--bone-500);
    }
}

.language-switcher {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    padding: var(--s-4);
    display: flex;
    flex-direction: column;
    gap: var(--s-3);

    &__header {
        margin: 0;
    }

    &__tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--s-2);
        background: rgba(0, 0, 0, 0.2);
        padding: 4px;
        border-radius: var(--r-sm);
        border: 1px solid var(--rule);
    }

    &__btn {
        padding: 0.5rem;
        border-radius: var(--r-sm);
        border: none;
        background: transparent;
        color: var(--bone-300);
        font-weight: 500;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all var(--dur-fast);

        &:hover {
            color: var(--bone-50);
        }

        &.is-active {
            background: var(--ember);
            color: #000;
            font-weight: 600;
        }
    }
}

.server-selector {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    padding: var(--s-4);
    display: flex;
    flex-direction: column;
    gap: var(--s-3);

    &__header {
        margin: 0;
    }

    &__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--s-2);
    }

    &__btn {
        width: 100%;
        padding: 0.75rem var(--s-4);
        border-radius: var(--r-sm);
        border: 1px solid var(--rule);
        background: rgba(255, 255, 255, 0.02);
        color: var(--bone-200);
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all var(--dur-fast);

        &:hover {
            border-color: var(--rule-strong);
            background: rgba(255, 255, 255, 0.04);
            color: var(--bone-50);
        }

        &.is-active {
            border-color: var(--ember);
            background: rgba(255, 90, 31, 0.08);
            color: var(--ember);
            font-weight: 600;
        }
    }

    &__badge {
        font-size: 0.65rem;
        font-family: var(--font-mono);
        padding: 2px 6px;
        border-radius: var(--r-pill);
        border: 1px solid currentColor;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
}

.episode-navigator {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    &__title {
        font-family: var(--font-display);
        font-size: 1.1rem;
        margin: 0;
    }

    &__actions {
        display: flex;
        gap: var(--s-2);
    }

    &__control {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--rule);
        color: var(--bone-200);
        padding: 0.4rem 0.8rem;
        border-radius: var(--r-pill);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--dur-fast);

        &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.06);
            color: var(--bone-50);
            border-color: var(--rule-strong);
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
        gap: var(--s-2);
        max-height: 240px;
        overflow-y: auto;
        padding-right: var(--s-2);

        &::-webkit-scrollbar {
            width: 4px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--rule-strong);
            border-radius: var(--r-pill);
        }
    }

    &__btn {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--rule);
        border-radius: var(--r-sm);
        color: var(--bone-200);
        font-family: var(--font-mono);
        font-size: 0.85rem;
        cursor: pointer;
        transition: all var(--dur-fast);

        &:hover {
            border-color: var(--rule-strong);
            background: rgba(255, 255, 255, 0.04);
            color: var(--bone-50);
        }

        &.is-active {
            background: var(--ember);
            border-color: var(--ember);
            color: #000;
            font-weight: 700;
        }
    }
}
</style>
