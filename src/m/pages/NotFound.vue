<template>
    <MobileShell>
        <div class="m-404">
            <h1 class="m-404__title">404</h1>
            <p class="meta">This page isn’t in the program.</p>
            <router-link :to="home" class="m-404__link">Back home</router-link>
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import MobileShell from '../layout/MobileShell.vue';
import { useAppPaths } from '../../composables/useAppPaths';

const { home } = useAppPaths();
</script>

<style lang="scss" scoped>
.m-404 {
    padding: var(--s-10) var(--s-4);
    text-align: center;

    &__title {
        font-family: var(--font-display);
        font-size: 3rem;
        margin: 0 0 var(--s-2);
    }

    &__link {
        display: inline-block;
        margin-top: var(--s-4);
        color: var(--ember);
        font-weight: 600;
    }
}
</style>
