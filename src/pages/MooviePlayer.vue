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

        <!-- ── Player ──────────────────────────────────────────────────── -->
        <template v-else-if="state === 'ready' && streamUrl">

            <!-- Ambient bloom behind the video -->
            <div class="moovie-player__bloom" aria-hidden="true" />

            <video
                ref="videoEl"
                class="moovie-player__video"
                controls
                autoplay
                playsinline
                crossorigin="anonymous"
                :src="streamUrl"
                @error="onVideoError"
            >
                <track
                    v-for="sub in subtitles"
                    :key="sub.lang"
                    kind="subtitles"
                    :label="sub.label"
                    :srclang="sub.lang"
                    :src="sub.src"
                />
            </video>

            <!-- Quality picker — only shown when multiple options exist -->
            <div v-if="options.length > 1" class="moovie-player__quality">
                <label class="moovie-player__quality-label eyebrow" for="quality-select">Quality</label>
                <select
                    id="quality-select"
                    v-model="selectedQuality"
                    class="moovie-player__quality-select"
                    @change="switchQuality"
                >
                    <option v-for="opt in options" :key="opt.url" :value="opt.url">
                        {{ opt.label }}
                    </option>
                </select>
            </div>

            <!-- Moovie badge -->
            <div class="moovie-player__badge" aria-hidden="true">
                <span class="moovie-player__badge-dot" />
                moovie
            </div>

        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
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
        const streamUrl = ref<string>('');
        const subtitles = ref<{ label: string; src: string; lang: string }[]>([]);
        const options = ref<{ label: string; url: string }[]>([]);
        const selectedQuality = ref<string>('');
        const errorMessage = ref<string>('No stream found for this title.');
        const videoEl = ref<HTMLVideoElement | null>(null);

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

        const onVideoError = () => {
            state.value = 'error';
            errorMessage.value = 'Failed to play the video stream. Try a different server.';
        };

        const switchQuality = () => {
            if (!videoEl.value || !selectedQuality.value) return;
            const currentTime = videoEl.value.currentTime;
            const paused = videoEl.value.paused;
            videoEl.value.src = selectedQuality.value;
            videoEl.value.currentTime = currentTime;
            if (!paused) videoEl.value.play();
        };

        onMounted(async () => {
            startMessages();

            const params = new URLSearchParams(window.location.search);
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

                streamUrl.value    = result.streamUrl;
                subtitles.value    = result.subtitles;
                options.value      = result.options;
                selectedQuality.value = result.streamUrl;
                state.value = 'ready';
            } catch (err) {
                stopMessages();
                console.error('MooviePlayer error:', err);
                errorMessage.value = err instanceof Error ? err.message : 'Failed to load stream.';
                state.value = 'error';
            }
        });

        onUnmounted(stopMessages);

        return {
            state, streamUrl, subtitles, options,
            selectedQuality, errorMessage, loadingLabel,
            videoEl, onVideoError, switchQuality
        };
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
    isolation: isolate;

    // ── Ambient bloom ──────────────────────────────────────────────────────
    &__bloom {
        position: absolute;
        inset: -20%;
        background: radial-gradient(
            ellipse at center,
            rgba(var(--ambient), 0.12) 0%,
            transparent 65%
        );
        z-index: -1;
        pointer-events: none;
        animation: bloomPulse 6s ease-in-out infinite alternate;
    }

    // ── Loading ────────────────────────────────────────────────────────────
    &__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--s-5);
    }

    // Film reel spinner — three concentric rings
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
        inset: 50%;
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
    }

    &__error-body {
        color: var(--bone-400);
        font-size: var(--fs-sm);
        max-width: 32ch;
        margin: 0;
    }

    // ── Video ──────────────────────────────────────────────────────────────
    &__video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
    }

    // ── Quality picker ─────────────────────────────────────────────────────
    &__quality {
        position: absolute;
        top: var(--s-4);
        right: var(--s-4);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: var(--s-2);
        background: rgba(11, 10, 8, 0.75);
        backdrop-filter: blur(12px);
        border: 1px solid var(--rule-strong);
        border-radius: var(--r-pill);
        padding: var(--s-1) var(--s-3);
        opacity: 0;
        transition: opacity var(--dur-base) var(--ease-out);
    }

    // Show quality picker on hover over the player
    &:hover &__quality {
        opacity: 1;
    }

    &__quality-label {
        color: var(--bone-400);
        font-size: var(--fs-xs);
        white-space: nowrap;
    }

    &__quality-select {
        background: transparent;
        border: none;
        color: var(--bone-50);
        font-family: var(--font-ui);
        font-size: var(--fs-sm);
        font-weight: 500;
        cursor: pointer;
        outline: none;

        option {
            background: var(--ink-800);
            color: var(--bone-50);
        }
    }

    // ── Moovie badge ───────────────────────────────────────────────────────
    &__badge {
        position: absolute;
        bottom: var(--s-4);
        left: var(--s-4);
        z-index: 10;
        display: inline-flex;
        align-items: center;
        gap: var(--s-2);
        font-family: var(--font-display);
        font-size: var(--fs-sm);
        font-weight: 500;
        color: var(--bone-400);
        letter-spacing: var(--ls-snug);
        opacity: 0;
        transition: opacity var(--dur-base) var(--ease-out);
        pointer-events: none;
        font-variation-settings: 'opsz' 72, 'SOFT' 50;
    }

    &:hover &__badge {
        opacity: 1;
    }

    &__badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ember);
        box-shadow: 0 0 8px var(--ember-glow);
        flex-shrink: 0;
    }
}

// ── Animations ───────────────────────────────────────────────────────────────
@keyframes reelSpin {
    to { transform: rotate(360deg); }
}

@keyframes bloomPulse {
    from { opacity: 0.6; transform: scale(1); }
    to   { opacity: 1;   transform: scale(1.08); }
}

@media (prefers-reduced-motion: reduce) {
    .moovie-player__reel-ring,
    .moovie-player__bloom {
        animation: none;
    }
}
</style>
