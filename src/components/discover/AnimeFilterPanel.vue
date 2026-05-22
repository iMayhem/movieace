<template>
    <aside class="filter-panel" :aria-label="ariaLabel">
        <header class="filter-panel__head">
            <p class="eyebrow filter-panel__eyebrow">Refine</p>
            <h2 class="filter-panel__title display">The filters</h2>
            <button
                v-if="hasActiveFilters"
                type="button"
                class="filter-panel__reset"
                @click="resetAll"
            >
                Reset all
            </button>
        </header>

        <div class="filter-panel__body">
            <!-- Genres -->
            <section class="filter-panel__section">
                <AnimeGenreChips
                    :genres="genres"
                    :model-value="filters.genres"
                    label="Genres"
                    :loading="false"
                    @update:model-value="onGenresChange"
                />
            </section>

            <!-- Year Range -->
            <section class="filter-panel__section">
                <YearRangeSlider
                    :min="yearBounds[0]"
                    :max="yearBounds[1]"
                    :model-value="filters.yearRange"
                    label="Year"
                    @update:model-value="onYearChange"
                />
            </section>

            <!-- Sort By -->
            <section class="filter-panel__section">
                <header class="filter-panel__row-head">
                    <p class="eyebrow filter-panel__row-label">Sort by</p>
                </header>
                <div class="custom-select-container">
                    <div v-if="isSortOpen" class="custom-select-overlay" @click="isSortOpen = false"></div>
                    <div class="custom-select">
                        <button 
                            type="button" 
                            class="custom-select-trigger" 
                            :class="{ 'is-open': isSortOpen }"
                            @click="isSortOpen = !isSortOpen"
                        >
                            <span>{{ currentSortLabel }}</span>
                            <svg class="custom-select-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </button>
                        <transition name="fade-slide">
                            <div v-if="isSortOpen" class="custom-select-dropdown">
                                <button 
                                    v-for="s in sortOptions" 
                                    :key="s.value" 
                                    type="button"
                                    class="custom-select-option"
                                    :class="{ 'is-selected': filters.sortBy === s.value }"
                                    @click="selectSort(s.value); isSortOpen = false"
                                >
                                    {{ s.label }}
                                </button>
                            </div>
                        </transition>
                    </div>
                </div>
            </section>
        </div>
    </aside>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue';
import AnimeGenreChips from './AnimeGenreChips.vue';
import YearRangeSlider from './YearRangeSlider.vue';

export interface AnimeFilters {
    genres: string[];
    yearRange: [number, number];
    sortBy: string;
}

export interface SortOption {
    value: string;
    label: string;
}

export interface AnimeGenre {
    id: string;
    name: string;
}

export default defineComponent({
    name: 'AnimeFilterPanel',
    components: { AnimeGenreChips, YearRangeSlider },
    props: {
        genres: { type: Array as PropType<AnimeGenre[]>, required: true },
        filters: { type: Object as PropType<AnimeFilters>, required: true },
        yearBounds: { type: Array as unknown as PropType<[number, number]>, default: () => [1960, new Date().getFullYear()] },
        ariaLabel: { type: String, default: 'Filter panel' }
    },
    emits: ['update:filters', 'reset'],
    setup(props, { emit }) {
        const sortOptions: SortOption[] = [
            { value: 'TRENDING_DESC', label: 'Trending' },
            { value: 'POPULARITY_DESC', label: 'Most Popular' },
            { value: 'SCORE_DESC', label: 'Highest Rated' },
            { value: 'START_DATE_DESC', label: 'Newest first' },
            { value: 'TITLE_ROMAJI', label: 'A–Z' }
        ];

        const defaultSort = computed(() => sortOptions[0].value);

        const hasActiveFilters = computed(() => {
            const f = props.filters;
            const [lo, hi] = f.yearRange;
            const [boundLo, boundHi] = props.yearBounds;
            return (
                f.genres.length > 0 ||
                f.sortBy !== defaultSort.value ||
                lo !== boundLo ||
                hi !== boundHi
            );
        });

        const patch = (changes: Partial<AnimeFilters>) => {
            emit('update:filters', { ...props.filters, ...changes });
        };

        const onGenresChange = (ids: string[]) => patch({ genres: ids });
        const onYearChange = (range: [number, number]) => patch({ yearRange: range });
        const onSortChange = (v: string) => patch({ sortBy: v });

        const resetAll = () => emit('reset');

        const isSortOpen = ref(false);

        const currentSortLabel = computed(() => {
            const found = sortOptions.find(s => s.value === props.filters.sortBy);
            return found ? found.label : '';
        });

        const selectSort = (val: string) => {
            onSortChange(val);
        };

        return {
            sortOptions,
            hasActiveFilters,
            onGenresChange,
            onYearChange,
            onSortChange,
            resetAll,
            isSortOpen,
            currentSortLabel,
            selectSort
        };
    }
});
</script>

<style lang="scss" scoped>
.filter-panel {
    background: var(--ink-800);
    border: 1px solid var(--rule);
    border-radius: var(--r-lg);
    padding: var(--s-6);
    position: sticky;
    top: calc(var(--header-h, 72px) + var(--s-5));
    max-height: calc(100dvh - var(--header-h, 72px) - var(--s-7));
    overflow-y: auto;

    &__head {
        display: grid;
        gap: var(--s-1);
        margin-bottom: var(--s-6);
        padding-bottom: var(--s-5);
        border-bottom: 1px solid var(--rule);
        position: relative;
    }

    &__eyebrow {
        color: var(--ember);
        margin: 0;
    }

    &__title {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: var(--fs-xl);
        color: var(--bone-50);
        margin: 0;
        letter-spacing: -0.01em;
    }

    &__reset {
        position: absolute;
        right: 0;
        top: 0;
        font-family: var(--font-mono);
        font-size: var(--fs-xs);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--bone-300);
        padding: 0.3rem 0.7rem;
        border: 1px solid var(--rule);
        border-radius: var(--r-pill);
        transition:
            color var(--dur-fast) var(--ease-out),
            border-color var(--dur-fast) var(--ease-out);

        &:hover, &:focus-visible {
            color: var(--ember);
            border-color: currentColor;
        }
    }

    &__body {
        display: grid;
        gap: var(--s-6);
    }

    &__section {
        display: grid;
        gap: var(--s-3);
        padding-bottom: var(--s-5);
        border-bottom: 1px solid var(--rule);

        &:last-child {
            padding-bottom: 0;
            border-bottom: 0;
        }
    }

    &__row-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--s-3);
    }

    &__row-label {
        color: var(--bone-400);
        margin: 0;
    }
}

.custom-select-container {
    position: relative;
    width: 100%;
}

.custom-select-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
    background: transparent;
    cursor: default;
}

.custom-select {
    position: relative;
    z-index: 100;
    width: 100%;
}

.custom-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    color: var(--bone-50);
    background: var(--surface-tint);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    padding: 0.65rem 1rem;
    cursor: pointer;
    text-align: left;
    transition:
        border-color var(--dur-fast) var(--ease-out),
        background-color var(--dur-fast) var(--ease-out);

    &:hover {
        background: var(--surface-tint-hover);
        border-color: rgba(255, 90, 31, 0.4);
    }

    &.is-open {
        border-color: var(--ember);
        background: var(--surface-tint-hover);
    }
}

.custom-select-chevron {
    color: var(--bone-400);
    transition: transform var(--dur-fast) var(--ease-out);
    
    .is-open & {
        transform: rotate(180deg);
        color: var(--ember);
    }
}

.custom-select-dropdown {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    width: 100%;
    max-height: 260px;
    overflow-y: auto;
    background: rgba(18, 18, 24, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r-md);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 90, 31, 0.15);
    padding: var(--s-1);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.custom-select-dropdown::-webkit-scrollbar {
    width: 6px;
}
.custom-select-dropdown::-webkit-scrollbar-track {
    background: transparent;
}
.custom-select-dropdown::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
}
.custom-select-dropdown::-webkit-scrollbar-thumb:hover {
    background: var(--ember);
}

.custom-select-option {
    width: 100%;
    padding: 0.6rem 0.8rem;
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    color: var(--bone-300);
    background: transparent;
    border: 0;
    border-radius: var(--r-sm);
    text-align: left;
    cursor: pointer;
    transition:
        color var(--dur-fast) var(--ease-out),
        background-color var(--dur-fast) var(--ease-out);

    &:hover {
        color: var(--bone-50);
        background: rgba(255, 255, 255, 0.05);
    }

    &.is-selected {
        color: var(--ink-900);
        background: var(--ember);
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(255, 90, 31, 0.2);
    }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
