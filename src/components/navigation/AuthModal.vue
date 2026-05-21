<template>
    <div v-if="isOpen" class="auth-modal-overlay" @click.self="close">
        <div class="glass-card auth-modal animate-scale-up">
            <header class="auth-modal__header">
                <div class="auth-modal__sparkle animate-pulse">✦</div>
                <h3 class="auth-modal__title">{{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}</h3>
                <p class="auth-modal__subtitle">
                    {{ mode === 'login' 
                        ? 'Sign in to sync your watchlist and history with the cloud.' 
                        : 'Choose a unique username to personalize your experience.' 
                    }}
                </p>
            </header>

            <form @submit.prevent="handleSubmit" class="auth-modal__form">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <div class="input-wrapper">
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Enter unique username" 
                            v-model="username" 
                            class="form-input" 
                            :disabled="loading" 
                            required 
                            autocomplete="off"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-wrapper">
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input 
                            type="password" 
                            placeholder="Enter password" 
                            v-model="password" 
                            class="form-input" 
                            :disabled="loading" 
                            required
                        />
                    </div>
                </div>

                <!-- Status Messages -->
                <div v-if="error" class="status-msg error-msg animate-fade-in">
                    ⚠️ {{ error }}
                </div>
                <div v-if="success" class="status-msg success-msg animate-fade-in">
                    ✨ {{ success }}
                </div>

                <!-- Submit Button -->
                <button type="submit" class="btn btn-primary btn-submit" :disabled="loading">
                    <div v-if="loading" class="spinner-small"></div>
                    <span>{{ mode === 'login' ? 'Sign In' : 'Sign Up' }}</span>
                </button>
            </form>

            <footer class="auth-modal__footer">
                <span v-if="mode === 'login'">
                    Don't have an account? 
                    <button class="toggle-mode-btn" @click="toggleMode">Sign Up</button>
                </span>
                <span v-else>
                    Already have an account? 
                    <button class="toggle-mode-btn" @click="toggleMode">Sign In</button>
                </span>
            </footer>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { loginUser, registerUser } from '../../lib/auth';

export default defineComponent({
    name: 'AuthModal',
    props: {
        isOpen: { type: Boolean, required: true }
    },
    emits: ['close'],
    setup(_, { emit }) {
        const mode = ref<'login' | 'signup'>('login');
        const username = ref('');
        const password = ref('');
        const loading = ref(false);
        const error = ref('');
        const success = ref('');

        const close = () => {
            if (!loading.value) {
                emit('close');
                error.value = '';
                success.value = '';
            }
        };

        const toggleMode = () => {
            mode.value = mode.value === 'login' ? 'signup' : 'login';
            error.value = '';
            success.value = '';
        };

        const handleSubmit = async () => {
            error.value = '';
            success.value = '';

            if (!username.value.trim() || !password.value) {
                error.value = 'Please fill in all fields.';
                return;
            }

            loading.value = true;

            try {
                if (mode.value === 'signup') {
                    const res = await registerUser(username.value, password.value);
                    if (res.success) {
                        success.value = 'Welcome to moovie! Account registered.';
                        setTimeout(() => {
                            close();
                            username.value = '';
                            password.value = '';
                        }, 1200);
                    } else {
                        error.value = res.error || 'Failed to sign up.';
                    }
                } else {
                    const res = await loginUser(username.value, password.value);
                    if (res.success) {
                        success.value = 'Successfully logged in!';
                        setTimeout(() => {
                            close();
                            username.value = '';
                            password.value = '';
                        }, 1200);
                    } else {
                        error.value = res.error || 'Failed to login.';
                    }
                }
            } catch (err) {
                error.value = 'An unexpected error occurred. Please try again.';
            } finally {
                loading.value = false;
            }
        };

        return {
            mode,
            username,
            password,
            loading,
            error,
            success,
            close,
            toggleMode,
            handleSubmit
        };
    }
});
</script>

<style lang="scss" scoped>
.auth-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-header) + 100);
    background: rgba(4, 6, 10, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
}

.auth-modal {
    width: 90%;
    max-width: 380px;
    background: rgba(18, 18, 24, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r-lg);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    padding: var(--s-6);
    color: var(--bone-50);

    &__header {
        text-align: center;
        margin-bottom: var(--s-5);
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__sparkle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 90, 31, 0.1);
        border: 1px solid rgba(255, 90, 31, 0.3);
        color: var(--ember);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        margin-bottom: var(--s-3);
    }

    &__title {
        font-family: var(--font-display);
        font-size: var(--fs-xl);
        font-weight: 700;
    }

    &__subtitle {
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        color: var(--bone-400);
        margin-top: var(--s-1);
        line-height: 1.4;
    }

    &__form {
        display: flex;
        flex-direction: column;
        gap: var(--s-4);
    }

    &__footer {
        margin-top: var(--s-5);
        text-align: center;
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        color: var(--bone-400);
    }
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
}

.form-label {
    font-family: var(--font-ui);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--ls-wide);
    color: var(--bone-400);
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: var(--s-3);
    width: 16px;
    height: 16px;
    color: var(--bone-500);
    pointer-events: none;
}

.form-input {
    width: 100%;
    padding: 11px var(--s-4) 11px var(--s-10);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r-sm);
    color: var(--bone-50);
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    transition: border-color var(--dur-fast), box-shadow var(--dur-fast);

    &:focus {
        outline: none;
        border-color: rgba(255, 90, 31, 0.5);
        box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.status-msg {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-sm);
    font-family: var(--font-ui);
    font-size: var(--fs-xs);
    font-weight: 500;
    text-align: center;
    line-height: 1.4;
}

.error-msg {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #f87171;
}

.success-msg {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
}

.btn-submit {
    width: 100%;
    background: linear-gradient(135deg, var(--ember) 0%, #ff8a00 100%);
    color: var(--ink-900);
    font-weight: 700;
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    padding: 12px;
    border: none;
    border-radius: var(--r-sm);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    box-shadow: 0 4px 15px rgba(255, 90, 31, 0.25);
    transition: transform var(--dur-fast), box-shadow var(--dur-fast);

    &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(255, 90, 31, 0.4);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}


.toggle-mode-btn {
    background: transparent;
    border: none;
    color: var(--ember);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-left: 2px;

    &:hover {
        text-decoration: underline;
    }
}

.spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 0, 0, 0.15);
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.animate-scale-up {
    animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.animate-fade-in {
    animation: fadeIn 0.25s ease forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
