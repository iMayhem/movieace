<template>
    <div class="watch-stage">
        <header class="watch-stage__chrome">
            <div class="watch-stage__chrome-inner">
                <div class="watch-stage__crumb">
                    <button
                        type="button"
                        class="watch-stage__back"
                        aria-label="Back to show"
                        @click="goBack"
                    >
                        <ArrowLeft />
                    </button>
                    <p class="eyebrow">Now projecting</p>
                </div>

                <div class="watch-stage__title-block">
                    <h1 v-if="show" class="watch-stage__title">{{ show.name }}</h1>
                    <span v-else class="watch-stage__title-skeleton" aria-hidden="true" />
                    <p class="meta watch-stage__code">
                        S{{ currentSeason }} · E{{ String(currentEpisode).padStart(2, '0') }}
                    </p>
                </div>

                <div class="watch-stage__actions">
                    <a
                        :href="`/party/?room=${showId}_s${currentSeason}e${currentEpisode}&title=${encodeURIComponent((show?.name || '') + ' - S' + currentSeason + 'E' + currentEpisode)}`"
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
                    <StreamFrame
                        :embed-url="currentEmbedUrl"
                        :title="show?.name || 'Stream'"
                        :backdrop-path="show?.backdrop_path || ''"
                        :poster-path="show?.poster_path || ''"
                        :media-id="showId"
                        media-type="tv"
                        :season="currentSeason"
                        :episode="currentEpisode"
                    />
                </div>

                <div class="watch-stage__aside">
                    <ServerAccordion
                        :servers="availableServers"
                        :active-server-index="currentStreamData.currentServer"
                        @server-change="changeServer"
                    />
                </div>
            </div>

            <section v-if="availableSeasons.length" class="watch-stage__rack">
                <EpisodeNavigator
                    :show-id="showId"
                    :available-seasons="availableSeasons"
                    :season-episodes="seasonEpisodes"
                    :current-season="currentSeason"
                    :current-episode="currentEpisode"
                    :is-loading-episodes="isLoadingEpisodes"
                    @season-change="onSeasonChange"
                    @select="changeEpisode"
                    @previous="goToPreviousEpisode"
                    @next="goToNextEpisode"
                />
            </section>

            <section v-if="currentEpisodeDetails && show" class="watch-stage__feature">
                <div class="watch-stage__poster">
                    <img
                        v-if="currentEpisodeDetails.still_path || show.poster_path"
                        :src="episodeStill"
                        :alt="currentEpisodeDetails.name"
                        loading="lazy"
                    />
                    <span v-if="currentEpisodeDetails.vote_average" class="watch-stage__rating">
                        <span class="watch-stage__rating-num">
                            {{ currentEpisodeDetails.vote_average.toFixed(1) }}
                        </span>
                        <span class="meta">/ 10</span>
                    </span>
                </div>

                <div class="watch-stage__feature-body">
                    <p class="eyebrow">This episode</p>
                    <h2 class="watch-stage__feature-title">{{ currentEpisodeDetails.name }}</h2>

                    <ul class="watch-stage__meta">
                        <li v-if="airYear">
                            <span class="meta">Aired</span>
                            <span>{{ airYear }}</span>
                        </li>
                        <li v-if="runtimeLabel">
                            <span class="meta">Runtime</span>
                            <span>{{ runtimeLabel }}</span>
                        </li>
                        <li>
                            <span class="meta">Season</span>
                            <span>{{ currentSeason }}</span>
                        </li>
                    </ul>

                    <p v-if="currentEpisodeDetails.overview" class="watch-stage__overview">
                        {{ currentEpisodeDetails.overview }}
                    </p>
                </div>
            </section>

            <p class="watch-stage__disclaimer meta">
                Streams are mirrored from third-party providers. Movieace does not host video files.
            </p>
        </main>

        <UpNextDrawer
            v-if="show && availableSeasons.length"
            :current-season="currentSeason"
            :current-episode="currentEpisode"
            :season-episodes="seasonEpisodes"
            :next-season-number="nextSeasonNumber"
            :next-season-episodes="nextSeasonEpisodes"
            @select="onUpNextSelect"
            @season-change="onUpNextSeasonChange"
        />
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    useTvShows,
    TVShowDetails,
    Episode,
    TVShowSeasonDetails
} from '../composables/useTvShows';
import { useMiniPlayer } from '../composables/useMiniPlayer';
import {
    currentStreamData,
    getPreferredStreamData,
    savePreferredServer,
    saveLastWatchedMetaData,
    getServers,
    buildStreamUrl
} from '../composables/useStream';
import { getResumeTimestamp } from '../composables/useProgress';
import { useWebImage } from '../utils/useWebImage';

import StreamFrame from '../components/player/StreamFrame.vue';
import ServerAccordion from '../components/player/ServerAccordion.vue';
import EpisodeNavigator from '../components/player/EpisodeNavigator.vue';
import UpNextDrawer from '../components/player/UpNextDrawer.vue';
import ArrowLeft from '../components/svg/outline/arrow-left-long.vue';

export default defineComponent({
    name: 'StreamTVShow',
    components: {
        StreamFrame,
        ServerAccordion,
        EpisodeNavigator,
        UpNextDrawer,
        ArrowLeft
    },
    setup() {
        const route = useRoute();
        const router = useRouter();
        const miniPlayer = useMiniPlayer();
        const { fetchTvShow, fetchTvShowBySeason } = useTvShows();

        const showId = ref<string>(route.params.id as string);
        const externalId = ref<string>('');
        const show = ref<TVShowDetails | null>(null);
        const seasons = ref<TVShowSeasonDetails[]>([]);
        const seasonEpisodes = ref<Episode[]>([]);
        const nextSeasonEpisodes = ref<Episode[]>([]);
        const currentSeason = ref<number>(parseInt(route.params.season as string) || 1);
        const currentEpisode = ref<number>(parseInt(route.params.episode as string) || 1);
        const currentEpisodeDetails = ref<Episode | null>(null);
        const isLoadingEpisodes = ref(false);

        const availableServers = computed(() => getServers('tv'));
        const availableSeasons = computed(() =>
            seasons.value.filter((s) => s.season_number > 0)
        );

        const nextSeasonNumber = computed(() => {
            const next = availableSeasons.value.find(
                (s) => s.season_number === currentSeason.value + 1
            );
            return next ? next.season_number : 0;
        });

        const isLastEpisode = computed(() => {
            const lastInSeason = currentEpisode.value === seasonEpisodes.value.length;
            const lastSeason = !nextSeasonNumber.value;
            return lastInSeason && lastSeason;
        });

        const resumeTimestamp = ref(0);

        const currentEmbedUrl = computed(() => {
            if (!externalId.value) return '';
            const ts = resumeTimestamp.value > 0 ? resumeTimestamp.value : undefined;
            return buildStreamUrl(
                externalId.value,
                'tv',
                currentStreamData.value.currentServer,
                currentSeason.value,
                currentEpisode.value,
                ts,
                show.value?.name,
                show.value?.first_air_date ? new Date(show.value.first_air_date).getFullYear() : undefined
            );
        });

        const episodeStill = computed(() => {
            if (currentEpisodeDetails.value?.still_path) {
                return useWebImage(currentEpisodeDetails.value.still_path, 'large');
            }
            if (show.value?.poster_path) {
                return useWebImage(show.value.poster_path, 'medium');
            }
            return '';
        });

        const airYear = computed(() => {
            if (!currentEpisodeDetails.value?.air_date) return '';
            const d = new Date(currentEpisodeDetails.value.air_date);
            return Number.isNaN(d.getTime()) ? '' : d.getFullYear().toString();
        });

        const runtimeLabel = computed(() => {
            const r = currentEpisodeDetails.value?.runtime;
            if (!r) return '';
            const hours = Math.floor(r / 60);
            const minutes = r % 60;
            if (!hours) return `${minutes}m`;
            return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
        });

        const updateDocumentTitle = () => {
            if (show.value?.name) {
                document.title = `Stream · ${show.value.name} · S${currentSeason.value}E${currentEpisode.value}`;
            }
        };

        const registerMiniPlayer = () => {
            if (!show.value || !currentEmbedUrl.value) return;
            miniPlayer.setStream({
                mediaId: showId.value,
                mediaType: 'tv',
                title: show.value.name,
                embedUrl: currentEmbedUrl.value,
                posterPath: show.value.poster_path,
                backdropPath: show.value.backdrop_path,
                season: currentSeason.value,
                episode: currentEpisode.value,
                routeName: 'StreamTVShow',
                routeParams: {
                    id: showId.value,
                    season: currentSeason.value,
                    episode: currentEpisode.value
                }
            });
        };

        const loadShow = async () => {
            if (!showId.value) return;
            try {
                resumeTimestamp.value = getResumeTimestamp(showId.value, 'tv', currentSeason.value, currentEpisode.value);
                const { data } = await fetchTvShow(showId.value);
                if (!data.value) throw new Error('No show data received');
                show.value = data.value;
                seasons.value = (data.value.seasons || []).map((s) => ({
                    ...s,
                    _id: String(s.id),
                    episodes: []
                }));
                externalId.value = showId.value;

                const preferred = getPreferredStreamData(showId.value, 'tv');
                if (!preferred) {
                    savePreferredServer(showId.value, 0, 'tv');
                }

                await loadSeason();
                updateDocumentTitle();
                registerMiniPlayer();
                nextTick(() => { resumeTimestamp.value = 0; });
            } catch (err) {
                console.error('Failed to load show:', err);
            }
        };

        const loadSeason = async () => {
            isLoadingEpisodes.value = true;
            try {
                const { data } = await fetchTvShowBySeason(showId.value, currentSeason.value);
                seasonEpisodes.value = data.value?.episodes || [];
                currentEpisodeDetails.value =
                    seasonEpisodes.value.find((ep) => ep.episode_number === currentEpisode.value) ||
                    seasonEpisodes.value[0] ||
                    null;

                if (currentEpisodeDetails.value) {
                    saveLastWatchedMetaData(showId.value, 'tv', {
                        season: currentSeason.value,
                        episode: currentEpisode.value
                    });
                }

                if (nextSeasonNumber.value) {
                    fetchTvShowBySeason(showId.value, nextSeasonNumber.value)
                        .then(({ data }) => {
                            nextSeasonEpisodes.value = data.value?.episodes || [];
                        })
                        .catch(() => {
                            nextSeasonEpisodes.value = [];
                        });
                } else {
                    nextSeasonEpisodes.value = [];
                }
            } catch (err) {
                console.error('Failed to load season:', err);
            } finally {
                isLoadingEpisodes.value = false;
            }
        };

        const updateRoute = async () => {
            try {
                await router.replace({
                    name: 'StreamTVShow',
                    params: {
                        id: showId.value,
                        season: String(currentSeason.value),
                        episode: String(currentEpisode.value)
                    }
                });
                saveLastWatchedMetaData(showId.value, 'tv', {
                    season: currentSeason.value,
                    episode: currentEpisode.value
                });
                updateDocumentTitle();
                registerMiniPlayer();
            } catch (err) {
                console.error('Failed to update route:', err);
            }
        };

        const onSeasonChange = async (next: number) => {
            if (currentSeason.value === next) return;
            currentSeason.value = next;
            currentEpisode.value = 1;
            resumeTimestamp.value = getResumeTimestamp(showId.value, 'tv', next, 1);
            await updateRoute();
            await loadSeason();
            nextTick(() => { resumeTimestamp.value = 0; });
        };

        const changeEpisode = async (next: number) => {
            if (next < 1 || next === currentEpisode.value) return;
            currentEpisode.value = next;
            resumeTimestamp.value = getResumeTimestamp(showId.value, 'tv', currentSeason.value, next);
            currentEpisodeDetails.value =
                seasonEpisodes.value.find((ep) => ep.episode_number === next) || null;
            await updateRoute();
            nextTick(() => { resumeTimestamp.value = 0; });
        };

        const goToPreviousEpisode = async () => {
            if (currentEpisode.value > 1) {
                changeEpisode(currentEpisode.value - 1);
            } else if (currentSeason.value > 1) {
                const prevSeasonNum = currentSeason.value - 1;
                currentSeason.value = prevSeasonNum;
                currentEpisode.value = 1;
                await updateRoute();
                await loadSeason();
                if (seasonEpisodes.value.length) {
                    changeEpisode(seasonEpisodes.value.length);
                }
            }
        };

        const goToNextEpisode = () => {
            if (isLastEpisode.value) return;
            if (currentEpisode.value < seasonEpisodes.value.length) {
                changeEpisode(currentEpisode.value + 1);
            } else if (nextSeasonNumber.value) {
                onSeasonChange(nextSeasonNumber.value).then(() => changeEpisode(1));
            }
        };

        const onUpNextSelect = async (payload: { season: number; episode: number }) => {
            if (payload.season !== currentSeason.value) {
                currentSeason.value = payload.season;
                currentEpisode.value = payload.episode;
                await updateRoute();
                await loadSeason();
            } else {
                changeEpisode(payload.episode);
            }
        };

        const onUpNextSeasonChange = (next: number) => {
            if (next !== currentSeason.value) {
                onSeasonChange(next);
            }
        };

        const changeServer = (index: number) => {
            savePreferredServer(showId.value, index, 'tv');
            getPreferredStreamData(showId.value, 'tv');
            registerMiniPlayer();
        };

        const goBack = () => {
            router.push(`/tv-show/${showId.value}?season=${currentSeason.value}&episode=${currentEpisode.value}`);
        };

        watch(
            () => route.params,
            async (next) => {
                const nextSeason = parseInt(next.season as string);
                const nextEpisode = parseInt(next.episode as string);
                if (next.id !== showId.value) {
                    showId.value = next.id as string;
                    await loadShow();
                } else if (
                    nextSeason !== currentSeason.value ||
                    nextEpisode !== currentEpisode.value
                ) {
                    currentSeason.value = nextSeason || 1;
                    currentEpisode.value = nextEpisode || 1;
                    await loadSeason();
                    registerMiniPlayer();
                }
            },
            { deep: true }
        );

        watch(currentEmbedUrl, registerMiniPlayer);

        onMounted(() => {
            loadShow();
        });

        return {
            showId,
            externalId,
            show,
            currentStreamData,
            availableServers,
            availableSeasons,
            seasonEpisodes,
            currentSeason,
            currentEpisode,
            currentEpisodeDetails,
            isLoadingEpisodes,
            currentEmbedUrl,
            episodeStill,
            airYear,
            runtimeLabel,
            nextSeasonNumber,
            nextSeasonEpisodes,
            changeServer,
            onSeasonChange,
            changeEpisode,
            goToPreviousEpisode,
            goToNextEpisode,
            onUpNextSelect,
            onUpNextSeasonChange,
            goBack
        };
    }
});
</script>

<style lang="scss" scoped>
.watch-stage {
    height: 100vh;
    height: 100dvh;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    background: var(--ink-900);
    color: var(--bone-50);

    // Hide scrollbar visually but keep it functional
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    &__chrome {
        position: sticky;
        top: 0;
        z-index: var(--z-header);
        background: linear-gradient(
            180deg,
            rgba(11, 10, 8, 0.95),
            rgba(11, 10, 8, 0.6) 70%,
            rgba(11, 10, 8, 0)
        );
        backdrop-filter: blur(14px);
    }

    &__chrome-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--s-3) var(--s-4);
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-areas: 'crumb title actions';
        align-items: center;
        gap: var(--s-3) var(--s-4);

        @media (min-width: 768px) {
            padding: var(--s-4) var(--s-5);
        }

        // ── Mobile: stack title beneath the controls row ────────────────
        @media (max-width: 640px) {
            grid-template-columns: auto 1fr;
            grid-template-areas:
                'crumb actions'
                'title title';
            padding: var(--s-2) var(--s-3);
            gap: var(--s-2);
        }
    }

    &__crumb {
        grid-area: crumb;
        display: inline-flex;
        align-items: center;
        gap: var(--s-3);
        min-width: 0;

        @media (max-width: 640px) {
            gap: var(--s-2);

            .eyebrow {
                display: none;
            }
        }
    }

    &__back {
        all: unset;
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--surface-tint);
        cursor: pointer;
        color: var(--bone-100);

        @media (max-width: 640px) {
            width: 36px;
            height: 36px;
        }
        transition:
            background-color var(--dur-fast) var(--ease-out),
            transform var(--dur-fast) var(--ease-out);

        &:hover {
            background: var(--ember);
            color: var(--ink-900);
            transform: translateX(-2px);
        }

        &:focus-visible {
            outline: 2px solid var(--ember);
            outline-offset: 2px;
        }

        :deep(svg) { width: 18px; height: 18px; }
    }

    &__title-block {
        grid-area: title;
        display: grid;
        gap: 0.15rem;
        text-align: center;
        min-width: 0;

        @media (max-width: 640px) {
            text-align: left;
            padding-inline: var(--s-1);
        }
    }

    &__title {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: var(--fs-lg);
        letter-spacing: var(--ls-tight);
        color: var(--bone-50);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        @media (min-width: 768px) {
            font-size: var(--fs-xl);
        }
    }

    &__title-skeleton {
        display: block;
        height: 18px;
        max-width: 280px;
        margin: 0 auto;
        background: var(--surface-tint);
        border-radius: var(--r-pill);
    }

    &__code {
        color: var(--bone-400);
        font-family: var(--font-mono);
    }

    &__actions {
        grid-area: actions;
        display: inline-flex;
        align-items: center;
        gap: var(--s-2);
        justify-content: flex-end;
    }

    &__main {
        display: grid;
        gap: 0;
    }

    &__theater {
        display: grid;
        gap: var(--s-5);
        max-width: 1440px;
        width: 100%;
        margin: 0 auto;
        box-sizing: border-box;

        // Snap slide 1: fill the viewport below the chrome header
        scroll-snap-align: start;
        scroll-snap-stop: always;
        height: calc(100dvh - 72px);
        align-content: center;

        @media (min-width: 1024px) {
            grid-template-columns: 1fr 380px;
            align-items: stretch;
            padding: 0 var(--s-5) var(--s-6) var(--s-5);
        }
    }

    &__player-container {
        min-width: 0;
    }

    &__aside {
        min-width: 0;

        @media (max-width: 1023px) {
            padding: 0 var(--s-4);
        }

        @media (min-width: 1024px) {
            position: relative;
            align-self: stretch;
        }

        :deep(.server-accordion) {
            background: var(--ink-850);
            box-shadow: inset 0 0 0 1px var(--rule);

            @media (min-width: 1024px) {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }
        }

        :deep(.server-accordion__body) {
            @media (min-width: 1024px) {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                overflow: hidden;
                padding-bottom: var(--s-4);
            }
        }

        :deep(.server-accordion__grid) {
            @media (min-width: 1024px) {
                flex: 1;
                overflow-y: auto;
                margin-top: var(--s-3);
                padding-right: var(--s-2);

                &::-webkit-scrollbar {
                    width: 6px;
                }
                &::-webkit-scrollbar-track {
                    background: transparent;
                }
                &::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: var(--r-pill);
                }
            }
        }
    }

    &__rack {
        max-width: 1280px;
        width: 100%;
        margin: 0 auto;
        padding: 0 var(--s-4);
        box-sizing: border-box;

        @media (min-width: 768px) {
            padding: 0 var(--s-5);
        }
    }

    &__feature {
        // Snap slide 2: full viewport, content centered
        scroll-snap-align: start;
        scroll-snap-stop: always;
        height: 100dvh;
        display: grid;
        align-content: center;
        padding: 0 var(--s-4);
        gap: var(--s-6);
        max-width: 1280px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;

        @media (min-width: 768px) {
            padding: 0 var(--s-5);
            grid-template-columns: 280px 1fr;
            align-items: center;
        }
    }

    &__poster {
        position: relative;
        aspect-ratio: 16 / 9;
        max-width: 280px;
        border-radius: var(--r-lg);
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        margin: 0 auto;

        @media (min-width: 768px) {
            aspect-ratio: 2 / 3;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    }

    &__rating {
        position: absolute;
        top: var(--s-3);
        left: var(--s-3);
        display: inline-flex;
        align-items: baseline;
        gap: 0.35rem;
        background: rgba(11, 10, 8, 0.7);
        backdrop-filter: blur(8px);
        padding: 0.5rem 0.85rem;
        border-radius: var(--r-pill);
        box-shadow: inset 0 0 0 1px var(--rule-strong);

        > .meta { color: var(--bone-300); }
    }

    &__rating-num {
        font-family: var(--font-display);
        font-weight: 600;
        color: var(--gold-leaf);
        font-size: var(--fs-lg);
    }

    &__feature-body {
        display: grid;
        gap: var(--s-3);
        align-content: start;
    }

    &__feature-title {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: var(--fs-3xl);
        line-height: var(--lh-tight);
        letter-spacing: var(--ls-tight);
        color: var(--bone-50);

        @media (min-width: 768px) {
            font-size: var(--fs-4xl);
        }
    }

    &__meta {
        list-style: none;
        margin: 0;
        padding: var(--s-3) 0;
        display: grid;
        gap: var(--s-3);
        border-top: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule);
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));

        li {
            display: grid;
            gap: 0.2rem;

            > .meta {
                color: var(--bone-400);
                text-transform: uppercase;
                letter-spacing: var(--ls-micro);
                font-size: var(--fs-xs);
            }

            > span:not(.meta) {
                color: var(--bone-50);
                font-family: var(--font-ui);
                font-size: var(--fs-base);
            }
        }
    }

    &__overview {
        margin: 0;
        color: var(--bone-200);
        line-height: var(--lh-base);
        max-width: 60ch;
    }

    &__disclaimer {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--s-4);
        text-align: center;
        color: var(--bone-500);

        @media (min-width: 768px) {
            padding: 0 var(--s-5);
        }
    }

    &__party-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 90, 31, 0.08);
        border: 1px solid rgba(255, 90, 31, 0.25);
        border-radius: var(--r-pill);
        color: var(--ember);
        padding: 0.5rem 1.1rem;
        min-height: 38px;
        font-family: var(--font-ui);
        font-size: var(--fs-sm);
        font-weight: 600;
        text-decoration: none;
        transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);

        &:hover {
            background: rgba(255, 90, 31, 0.16);
            border-color: rgba(255, 90, 31, 0.45);
            transform: translateY(-1px);
        }

        @media (max-width: 640px) {
            width: 36px;
            min-height: 36px;
            padding: 0;
            display: inline-grid;
            place-items: center;

            .button-text {
                display: none;
            }
        }
    }

    &__party-icon {
        width: 16px;
        height: 16px;
    }
}
</style>
