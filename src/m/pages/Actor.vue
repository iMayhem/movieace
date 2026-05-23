<template>
    <MobileShell>
        <div v-if="actor" class="m-actor">
            <div class="m-actor__hero">
                <img
                    v-if="profileUrl"
                    :src="profileUrl"
                    :alt="actor.name"
                    class="m-actor__photo"
                />
                <div v-else class="m-actor__placeholder">{{ initials }}</div>
                <h1 class="m-actor__name">{{ actor.name }}</h1>
                <p v-if="actor.known_for_department" class="meta">{{ actor.known_for_department }}</p>
            </div>

            <p v-if="actor.biography" class="m-actor__bio">{{ shortBio }}</p>

            <MobileSection v-if="credits.length" title="Known for" eyebrow="Credits">
                <MobileMediaGrid :items="creditItems" />
            </MobileSection>
        </div>

        <div v-else class="m-detail__loading">
            <div class="m-discover__spinner" aria-hidden="true" />
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import MobileShell from '../layout/MobileShell.vue';
import MobileSection from '../components/MobileSection.vue';
import MobileMediaGrid from '../components/MobileMediaGrid.vue';
import { useActor, ActorDetails } from '../../composables/useActor';
import { useWebImage } from '../../utils/useWebImage';

const route = useRoute();
const { fetchActorDetails, fetchCombinedCredits } = useActor();
const actor = ref<ActorDetails | null>(null);
const credits = ref<Array<{ id: number; title?: string; name?: string; poster_path?: string | null; media_type: string; vote_average?: number }>>([]);

const profileUrl = computed(() =>
    actor.value?.profile_path ? useWebImage(actor.value.profile_path, 'medium') : ''
);

const initials = computed(() =>
    actor.value?.name
        ?.split(/\s+/)
        .map(n => n[0])
        .join('')
        .slice(0, 2) ?? '?'
);

const shortBio = computed(() => {
    const bio = actor.value?.biography ?? '';
    return bio.length > 480 ? `${bio.slice(0, 477).trim()}…` : bio;
});

const creditItems = computed(() =>
    credits.value.slice(0, 12).map(item => ({
        id: item.id,
        title: item.title || item.name || '',
        posterPath: item.poster_path,
        rating: item.vote_average ?? 0,
        type: (item.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv'
    }))
);

onMounted(async () => {
    const id = Number(route.params.id);
    const [{ data: actorData }, { data: creditsData }] = await Promise.all([
        fetchActorDetails(id),
        fetchCombinedCredits(id)
    ]);
    actor.value = actorData.value ?? null;
    const cast = creditsData.value?.cast ?? [];
    credits.value = cast.map((c: { id: number; title?: string; name?: string; poster_path?: string | null; media_type?: string; vote_average?: number }) => ({
        id: c.id,
        title: c.title,
        name: c.name,
        poster_path: c.poster_path,
        media_type: c.media_type || 'movie',
        vote_average: c.vote_average
    }));
    document.title = actor.value?.name ? `${actor.value.name} — Moovie` : 'Actor — Moovie';
});
</script>

<style lang="scss" scoped>
.m-actor {
    padding-bottom: var(--s-6);

    &__hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: var(--s-5) var(--s-4) var(--s-4);
    }

    &__photo,
    &__placeholder {
        width: 7rem;
        height: 7rem;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: var(--s-3);
    }

    &__placeholder {
        display: grid;
        place-items: center;
        background: var(--ink-700);
        font-family: var(--font-display);
        font-size: 1.5rem;
    }

    &__name {
        font-family: var(--font-display);
        font-size: 1.5rem;
        margin: 0 0 var(--s-1);
    }

    &__bio {
        padding: 0 var(--s-4) var(--s-4);
        color: var(--bone-300);
        line-height: var(--lh-base);
        font-size: var(--fs-sm);
    }
}

.m-detail__loading {
    display: flex;
    justify-content: center;
    padding: var(--s-10);
}
</style>
