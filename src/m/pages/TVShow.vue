<template>
    <MobileShell>
        <div v-if="show" class="m-detail">
            <TitleMasthead
                :id="show.id"
                type="tv"
                :title="show.name"
                :tagline="show.tagline"
                :eyebrow="mastheadEyebrow"
                :backdrop-path="show.backdrop_path"
                :poster-path="show.poster_path"
                :rating="show.vote_average"
                :release-date="show.first_air_date"
                :genres="genreNames"
                :genre-ids="genreIds"
                :adult="false"
                :play-route="playRoute"
                play-label="Play"
            />

            <section class="m-detail__section container-lm">
                <DropCapSynopsis :body="show.overview" eyebrow="Synopsis" />
            </section>

            <section v-if="cast.length" class="m-detail__section container-lm">
                <CastGrid :casts="cast" title="Cast" :limit="8" />
            </section>
        </div>

        <div v-else class="m-detail__loading">
            <div class="m-discover__spinner" aria-hidden="true" />
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MobileShell from '../layout/MobileShell.vue';
import TitleMasthead from '../../components/detail/TitleMasthead.vue';
import DropCapSynopsis from '../../components/detail/DropCapSynopsis.vue';
import CastGrid from '../../components/detail/CastGrid.vue';
import { useTvShows, TVShowDetails } from '../../composables/useTvShows';
import { Cast } from '../../composables/useMovies';
import { primeGenres } from '../../composables/useGenreLookup';
import { useAppPaths } from '../../composables/useAppPaths';

const route = useRoute();
const paths = useAppPaths();
const { fetchTvShow, fetchTvShowCredit } = useTvShows();

const show = ref<TVShowDetails | null>(null);
const cast = ref<Cast[]>([]);

const genreNames = computed(() => (show.value?.genres ?? []).map(g => g.name));
const genreIds = computed(() => (show.value?.genres ?? []).map(g => g.id));
const mastheadEyebrow = computed(() => genreNames.value[0] ? `${genreNames.value[0]} · Series` : 'Series');

const playRoute = computed(() => {
    const season = show.value?.seasons?.find(s => s.season_number === 1)?.season_number ?? 1;
    return paths.streamTvShow(String(route.params.id), season, 1);
});

async function load(id: string) {
    const [{ data: showData }, { data: creditsData }] = await Promise.all([
        fetchTvShow(id),
        fetchTvShowCredit(id)
    ]);
    show.value = showData.value ?? null;
    cast.value = creditsData.value?.cast ?? [];
    document.title = show.value?.name ? `${show.value.name} — Moovie` : 'TV Show — Moovie';
}

watch(
    () => route.params.id,
    id => {
        if (typeof id === 'string') load(id);
    }
);

onMounted(async () => {
    primeGenres();
    await load(String(route.params.id));
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
