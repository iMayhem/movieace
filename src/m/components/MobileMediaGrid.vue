<template>
    <div class="m-grid" :class="{ 'm-grid--compact': compact }">
        <PosterCard
            v-for="item in items"
            :key="`${item.type}-${item.id}`"
            :id="item.id"
            :type="item.type"
            :title="item.title"
            :poster-path="item.posterPath"
            :rating="item.rating ?? 0"
            :release-date="item.releaseDate ?? ''"
            :genre-ids="item.genreIds ?? []"
            :adult="item.adult ?? false"
        />
    </div>
</template>

<script lang="ts" setup>
import PosterCard from '../../components/cards/PosterCard.vue';

export interface MobileGridItem {
    id: number | string;
    type: 'movie' | 'tv' | 'anime';
    title: string;
    posterPath?: string | null;
    rating?: number;
    releaseDate?: string;
    genreIds?: number[];
    adult?: boolean;
}

defineProps<{
    items: MobileGridItem[];
    compact?: boolean;
}>();
</script>

<style lang="scss" scoped>
.m-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3) var(--s-3);
    padding: 0 var(--s-4);

    &--compact {
        gap: var(--s-2);
    }

    @media (min-width: 480px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
</style>
