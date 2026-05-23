<template>
    <MobileShell>
        <div v-if="movie" class="m-detail">
            <TitleMasthead
                :id="movie.id"
                type="movie"
                :title="movie.title"
                :tagline="movie.tagline"
                :eyebrow="mastheadEyebrow"
                :backdrop-path="movie.backdrop_path"
                :poster-path="movie.poster_path"
                :rating="movie.vote_average"
                :release-date="movie.release_date"
                :genres="genreNames"
                :genre-ids="genreIds"
                :adult="movie.adult"
                :play-route="playRoute"
                :play-label="playLabel"
                :show-trailer="hasTrailer"
                @trailer="trailerOpen = true"
            />

            <section class="m-detail__section container-lm">
                <DropCapSynopsis :body="movie.overview" eyebrow="Synopsis" />
            </section>

            <section v-if="cast.length" class="m-detail__section container-lm">
                <CastGrid :casts="cast" title="Cast" :limit="8" />
            </section>

            <section v-if="similarItems.length" class="m-detail__section">
                <MobileSection title="Similar" eyebrow="You may also like">
                    <MobileMediaGrid :items="similarItems" />
                </MobileSection>
            </section>
        </div>

        <div v-else class="m-detail__loading" role="status">
            <div class="m-discover__spinner" aria-hidden="true" />
        </div>

        <TrailerDialog
            v-model="trailerOpen"
            :videos="trailers"
            :title="movie?.title || 'Trailers'"
        />
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MobileShell from '../layout/MobileShell.vue';
import MobileSection from '../components/MobileSection.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import TitleMasthead from '../../components/detail/TitleMasthead.vue';
import DropCapSynopsis from '../../components/detail/DropCapSynopsis.vue';
import CastGrid from '../../components/detail/CastGrid.vue';
import TrailerDialog from '../../components/detail/TrailerDialog.vue';
import { useMovies, MovieDetails, Cast } from '../../composables/useMovies';
import { fetchTrailerVideos, type TrailerVideo } from '../../composables/useTrailer';
import { getLastWatchedMetaData } from '../../composables/useStream';
import { primeGenres } from '../../composables/useGenreLookup';
import { useAppPaths } from '../../composables/useAppPaths';

const route = useRoute();
const paths = useAppPaths();
const { fetchMovie, fetchMovieCredits, fetchSimilarMovies } = useMovies();

const movie = ref<MovieDetails | null>(null);
const cast = ref<Cast[]>([]);
const similar = ref<Array<{ id: number; title: string; poster_path: string | null; vote_average: number; release_date: string; genre_ids: number[]; adult: boolean }>>([]);
const trailerOpen = ref(false);
const trailers = ref<TrailerVideo[]>([]);

const genreNames = computed(() => (movie.value?.genres ?? []).map(g => g.name));
const genreIds = computed(() => (movie.value?.genres ?? []).map(g => g.id));
const mastheadEyebrow = computed(() => genreNames.value[0] ? `${genreNames.value[0]} · Feature` : 'Feature');
const hasTrailer = computed(() => trailers.value.length > 0);

const playRoute = computed(() => paths.streamMovie(String(route.params.id)));
const playLabel = computed(() =>
    getLastWatchedMetaData(String(route.params.id)) ? 'Resume' : 'Play'
);

const similarItems = computed(() =>
    similar.value.slice(0, 12).map(m => ({
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

async function load(id: string) {
    const [{ data: movieData }, { data: creditsData }, { data: similarData }] = await Promise.all([
        fetchMovie(id),
        fetchMovieCredits(id),
        fetchSimilarMovies(id)
    ]);
    movie.value = movieData.value ?? null;
    cast.value = creditsData.value?.cast ?? [];
    similar.value = (similarData.value?.results ?? []) as typeof similar.value;
    trailers.value = await fetchTrailerVideos(id, 'movie');
    document.title = movie.value?.title ? `${movie.value.title} — Moovie` : 'Movie — Moovie';
}

watch(
    () => route.params.id,
    id => {
        if (typeof id === 'string') load(id);
    }
);

onMounted(async () => {
    primeGenres();
    const id = String(route.params.id);
    await load(id);
});
</script>

<style lang="scss" scoped>
.m-detail {
    padding-bottom: var(--s-6);

    &__section {
        margin-top: var(--s-5);
    }

    &__loading {
        display: flex;
        justify-content: center;
        padding: var(--s-10);
    }
}
</style>
