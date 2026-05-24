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
                    <StreamFrame
                        :embed-url="currentEmbedUrl"
                        :title="animeTitle || 'Anime Player'"
                        :backdrop-path="anime?.bannerImage || anime?.coverImage?.large || ''"
                        :poster-path="anime?.coverImage?.large || ''"
                        :media-id="animeId"
                        media-type="anime"
                        :episode="currentEpisode"
                        @switch-to-server="activeServerIndex = $event"
                    />
                </div>

                <div class="watch-stage__aside">
                    <!-- Premium Season Selector -->
                    <div v-if="seasonsList.length > 1" class="season-switcher">
                        <p class="eyebrow season-switcher__header">Season / Arc</p>
                        <div class="season-switcher__select-wrapper">
                            <select
                                :value="animeId"
                                @change="goToSeason(Number(($event.target as HTMLSelectElement).value))"
                                class="season-switcher__select"
                            >
                                <option
                                    v-for="s in seasonsList"
                                    :key="s.id"
                                    :value="s.id"
                                >
                                    {{ s.label }}
                                </option>
                            </select>
                            <span class="season-switcher__chevron" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <!-- Premium Dub / Sub Switcher styled exactly as standard components -->
                    <div v-if="availableServers[activeServerIndex]?.name !== 'Videasy'" class="language-switcher">
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

                    <!-- Server Room Accordion used identically to Movie/Show pages -->
                    <ServerAccordion
                        :servers="availableServers"
                        :active-server-index="activeServerIndex"
                        @server-change="activeServerIndex = $event"
                    />
                </div>
            </div>

            <!-- Highly Optimized Paginated Square Grid Episode Navigator with Search filter -->
            <section v-if="anime" class="watch-stage__rack">
                <div class="episode-navigator">
                    <header class="episode-navigator__head">
                        <div class="episode-navigator__heading">
                            <p class="eyebrow">Reel order</p>
                            <h3 class="episode-navigator__title">
                                Episodes
                                <span class="meta episode-navigator__count">
                                    · {{ totalEpisodes }} episodes
                                </span>
                            </h3>
                        </div>

                        <!-- Find Episode and Range controls -->
                        <div class="episode-navigator__actions-row">
                            <!-- Direct Search Input -->
                            <div class="episode-search-bar">
                                <span class="search-hash">#</span>
                                <input
                                    type="text"
                                    placeholder="Find EP..."
                                    v-model="searchQuery"
                                    class="episode-search-input"
                                />
                            </div>

                            <!-- Range Stepper (Hidden if searching) -->
                            <div v-if="!searchQuery && ranges.length > 1" class="episode-navigator__controls" role="group" aria-label="Episode range selector">
                                <button
                                    type="button"
                                    class="episode-navigator__nav"
                                    :disabled="activeRangeIndex <= 0"
                                    aria-label="Previous episode range"
                                    @click="activeRangeIndex--"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width: 16px; height: 16px;">
                                        <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </button>
                                <span class="episode-navigator__current" aria-live="polite">
                                    {{ ranges[activeRangeIndex]?.label }}
                                </span>
                                <button
                                    type="button"
                                    class="episode-navigator__nav"
                                    :disabled="activeRangeIndex >= ranges.length - 1"
                                    aria-label="Next episode range"
                                    @click="activeRangeIndex++"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width: 16px; height: 16px;">
                                        <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </header>

                    <!-- paginated grid of episodes matching reference design -->
                    <div class="episode-grid-container">
                        <div v-if="displayedEpisodes.length === 0" class="no-results meta">
                            No matching episodes found.
                        </div>
                        <div v-else class="episode-squares-grid">
                            <button
                                v-for="ep in displayedEpisodes"
                                :key="ep"
                                type="button"
                                class="ep-square"
                                :class="{ 
                                    'is-active': ep === currentEpisode,
                                    'has-progress': animeProgress(ep) > 0
                                }"
                                :title="`Episode ${ep}`"
                                @click="goToEpisode(ep)"
                            >
                                <span class="ep-square__number">{{ ep }}</span>
                                <div
                                    v-if="animeProgress(ep) > 0"
                                    class="ep-square__progress-dot"
                                    :style="{ opacity: ep === currentEpisode ? 0.9 : 0.6 }"
                                />
                            </button>
                        </div>
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
                Streams are mirrored from third-party providers. moovie does not host video files.
            </p>
        </main>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAniList } from '../composables/useAniList';
import { saveProgress, getProgressPercent } from '../composables/useProgress';
import { addViewedItem } from '../composables/useHistory';
import { Server } from '../composables/useStream';
import StreamFrame from '../components/player/StreamFrame.vue';
import ServerAccordion from '../components/player/ServerAccordion.vue';
import ArrowLeft from '../components/svg/outline/arrow-left-long.vue';
import { useAppPaths } from '../composables/useAppPaths';

export default defineComponent({
    name: 'StreamAnime',
    components: {
        ArrowLeft,
        ServerAccordion,
        StreamFrame
    },
    setup() {
        const route = useRoute();
        const router = useRouter();
        const paths = useAppPaths();
        const { fetchAnimeById } = useAniList();

        const animeId = ref<number>(Number(route.params.id));
        const anime = ref<any | null>(null);
        const currentEpisode = ref<number>(1);
        const activeServerIndex = ref<number>(0);
        const activeLanguage = ref<'sub' | 'dub'>('sub');
        const activeRangeIndex = ref<number>(0);
        const searchQuery = ref<string>('');

        const availableServers: Server[] = [
            { name: 'AnimePlay CFD', urlTemplate: 'https://animeplay.cfd/stream/ani/{id}/{episode}/{lang}' },
            { name: 'MegaPlay', urlTemplate: 'https://megaplay.buzz/stream/ani/{id}/{episode}/{lang}' },
            { name: 'Videasy', urlTemplate: 'https://player.videasy.net/anime/{id}/{episode}?color=E05A47&autoplayNextEpisode=true&overlay=true' }
        ];

        const animeTitle = computed(() => {
            if (!anime.value) return '';
            return anime.value.title.english || anime.value.title.romaji || anime.value.title.native;
        });

        const totalEpisodes = computed(() => {
            if (!anime.value) return 1;
            if (anime.value.episodes) return anime.value.episodes;
            if (anime.value.nextAiringEpisode?.episode) {
                return anime.value.nextAiringEpisode.episode - 1;
            }
            if (anime.value.status === 'RELEASING') {
                return Math.max(1200, currentEpisode.value + 50);
            }
            return 12;
        });

        const ranges = computed(() => {
            const list = [];
            const step = 100;
            const total = totalEpisodes.value;
            for (let i = 1; i <= total; i += step) {
                const end = Math.min(i + step - 1, total);
                list.push({
                    start: i,
                    end: end,
                    label: `${String(i).padStart(3, '0')}-${String(end).padStart(3, '0')}`
                });
            }
            return list;
        });

        // Watch currentEpisode to automatically set the range page index
        watch(
            [currentEpisode, ranges],
            ([ep, rgs]) => {
                if (rgs && rgs.length > 0) {
                    const idx = rgs.findIndex((r: any) => ep >= r.start && ep <= r.end);
                    if (idx !== -1) {
                        activeRangeIndex.value = idx;
                    }
                }
            },
            { immediate: true }
        );

        const displayedEpisodes = computed(() => {
            if (searchQuery.value) {
                const cleanQuery = searchQuery.value.trim();
                const matched: number[] = [];
                const total = totalEpisodes.value;
                for (let ep = 1; ep <= total; ep++) {
                    if (String(ep).includes(cleanQuery)) {
                        matched.push(ep);
                    }
                }
                return matched.slice(0, 100); // cap results
            }

            const range = ranges.value[activeRangeIndex.value];
            if (!range) return [];
            const eps = [];
            for (let ep = range.start; ep <= range.end; ep++) {
                eps.push(ep);
            }
            return eps;
        });

        const currentEmbedUrl = computed(() => {
            const server = availableServers[activeServerIndex.value];
            const malId = anime.value?.idMal ? String(anime.value.idMal) : String(animeId.value);
            
            let template = server.urlTemplate;
            if (server.name === 'Videasy') {
                const isMovie = anime.value?.format === 'MOVIE' || totalEpisodes.value === 1;
                template = isMovie
                    ? 'https://player.videasy.net/anime/{id}?color=E05A47&autoplayNextEpisode=true&overlay=true'
                    : 'https://player.videasy.net/anime/{id}/{episode}?color=E05A47&autoplayNextEpisode=true&overlay=true';
            }

            return template
                .replace('{id}', String(animeId.value))
                .replace('{malId}', malId)
                .replace('{episode}', String(currentEpisode.value))
                .replace('{lang}', activeLanguage.value);
        });

        const partyHref = computed(() => {
            const titleStr = `${animeTitle.value} - Episode ${currentEpisode.value}`;
            return `/party/?room=anime_${animeId.value}_ep${currentEpisode.value}&title=${encodeURIComponent(titleStr)}`;
        });

        const seasonsList = computed(() => {
            if (!anime.value) return [];
            const list = [];
            
            list.push({
                id: anime.value.id,
                title: anime.value.title.english || anime.value.title.romaji || anime.value.title.native,
                year: anime.value.seasonYear || 0
            });
            
            const edges = anime.value.relations?.edges || [];
            for (const edge of edges) {
                const node = edge.node;
                if (node.type === 'ANIME' && (edge.relationType === 'PREQUEL' || edge.relationType === 'SEQUEL')) {
                    // Exclude non-serial formats and one-shot specials (like "Monsters" which has 1 episode)
                    if (node.format === 'MOVIE' || node.format === 'SPECIAL' || node.format === 'MUSIC') {
                        continue;
                    }
                    if (node.episodes !== undefined && node.episodes !== null && node.episodes <= 2) {
                        continue;
                    }
                    list.push({
                        id: node.id,
                        title: node.title.english || node.title.romaji || node.title.native,
                        year: node.seasonYear || 0
                    });
                }
            }
            
            // Deduplicate
            const unique = list.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            
            // Sort chronologically
            unique.sort((a, b) => a.year - b.year);
            
            // Generate friendly season labels
            return unique.map((item, idx) => {
                let label = `Season ${idx + 1}`;
                
                const name = item.title;
                const lowerName = name.toLowerCase();
                if (lowerName.includes('entertainment district')) {
                    label = `Season ${idx + 1} (Entertainment District)`;
                } else if (lowerName.includes('swordsmith village')) {
                    label = `Season ${idx + 1} (Swordsmith Village)`;
                } else if (lowerName.includes('hashira training')) {
                    label = `Season ${idx + 1} (Hashira Training)`;
                } else if (lowerName.includes('mugen train')) {
                    label = `Season ${idx + 1} (Mugen Train)`;
                } else if (lowerName.includes('final season')) {
                    label = `Final Season`;
                }
                
                return {
                    id: item.id,
                    label: label
                };
            });
        });

        const goToSeason = (id: number) => {
            if (id !== animeId.value) {
                router.push(paths.streamAnime(id, 1));
            }
        };

        const animeProgress = (epNumber: number) => {
            return getProgressPercent(animeId.value, 'anime', 1, epNumber) / 100;
        };

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
            router.push(paths.anime(animeId.value));
        };

        const goToEpisode = (ep: number) => {
            if (ep >= 1 && ep <= totalEpisodes.value) {
                currentEpisode.value = ep;
                router.push(paths.streamAnime(animeId.value, ep));
            }
        };

        // Keyboard navigation for step increment
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            // Only change episode with Ctrl+Arrow, let plain arrows seek in video
            if (e.key === 'ArrowLeft' && e.ctrlKey) {
                e.preventDefault();
                if (currentEpisode.value > 1) {
                    goToEpisode(currentEpisode.value - 1);
                }
            } else if (e.key === 'ArrowRight' && e.ctrlKey) {
                e.preventDefault();
                if (currentEpisode.value < totalEpisodes.value) {
                    goToEpisode(currentEpisode.value + 1);
                }
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

            // Handle Videasy progress tracking
            if (data.timestamp !== undefined && data.duration !== undefined) {
                saveProgress(animeId.value, 'anime', Number(data.timestamp), Number(data.duration), undefined, currentEpisode.value);
            }

            // Sync current episode from player if it auto-advances
            if (data.episode !== undefined && Number(data.episode) !== currentEpisode.value) {
                goToEpisode(Number(data.episode));
            }

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
            window.addEventListener('keydown', handleKeyDown);
        });

        onUnmounted(() => {
            window.removeEventListener('message', handlePlayerMessage);
            window.removeEventListener('keydown', handleKeyDown);
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
            seasonsList,
            goToSeason,
            activeLanguage,
            animeProgress,
            ranges,
            activeRangeIndex,
            searchQuery,
            displayedEpisodes,
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

        @media (max-width: 1023px) {
            display: flex;
            flex-direction: column;
            gap: var(--s-4);
            padding: var(--s-3);
            height: auto;
            min-height: 0;
        }

        @media (min-width: 1024px) {
            scroll-snap-align: start;
            scroll-snap-stop: always;
            height: 100dvh;
            padding: 72px var(--s-5) var(--s-4) var(--s-5);
            grid-template-columns: 1fr 380px;
            align-items: stretch;
        }
    }

    &__player-container {
        min-width: 0;
        flex-shrink: 0;
        background: #000;
        border-radius: var(--r-md);
        overflow: hidden;
        border: 1px solid var(--rule);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);

        @media (max-width: 1023px) {
            width: 100%;

            :deep(.stream-frame__stage) {
                padding: 0;
            }

            :deep(.stream-frame__player) {
                border-radius: var(--r-md);
            }
        }

        @media (min-width: 1024px) {
            :deep(.stream-frame__stage) {
                padding: 0;
            }
        }
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
        min-width: 0;
        flex-shrink: 0;

        @media (max-width: 1023px) {
            padding: 0;
            width: 100%;
        }

        @media (min-width: 1024px) {
            position: relative;
            align-self: stretch;
        }
    }

    &__rack {
        background: var(--ink-800);
        border: 1px solid var(--rule);
        border-radius: var(--r-lg);
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
    background: var(--ink-800);
    border: 1px solid var(--rule);
    border-radius: var(--r-lg);
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

.episode-navigator {
    background: var(--ink-800);
    border-radius: var(--r-lg);
    box-shadow: inset 0 0 0 1px var(--rule);
    padding: var(--s-5) var(--s-5);
    display: grid;
    gap: var(--s-5);

    @media (min-width: 768px) {
        padding: var(--s-6);
    }

    &__head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--s-4);
    }

    &__heading {
        display: grid;
        gap: 0.15rem;
    }

    &__title {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 500;
        font-size: var(--fs-2xl);
        letter-spacing: var(--ls-tight);
        color: var(--bone-50);
    }

    &__count {
        color: var(--bone-400);
    }

    &__actions-row {
        display: flex;
        align-items: center;
        gap: var(--s-3);
        flex-wrap: wrap;
    }

    &__controls {
        display: inline-flex;
        align-items: center;
        gap: var(--s-2);
        background: var(--ink-700);
        padding: var(--s-1);
        border-radius: var(--r-pill);
        box-shadow: inset 0 0 0 1px var(--rule);
    }

    &__nav {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        color: var(--bone-100);
        transition: background-color var(--dur-fast) var(--ease-out);

        &:hover:not(:disabled) {
            background: var(--ember);
            color: var(--ink-900);
        }

        &:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }

        svg {
            width: 16px;
            height: 16px;
        }
    }

    &__current {
        font-family: var(--font-mono);
        font-size: var(--fs-sm);
        color: var(--bone-50);
        padding: 0 var(--s-3);
    }
}

.episode-search-bar {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    background: var(--ink-700);
    padding: 0.4rem 0.8rem;
    border-radius: var(--r-md);
    box-shadow: inset 0 0 0 1px var(--rule);
    max-width: 160px;

    .search-hash {
        color: var(--ember);
        font-family: var(--font-mono);
        font-weight: bold;
        font-size: var(--fs-base);
    }

    .episode-search-input {
        background: transparent;
        border: none;
        color: var(--bone-50);
        font-family: var(--font-ui);
        font-size: var(--fs-sm);
        width: 100%;
        outline: none;

        &::placeholder {
            color: var(--bone-500);
        }
    }
}

.episode-grid-container {
    margin-top: var(--s-2);
}

.episode-squares-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: var(--s-2);
    max-height: 480px;
    overflow-y: auto;
    padding-right: 4px;

    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--rule-strong);
        border-radius: var(--r-pill);
    }
}

.ep-square {
    all: unset;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ink-700);
    border-radius: var(--r-sm);
    box-shadow: inset 0 0 0 1px var(--rule);
    cursor: pointer;
    position: relative;
    box-sizing: border-box;
    transition: all var(--dur-fast) var(--ease-out);

    &__number {
        font-family: var(--font-mono);
        font-size: var(--fs-base);
        font-weight: 500;
        color: var(--bone-200);
    }

    &:hover:not(.is-active) {
        background: var(--ink-600);
        box-shadow: inset 0 0 0 1px var(--rule-strong);
        transform: scale(1.05);

        .ep-square__number {
            color: var(--bone-50);
        }
    }

    &.is-active {
        background: var(--ember);
        box-shadow: 0 0 12px var(--ember-glow);
        transform: scale(1.05);

        .ep-square__number {
            color: var(--ink-950);
            font-weight: 700;
        }
    }

    &__progress-dot {
        position: absolute;
        bottom: 6px;
        right: 6px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ember);
        box-shadow: 0 0 6px var(--ember-glow);
    }
}

.no-results {
    text-align: center;
    padding: var(--s-5);
    color: var(--bone-400);
}

.season-switcher {
    background: var(--ink-800);
    border: 1px solid var(--rule);
    border-radius: var(--r-lg);
    padding: var(--s-4);
    display: flex;
    flex-direction: column;
    gap: var(--s-3);

    &__header {
        margin: 0;
    }

    &__select-wrapper {
        position: relative;
        width: 100%;
    }

    &__select {
        width: 100%;
        padding: 0.6rem 2.5rem 0.6rem 1rem;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid var(--rule);
        border-radius: var(--r-sm);
        color: var(--bone-50);
        font-family: var(--font-ui);
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        appearance: none;
        outline: none;
        transition: border-color var(--dur-fast), box-shadow var(--dur-fast);

        &:hover, &:focus {
            border-color: var(--ember);
        }
    }

    &__chevron {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: var(--bone-400);
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
            width: 16px;
            height: 16px;
        }
    }
}
</style>
