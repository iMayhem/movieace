<template>
    <div class="anime-detail">
        <SiteHeader />

        <main v-if="anime" id="main" class="anime-detail__main" role="main">
            <section class="anime-detail__snap-slide">
                <TitleMasthead
                    :id="anime.id"
                    type="anime"
                    :title="anime.title.english || anime.title.romaji || anime.title.native"
                    :tagline="anime.title.native"
                    :eyebrow="mastheadEyebrow"
                    :backdrop-path="anime.bannerImage || anime.coverImage.large"
                    :poster-path="anime.coverImage.large"
                    :rating="anime.averageScore ? anime.averageScore / 10 : 0"
                    :release-date="String(anime.seasonYear || '')"
                    :genres="anime.genres"
                    :adult="false"
                    :play-route="playRoute"
                    play-label="Play"
                    :show-trailer="false"
                />
            </section>

            <section class="anime-detail__section anime-detail__snap-slide container-lm anime-detail__opening">
                <MetaBar :items="metaItems" aria-label="Anime metadata" />

                <div class="anime-detail__columns">
                    <div class="anime-detail__col--main">
                        <DropCapSynopsis
                            :body="cleanDescription"
                            eyebrow="The Synopsis"
                        />
                    </div>

                    <div class="anime-detail__col--side">
                        <StatsBlock
                            v-if="statsItems.length"
                            :stats="statsItems"
                            title="By the numbers"
                            eyebrow="Ledger"
                        />
                    </div>
                </div>
            </section>

            <section v-if="episodesList.length" class="anime-detail__section anime-detail__snap-slide container-lm">
                <div class="episode-guide">
                    <p class="eyebrow">The Schedule</p>
                    <h3 class="episode-guide__title display">Episode guide</h3>
                    <p class="episode-guide__desc">Every installment, in running order.</p>

                    <div class="episode-guide__grid">
                        <router-link
                            v-for="ep in episodesList"
                            :key="ep"
                            :to="`/stream/anime/${anime.id}/episode/${ep}`"
                            class="episode-card"
                        >
                            <div class="episode-card__image-container">
                                <img :src="getEpisodeStill(ep)" class="episode-card__image" alt="Episode Cover" loading="lazy" />
                                <div class="episode-card__play">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="episode-card__meta">
                                <h4 class="episode-card__title">Episode {{ ep }} · {{ getEpisodeTitle(ep) }}</h4>
                                <p class="episode-card__subtitle">{{ truncate(getEpisodeOverview(ep), 90) }}</p>
                            </div>
                        </router-link>
                    </div>
                </div>
            </section>
        </main>

        <div v-else-if="loading" class="anime-detail__loading" role="status">
            <div class="anime-detail__spinner" aria-hidden="true" />
            <span class="meta">Loading anime details…</span>
        </div>

        <div v-else class="anime-detail__loading">
            <span class="meta">Could not load anime details.</span>
        </div>

        <SiteFooter />
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import SiteHeader from '../components/navigation/SiteHeader.vue';
import SiteFooter from '../components/navigation/SiteFooter.vue';
import TitleMasthead from '../components/detail/TitleMasthead.vue';
import MetaBar, { MetaEntry } from '../components/detail/MetaBar.vue';
import DropCapSynopsis from '../components/detail/DropCapSynopsis.vue';
import StatsBlock, { StatEntry } from '../components/detail/StatsBlock.vue';
import { useAniList } from '../composables/useAniList';
import { addViewedItem } from '../composables/useHistory';
import useAxios from '../composables/useAxios';

export default defineComponent({
    name: 'AnimeDetail',
    components: {
        SiteHeader,
        SiteFooter,
        TitleMasthead,
        MetaBar,
        DropCapSynopsis,
        StatsBlock
    },
    setup() {
        const route = useRoute();
        const { fetchAnimeById } = useAniList();

        const anime = ref<any | null>(null);
        const loading = ref(true);

        const cleanDescription = computed(() => {
            if (!anime.value?.description) return '';
            // Remove HTML tags often returned in AniList descriptions
            return anime.value.description.replace(/<[^>]*>/g, '');
        });

        const mastheadEyebrow = computed(() => {
            const format = anime.value?.format ? ` · ${anime.value.format}` : '';
            return `Anime${format}`;
        });

        const studiosLabel = computed(() => {
            const list = anime.value?.studios?.nodes ?? [];
            if (!list.length) return '';
            return list.map((s: any) => s.name).slice(0, 2).join(', ');
        });

        const metaItems = computed<MetaEntry[]>(() => {
            if (!anime.value) return [];
            
            const start = anime.value.startDate;
            const premiered = start && start.year 
                ? `${start.month || 1}/${start.day || 1}/${start.year}` 
                : String(anime.value.seasonYear || '');

            return [
                { label: 'Premiered', value: premiered },
                { label: 'Format', value: anime.value.format || 'TV' },
                { label: 'Studio', value: studiosLabel.value || 'N/A' },
                { label: 'Status', value: anime.value.status || 'FINISHED' },
                { label: 'Genres', value: anime.value.genres?.slice(0, 3).join(', ') || '' }
            ];
        });

        const statsItems = computed<StatEntry[]>(() => {
            if (!anime.value) return [];
            return [
                { label: 'Episodes', value: anime.value.episodes || '1' },
                { label: 'Score', value: anime.value.averageScore ? `${anime.value.averageScore}%` : 'N/A' },
                { label: 'Year', value: String(anime.value.seasonYear || '') }
            ];
        });

        const episodesList = computed(() => {
            const count = anime.value?.episodes || 1;
            return Array.from({ length: count }, (_, i) => i + 1);
        });

        const playRoute = computed(() => {
            return `/stream/anime/${anime.value?.id}/episode/1`;
        });

        const tmdbEpisodes = ref<any[]>([]);

        const loadTmdbEpisodes = async (englishTitle: string, romajiTitle: string, year?: number) => {
            tmdbEpisodes.value = [];
            try {
                let show = null;
                const yearParam = year ? `&first_air_date_year=${year}` : '';
                
                // Try English Title first
                if (englishTitle) {
                    const searchRes = await useAxios().get(
                        `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(englishTitle)}${yearParam}`
                    );
                    show = searchRes?.data?.results?.[0];
                }
                
                // Fallback to Romaji Title
                if (!show && romajiTitle) {
                    const searchRes = await useAxios().get(
                        `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(romajiTitle)}${yearParam}`
                    );
                    show = searchRes?.data?.results?.[0];
                }
                
                if (show) {
                    const seasonRes = await useAxios().get(
                        `https://api.themoviedb.org/3/tv/${show.id}/season/1`
                    );
                    if (seasonRes?.data?.episodes) {
                        tmdbEpisodes.value = seasonRes.data.episodes;
                    }
                }
            } catch (err) {
                console.warn('Failed to load TMDb episode metadata:', err);
            }
        };

        const getEpisodeStill = (epNum: number) => {
            const match = tmdbEpisodes.value.find(e => e.episode_number === epNum);
            if (match && match.still_path) {
                return `https://image.tmdb.org/t/p/w500${match.still_path}`;
            }
            return anime.value?.bannerImage || anime.value?.coverImage?.large;
        };

        const getEpisodeTitle = (epNum: number) => {
            const match = tmdbEpisodes.value.find(e => e.episode_number === epNum);
            if (match && match.name) {
                return match.name;
            }
            return `Episode ${epNum}`;
        };

        const getEpisodeOverview = (epNum: number) => {
            const match = tmdbEpisodes.value.find(e => e.episode_number === epNum);
            if (match && match.overview) {
                return match.overview;
            }
            return 'Sub/Dub available';
        };

        const truncate = (text: string, max: number = 80) => {
            if (!text) return '';
            if (text.length <= max) return text;
            return text.substring(0, max) + '...';
        };

        const loadAnime = async (id: number) => {
            loading.value = true;
            anime.value = null;

            try {
                const response = await fetchAnimeById(id);
                anime.value = response?.data?.Media ?? null;

                if (anime.value) {
                    const title = anime.value.title.english || anime.value.title.romaji || anime.value.title.native;
                    document.title = `${title} — Movieace`;
                    
                    addViewedItem({
                        id: anime.value.id,
                        title: title,
                        image: anime.value.coverImage.large,
                        rating: anime.value.averageScore ? anime.value.averageScore / 10 : 0,
                        categories: [],
                        adult: false,
                        type: 'anime'
                    });

                    // Trigger TMDb mapping matching
                    loadTmdbEpisodes(
                        anime.value.title.english,
                        anime.value.title.romaji,
                        anime.value.seasonYear
                    );
                }
            } catch (err) {
                console.error('Failed to load anime:', err);
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => {
            if (route.params.id) {
                loadAnime(Number(route.params.id));
            }
        });

        watch(
            () => route.params.id,
            newId => {
                if (newId && route.name === 'AnimeDetail') {
                    loadAnime(Number(newId));
                }
            }
        );

        return {
            anime,
            loading,
            cleanDescription,
            mastheadEyebrow,
            metaItems,
            statsItems,
            episodesList,
            playRoute,
            getEpisodeStill,
            getEpisodeTitle,
            getEpisodeOverview,
            truncate
        };
    }
});
</script>

<style lang="scss" scoped>
.anime-detail {
    position: relative;
    min-height: 100dvh;
    background: var(--ink-900);
    color: var(--bone-50);

    height: 100dvh;
    overflow-y: scroll;
    scroll-snap-type: y proximity;
    scroll-behavior: smooth;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    &__main {
        position: relative;
    }

    &__snap-slide {
        scroll-snap-align: start;
        scroll-snap-stop: normal;
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;

        &.anime-detail__opening {
            justify-content: flex-start;
            padding-top: clamp(var(--s-8), 8vh, var(--s-10));
            padding-bottom: clamp(var(--s-8), 8vh, var(--s-10));
        }
    }

    &__section {
        &:last-of-type {
            margin-bottom: 0;
        }
    }

    &__opening {
        display: grid;
        gap: clamp(var(--s-6), 6vw, var(--s-8));
    }

    &__columns {
        display: grid;
        gap: clamp(var(--s-6), 5vw, var(--s-8));
        grid-template-columns: minmax(0, 1fr);

        @media (min-width: 960px) {
            grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
            align-items: start;
        }
    }

    &__col--main,
    &__col--side {
        min-width: 0;
    }

    &__loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--s-3);
        min-height: 60vh;
        color: var(--bone-300);
    }

    &__spinner {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--rule-strong);
        border-top-color: var(--ember);
        animation: anime-spin 0.8s linear infinite;
    }
}

@keyframes anime-spin {
    to { transform: rotate(360deg); }
}

.episode-guide {
    padding-top: var(--s-6);
    padding-bottom: var(--s-10);

    &__title {
        margin-top: var(--s-1);
        margin-bottom: var(--s-2);
        color: var(--bone-50);
    }

    &__desc {
        color: var(--bone-400);
        margin-bottom: var(--s-6);
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--s-4);
    }
}

.episode-card {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    border-radius: var(--r-md);
    overflow: hidden;
    background: var(--ink-800);
    border: 1px solid var(--rule);
    transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);

    &:hover {
        transform: translateY(-4px);
        border-color: var(--ember);
    }

    &__image-container {
        position: relative;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: var(--ink-950);
    }

    &__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    &__play {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(11, 10, 8, 0.4);
        opacity: 0;
        transition: opacity var(--dur-fast) var(--ease-out);

        svg {
            width: 32px;
            height: 32px;
            color: var(--ember);
        }
    }

    &:hover &__play {
        opacity: 1;
    }

    &__meta {
        padding: var(--s-3);
    }

    &__title {
        font-family: var(--font-ui);
        font-weight: 600;
        margin: 0;
        font-size: var(--fs-sm);
        color: var(--bone-100);
    }

    &__subtitle {
        font-size: var(--fs-xs);
        color: var(--bone-450);
        margin-top: var(--s-1);
        margin-bottom: 0;
    }
}
</style>
