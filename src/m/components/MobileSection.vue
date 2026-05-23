<template>
    <section class="m-section">
        <header class="m-section__head">
            <div>
                <p v-if="eyebrow" class="eyebrow m-section__eyebrow">{{ eyebrow }}</p>
                <h2 class="m-section__title">{{ title }}</h2>
            </div>
            <router-link v-if="moreTo" :to="moreTo" class="m-section__more">See all</router-link>
        </header>
        <slot />
    </section>
</template>

<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
    title: string;
    eyebrow?: string;
    moreTo?: RouteLocationRaw;
}>();
</script>

<style lang="scss" scoped>
.m-section {
    margin-top: var(--s-6);

    &__head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--s-3);
        padding: 0 var(--s-4) var(--s-3);
    }

    &__eyebrow {
        color: var(--ember);
        margin-bottom: var(--s-1);
    }

    &__title {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 500;
        letter-spacing: var(--ls-tight);
        color: var(--bone-50);
        margin: 0;
    }

    &__more {
        flex-shrink: 0;
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        font-weight: 600;
        color: var(--ember);
        text-decoration: none;
        padding: 0.35rem 0;
    }
}
</style>
