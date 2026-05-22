<template>
    <LmDialog :model-value="isOpen" @update:model-value="$emit('close')" title="Settings">
        <div class="settings-modal">
            <div class="settings-section">
                <h3 class="settings-section__title">Privacy & Data</h3>
                <p class="settings-section__description">
                    Manage your viewing and search history. This data is {{ currentUser ? 'synced to your account' : 'stored locally' }}.
                </p>

                <div class="settings-actions">
                    <div class="settings-action-item">
                        <div class="settings-action-info">
                            <h4 class="settings-action-title">Watch History</h4>
                            <p class="settings-action-desc">
                                Clear all movies, shows, and anime you've watched
                            </p>
                        </div>
                        <button 
                            class="btn-danger" 
                            @click="handleClearWatchHistory"
                            :disabled="clearingWatch"
                        >
                            {{ clearingWatch ? 'Clearing...' : 'Clear Watch History' }}
                        </button>
                    </div>

                    <div class="settings-action-item">
                        <div class="settings-action-info">
                            <h4 class="settings-action-title">Search History</h4>
                            <p class="settings-action-desc">
                                Clear all your recent search queries
                            </p>
                        </div>
                        <button 
                            class="btn-danger" 
                            @click="handleClearSearchHistory"
                            :disabled="clearingSearch"
                        >
                            {{ clearingSearch ? 'Clearing...' : 'Clear Search History' }}
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="currentUser" class="settings-section">
                <h3 class="settings-section__title">Account</h3>
                <div class="settings-info-box">
                    <div class="settings-info-row">
                        <span class="settings-info-label">Username</span>
                        <span class="settings-info-value">{{ currentUser }}</span>
                    </div>
                </div>
            </div>

            <div v-if="message" class="settings-message" :class="messageType">
                {{ message }}
            </div>
        </div>
    </LmDialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import LmDialog from '../primitives/Dialog.vue';
import { getCurrentUser, clearWatchHistory, clearSearchHistory } from '../../lib/auth';
import { searchHistory, viewHistory } from '../../composables/useHistory';

export default defineComponent({
    name: 'SettingsModal',
    components: { LmDialog },
    props: {
        isOpen: {
            type: Boolean,
            required: true
        }
    },
    emits: ['close'],
    setup() {
        const currentUser = computed(() => getCurrentUser());
        const clearingWatch = ref(false);
        const clearingSearch = ref(false);
        const message = ref('');
        const messageType = ref<'success' | 'error'>('success');

        const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
            message.value = msg;
            messageType.value = type;
            setTimeout(() => {
                message.value = '';
            }, 3000);
        };

        const handleClearWatchHistory = async () => {
            if (!confirm('Are you sure you want to clear your watch history? This cannot be undone.')) {
                return;
            }

            clearingWatch.value = true;
            try {
                const user = currentUser.value;
                if (user) {
                    const success = await clearWatchHistory(user);
                    if (success) {
                        viewHistory.value = [];
                        showMessage('Watch history cleared successfully!', 'success');
                    } else {
                        showMessage('Failed to clear watch history. Please try again.', 'error');
                    }
                } else {
                    // Clear local storage only
                    viewHistory.value = [];
                    localStorage.setItem('viewHistory', '[]');
                    showMessage('Watch history cleared successfully!', 'success');
                }
            } catch (e) {
                console.error('Error clearing watch history:', e);
                showMessage('An error occurred. Please try again.', 'error');
            } finally {
                clearingWatch.value = false;
            }
        };

        const handleClearSearchHistory = async () => {
            if (!confirm('Are you sure you want to clear your search history? This cannot be undone.')) {
                return;
            }

            clearingSearch.value = true;
            try {
                const user = currentUser.value;
                if (user) {
                    const success = await clearSearchHistory(user);
                    if (success) {
                        searchHistory.value = [];
                        showMessage('Search history cleared successfully!', 'success');
                    } else {
                        showMessage('Failed to clear search history. Please try again.', 'error');
                    }
                } else {
                    // Clear local storage only
                    searchHistory.value = [];
                    localStorage.setItem('searchHistory', '[]');
                    showMessage('Search history cleared successfully!', 'success');
                }
            } catch (e) {
                console.error('Error clearing search history:', e);
                showMessage('An error occurred. Please try again.', 'error');
            } finally {
                clearingSearch.value = false;
            }
        };

        return {
            currentUser,
            clearingWatch,
            clearingSearch,
            message,
            messageType,
            handleClearWatchHistory,
            handleClearSearchHistory
        };
    }
});
</script>

<style lang="scss" scoped>
.settings-modal {
    padding: var(--s-2);
    max-width: 600px;
}

.settings-section {
    margin-bottom: var(--s-6);

    &:last-child {
        margin-bottom: 0;
    }

    &__title {
        font-family: var(--font-display);
        font-size: var(--fs-xl);
        font-weight: 700;
        color: var(--bone-50);
        margin-bottom: var(--s-2);
    }

    &__description {
        color: var(--bone-400);
        font-size: var(--fs-sm);
        line-height: 1.5;
        margin-bottom: var(--s-4);
    }
}

.settings-actions {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
}

.settings-action-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-4);
    background: var(--surface-tint);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
    }
}

.settings-action-info {
    flex: 1;
}

.settings-action-title {
    font-family: var(--font-ui);
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--bone-50);
    margin-bottom: var(--s-1);
}

.settings-action-desc {
    font-size: var(--fs-sm);
    color: var(--bone-400);
    line-height: 1.4;
}

.btn-danger {
    padding: var(--s-2) var(--s-4);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--r-sm);
    color: #ef4444;
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--dur-fast) var(--ease-out);
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 640px) {
        width: 100%;
    }
}

.settings-info-box {
    background: var(--surface-tint);
    border: 1px solid var(--rule);
    border-radius: var(--r-md);
    padding: var(--s-4);
}

.settings-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--s-2) 0;
}

.settings-info-label {
    font-size: var(--fs-sm);
    color: var(--bone-400);
    font-weight: 500;
}

.settings-info-value {
    font-size: var(--fs-sm);
    color: var(--bone-50);
    font-weight: 600;
    font-family: var(--font-mono);
}

.settings-message {
    margin-top: var(--s-4);
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-sm);
    font-size: var(--fs-sm);
    font-weight: 500;
    text-align: center;

    &.success {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #10b981;
    }

    &.error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
    }
}
</style>
