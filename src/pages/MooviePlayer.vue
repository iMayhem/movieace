<template>
    <div class="moovie-player">

        <!-- ── Loading ─────────────────────────────────────────────────── -->
        <div v-if="state === 'loading'" class="moovie-player__loading">
            <div class="moovie-player__reel" aria-hidden="true">
                <div class="moovie-player__reel-ring" />
                <div class="moovie-player__reel-ring moovie-player__reel-ring--inner" />
                <div class="moovie-player__reel-hub" />
            </div>
            <p class="moovie-player__loading-label eyebrow">{{ loadingLabel }}</p>
        </div>

        <!-- ── Error ───────────────────────────────────────────────────── -->
        <div v-else-if="state === 'error'" class="moovie-player__error" role="alert">
            <span class="moovie-player__error-glyph" aria-hidden="true">⬡</span>
            <h3 class="moovie-player__error-title">Reel jam</h3>
            <p class="moovie-player__error-body">{{ errorMessage }}</p>
        </div>

        <!-- ── ArtPlayer container ─────────────────────────────────────── -->
        <div
            v-show="state === 'ready'"
            ref="artRef"
            class="moovie-player__art"
        />

    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import Artplayer from 'artplayer';
import { getMoovieStream } from '../lib/moovie';

type PlayerState = 'loading' | 'ready' | 'error';

const LOADING_MESSAGES = [
    'Threading the reel…',
    'Resolving stream…',
    'Cueing the projector…',
    'Almost there…'
];

export default defineComponent({
    name: 'MooviePlayer',
    setup() {
        const state = ref<PlayerState>('loading');
        const errorMessage = ref('No stream found for this title.');
        const artRef = ref<HTMLDivElement | null>(null);
        let art: Artplayer | null = null;

        const loadingLabel = ref(LOADING_MESSAGES[0]);
        let msgIdx = 0;
        let msgTimer: ReturnType<typeof setInterval> | null = null;

        const startMessages = () => {
            msgTimer = setInterval(() => {
                msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
                loadingLabel.value = LOADING_MESSAGES[msgIdx];
            }, 2200);
        };

        const stopMessages = () => {
            if (msgTimer) { clearInterval(msgTimer); msgTimer = null; }
        };

        onMounted(async () => {
            startMessages();

            const params  = new URLSearchParams(window.location.search);
            const title   = params.get('title') || '';
            const type    = (params.get('type') || 'movie') as 'movie' | 'tv';
            const season  = params.get('season')  ? Number(params.get('season'))  : undefined;
            const episode = params.get('episode') ? Number(params.get('episode')) : undefined;
            const year    = params.get('year')    ? Number(params.get('year'))    : undefined;

            if (!title) {
                stopMessages();
                errorMessage.value = 'No title provided.';
                state.value = 'error';
                return;
            }

            try {
                const result = await getMoovieStream({ title, type, season, episode, year });
                stopMessages();

                if (!result || !result.streamUrl) {
                    errorMessage.value = 'No stream found for this title on Moovie.';
                    state.value = 'error';
                    return;
                }

                state.value = 'ready';

                // Build quality list for ArtPlayer
                const qualities = result.options.length > 1
                    ? result.options.map((opt, i) => ({
                        default: i === 0,
                        name: opt.label,
                        url: opt.url
                    }))
                    : [];

                // Build subtitle list
                const subtitleList = result.subtitles.map((sub, i) => ({
                    default: i === 0,
                    name: sub.label,
                    url: sub.src
                }));

                // Init ArtPlayer after DOM is ready
                await new Promise(r => setTimeout(r, 50));

                if (!artRef.value) return;

                art = new Artplayer({
                    container: artRef.value,
                    url: result.streamUrl,
                    volume: 1,
                    autoplay: true,
                    pip: true,
                    autoSize: false,
                    autoMini: false,
                    screenshot: false,
                    setting: true,
                    loop: false,
                    flip: false,
                    playbackRate: true,
                    aspectRatio: false,
                    fullscreen: true,
                    fullscreenWeb: true,
                    subtitleOffset: true,
                    miniProgressBar: true,
                    mutex: true,
                    backdrop: true,
                    playsInline: true,
                    autoPlayback: true,
                    airplay: true,
                    theme: '#ff5a1f',
                    lang: navigator.language.toLowerCase(),
                    moreVideoAttr: {
                        crossOrigin: 'anonymous'
                    },
                    // Quality switching
                    ...(qualities.length > 0 && {
                        quality: qualities,
                        setting: true
                    }),
                    // Subtitles
                    ...(subtitleList.length > 0 && {
                        subtitle: {
                            url: subtitleList[0].url,
                            type: 'vtt',
                            style: {
                                color: '#f5efe4',
                                fontSize: '22px',
                                fontFamily: "'General Sans', sans-serif",
                                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                                background: 'rgba(11,10,8,0.55)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                            },
                            escape: false
                        }
                    }),
                    icons: {
                        loading: `<div class="art-loading-ring"></div>`
                    }
                });

                art.on('error', () => {
                    state.value = 'error';
                    errorMessage.value = 'Failed to play the video stream. Try a different server.';
                });

            } catch (err) {
                stopMessages();
                console.error('MooviePlayer error:', err);
                errorMessage.value = err instanceof Error ? err.message : 'Failed to load stream.';
                state.value = 'error';
            }
        });

        onUnmounted(() => {
            stopMessages();
            if (art) { art.destroy(true); art = null; }
        });

        return { state, errorMessage, loadingLabel, artRef };
    }
});
</script>

<style lang="scss" scoped>
.moovie-player {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: var(--ink-900);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    // ── ArtPlayer fills the whole viewport ────────────────────────────────
    &__art {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;

        // Override ArtPlayer theme to match our design system
        :deep(.art-video-player) {
            font-family: var(--font-ui);
            background: #000;
        }

        :deep(.art-bottom) {
            background: linear-gradient(
                0deg,
                rgba(11, 10, 8, 0.92) 0%,
                rgba(11, 10, 8, 0.4) 70%,
                transparent 100%
            );
            padding-bottom: var(--s-3);
        }

        :deep(.art-progress-bar) {
            background: rgba(245, 239, 228, 0.15);
        }

        :deep(.art-progress-played) {
            background: var(--ember);
        }

        :deep(.art-progress-highlight) {
            background: var(--ember-600);
        }

        :deep(.art-control-progress) {
            .art-progress-tip {
                background: var(--ink-800);
                border: 1px solid var(--rule-strong);
                color: var(--bone-50);
                font-family: var(--font-ui);
                font-size: var(--fs-xs);
                border-radius: var(--r-sm);
            }
        }

        :deep(.art-icon) {
            color: var(--bone-50);
            transition: color var(--dur-fast) var(--ease-out),
                        transform var(--dur-fast) var(--ease-out);

            &:hover {
                color: var(--ember);
                transform: scale(1.1);
            }
        }

        :deep(.art-setting-panel) {
            background: rgba(11, 10, 8, 0.92);
            backdrop-filter: blur(16px);
            border: 1px solid var(--rule-strong);
            border-radius: var(--r-lg);
            font-family: var(--font-ui);
            color: var(--bone-50);
        }

        :deep(.art-setting-item:hover) {
            background: var(--surface-tint-hover);
        }

        :deep(.art-setting-item-right-icon svg) {
            color: var(--ember);
        }

        :deep(.art-subtitle) {
            bottom: 60px;
        }
    }

    // ── Loading ────────────────────────────────────────────────────────────
    &__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--s-5);
    }

    &__reel {
        position: relative;
        width: 56px;
        height: 56px;
    }

    &__reel-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: var(--ember);
        border-right-color: rgba(255, 90, 31, 0.3);
        animation: reelSpin 1.1s linear infinite;

        &--inner {
            inset: 10px;
            border-top-color: var(--bone-300);
            border-right-color: transparent;
            animation-duration: 0.75s;
            animation-direction: reverse;
        }
    }

    &__reel-hub {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--ember);
        box-shadow: 0 0 12px var(--ember-glow);
    }

    &__loading-label {
        color: var(--bone-400);
        letter-spacing: var(--ls-micro);
    }

    // ── Error ──────────────────────────────────────────────────────────────
    &__error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--s-3);
        text-align: center;
        padding: var(--s-6);
        max-width: 420px;
    }

    &__error-glyph {
        font-size: 2.5rem;
        color: var(--bone-500);
        line-height: 1;
    }

    &__error-title {
        font-family: var(--font-display);
        font-size: var(--fs-2xl);
        font-weight: 500;
        color: var(--bone-50);
        margin: 0;
        letter-spacing: var(--ls-tight);
        font-variation-settings: 'opsz' 72, 'SOFT' 50;
    }

    &__error-body {
        color: var(--bone-400);
        font-size: var(--fs-sm);
        max-width: 32ch;
        margin: 0;
    }
}

// ArtPlayer custom loading ring (injected via icons.loading)
:global(.art-loading-ring) {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid rgba(245, 239, 228, 0.1);
    border-top-color: #ff5a1f;
    animation: reelSpin 1s linear infinite;
}

@keyframes reelSpin {
    to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
    .moovie-player__reel-ring,
    :global(.art-loading-ring) {
        animation: none;
    }
}
</style>
