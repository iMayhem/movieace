<template>
    <div class="mb-player">
        <!-- Loading state -->
        <div v-if="state === 'loading'" class="mb-player__loading">
            <div class="mb-player__spinner" aria-hidden="true" />
            <p class="mb-player__label">{{ loadingLabel }}</p>
        </div>

        <!-- Error state -->
        <div v-else-if="state === 'error'" class="mb-player__error" role="alert">
            <p class="mb-player__error-icon">⚠</p>
            <h3>Stream unavailable</h3>
            <p>{{ errorMessage }}</p>
        </div>

        <!-- Player -->
        <template v-else-if="state === 'ready' && streamUrl">
            <video
                ref="videoEl"
                class="mb-player__video"
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

            <!-- Quality selector -->
            <div v-if="options.length > 1" class="mb-player__quality">
                <select v-model="selectedQuality" @change="switchQuality" class="mb-player__quality-select">
                    <option v-for="opt in options" :key="opt.url" :value="opt.url">
                        {{ opt.label }}
                    </option>
                </select>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { getMovieboxStream } from '../lib/moviebox';

type PlayerState = 'loading' | 'ready' | 'error';

const loadingMessages = [
    'Searching Moviebox…',
    'Resolving stream…',
    'Fetching quality…',
    'Almost there…'
];

export default defineComponent({
    name: 'MovieboxPlayer',
    setup() {
        const state = ref<PlayerState>('loading');
        const streamUrl = ref<string>('');
        const subtitles = ref<{ label: string; src: string; lang: string }[]>([]);
        const options = ref<{ label: string; url: string }[]>([]);
        const selectedQuality = ref<string>('');
        const errorMessage = ref<string>('No stream found for this title.');
        const videoEl = ref<HTMLVideoElement | null>(null);

        // Cycle loading messages
        const loadingLabel = ref(loadingMessages[0]);
        let msgIdx = 0;
        const msgTimer = setInterval(() => {
            msgIdx = (msgIdx + 1) % loadingMessages.length;
            loadingLabel.value = loadingMessages[msgIdx];
        }, 2000);

        const clearMsgTimer = () => clearInterval(msgTimer);

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
            const params = new URLSearchParams(window.location.search);
            const title = params.get('title') || '';
            const type = (params.get('type') || 'movie') as 'movie' | 'tv';
            const season = params.get('season') ? Number(params.get('season')) : undefined;
            const episode = params.get('episode') ? Number(params.get('episode')) : undefined;
            const year = params.get('year') ? Number(params.get('year')) : undefined;

            if (!title) {
                clearMsgTimer();
                errorMessage.value = 'No title provided.';
                state.value = 'error';
                return;
            }

            try {
                const result = await getMovieboxStream({ title, type, season, episode, year });

                clearMsgTimer();

                if (!result || !result.streamUrl) {
                    errorMessage.value = 'No stream found for this title on Moviebox.';
                    state.value = 'error';
                    return;
                }

                streamUrl.value = result.streamUrl;
                subtitles.value = result.subtitles;
                options.value = result.options;
                selectedQuality.value = result.streamUrl;
                state.value = 'ready';
            } catch (err) {
                clearMsgTimer();
                console.error('MovieboxPlayer error:', err);
                errorMessage.value = err instanceof Error ? err.message : 'Failed to load stream.';
                state.value = 'error';
            }
        });

        return {
            state,
            streamUrl,
            subtitles,
            options,
            selectedQuality,
            errorMessage,
            loadingLabel,
            videoEl,
            onVideoError,
            switchQuality
        };
    }
});
</script>

<style lang="scss" scoped>
.mb-player {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    &__loading,
    &__error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: #fff;
        text-align: center;
        padding: 2rem;
    }

    &__spinner {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #ff5a1f;
        animation: mbSpin 1s linear infinite;
    }

    &__label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.9rem;
    }

    &__error-icon {
        font-size: 2.5rem;
    }

    &__error h3 {
        font-size: 1.25rem;
        margin: 0;
    }

    &__error p {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.875rem;
        max-width: 360px;
    }

    &__video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
    }

    &__quality {
        position: absolute;
        top: 1rem;
        right: 1rem;
        z-index: 10;
    }

    &__quality-select {
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 0.35rem 0.65rem;
        font-size: 0.8rem;
        cursor: pointer;
        backdrop-filter: blur(8px);

        &:focus {
            outline: 2px solid #ff5a1f;
        }
    }
}

@keyframes mbSpin {
    to { transform: rotate(360deg); }
}
</style>
