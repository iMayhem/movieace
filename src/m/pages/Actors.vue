<template>
    <MobileShell>
        <div class="m-actors">
            <header class="m-actors__head">
                <h1 class="m-actors__title">Cast</h1>
                <input
                    v-model="searchTerm"
                    type="search"
                    class="m-actors__input"
                    placeholder="Search people…"
                    aria-label="Search actors"
                />
            </header>

            <div v-if="isLoading && !results.length" class="m-actors__loading">
                <div class="m-discover__spinner" aria-hidden="true" />
            </div>

            <div v-else class="m-actors__grid">
                <PersonCard
                    v-for="person in results"
                    :key="person.id"
                    :id="person.id"
                    :name="person.name"
                    :profile-path="person.profile_path"
                    :department="person.known_for_department || ''"
                />
            </div>

            <div v-if="hasMore" class="m-discover__more">
                <button type="button" :disabled="isLoadingMore" @click="loadMore">Load more</button>
            </div>
        </div>
    </MobileShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import debounce from 'lodash.debounce';
import MobileShell from '../layout/MobileShell.vue';
import PersonCard from '../../components/cards/PersonCard.vue';
import useAxios from '../../composables/useAxios';

interface Person {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department?: string;
}

const searchTerm = ref('');
const results = ref<Person[]>([]);
const page = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const sortMode = ref<'popular' | 'trending'>('popular');

const hasMore = computed(() => page.value < totalPages.value);

async function fetchPage(pageNum: number, append: boolean) {
    if (append) isLoadingMore.value = true;
    else isLoading.value = true;
    try {
        const url = searchTerm.value.trim()
            ? `search/person?query=${encodeURIComponent(searchTerm.value.trim())}&page=${pageNum}`
            : sortMode.value === 'trending'
              ? `trending/person/day?page=${pageNum}`
              : `person/popular?page=${pageNum}`;
        const res = await useAxios().get(url, { params: { language: 'en-US' } });
        const data = res.data as { results: Person[]; total_pages: number };
        const batch = data.results ?? [];
        results.value = append ? [...results.value, ...batch] : batch;
        totalPages.value = data.total_pages ?? 1;
        page.value = pageNum;
    } finally {
        isLoading.value = false;
        isLoadingMore.value = false;
    }
}

const debouncedSearch = debounce(() => fetchPage(1, false), 350);

watch(searchTerm, debouncedSearch);

function loadMore() {
    if (!hasMore.value || isLoadingMore.value) return;
    fetchPage(page.value + 1, true);
}

onMounted(() => {
    document.title = 'Cast — Moovie';
    fetchPage(1, false);
});
</script>

<style lang="scss" scoped>
.m-actors {
    padding-bottom: var(--s-6);

    &__head {
        padding: var(--s-4);
    }

    &__title {
        font-family: var(--font-display);
        font-size: 1.5rem;
        margin: 0 0 var(--s-3);
    }

    &__input {
        width: 100%;
        min-height: 2.75rem;
        padding: 0 var(--s-4);
        border-radius: var(--r-pill);
        border: 1px solid var(--rule-strong);
        background: var(--ink-850);
        color: var(--bone-50);
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--s-4);
        padding: 0 var(--s-4);
    }

    &__loading {
        display: flex;
        justify-content: center;
        padding: var(--s-8);
    }
}

.m-discover__more {
    display: flex;
    justify-content: center;
    padding: var(--s-5);

    button {
        min-height: 2.75rem;
        padding: 0 var(--s-5);
        border-radius: var(--r-pill);
        border: 1px solid var(--rule-strong);
        background: var(--ink-800);
        color: var(--bone-100);
    }
}

.m-discover__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--rule);
    border-top-color: var(--ember);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
