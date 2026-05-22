<template>
    <div ref="rootRef" class="stream-frame" :class="{ 'is-loading': isLoading || isResolving, 'has-error': hasError || !!resolveError }">
        <div
            v-if="ambientImage"
            class="stream-frame__bloom"
            :style="{ backgroundImage: `url(${ambientImage})` }"
            aria-hidden="true"
        />

        <div class="stream-frame__stage">
            <div class="stream-frame__player">
                <!-- If Moviebox Direct: Render premium native HTML5 player -->
                <div v-if="isNative && !resolveError" class="stream-frame__native-wrapper">
                    <video
                        v-if="videoUrl"
                        ref="videoEl"
                        :src="videoUrl"
                        controls
                        autoplay
                        crossorigin="anonymous"
                        class="stream-frame__video"
                    >
                        <track
                            v-for="sub in subtitles"
                            :key="sub.src"
                            kind="subtitles"
                            :label="sub.label"
                            :src="sub.src"
                            :srclang="sub.srclang"
                            :default="sub.default"
                        />
                    </video>
                    
                    <!-- Premium Settings / Resolution Selection Overlay -->
                    <div v-if="videoUrl && resolutions.length > 1" class="stream-frame__settings-bar">
                        <span class="meta">Cinema Direct</span>
                        <div class="stream-frame__selector">
                            <label for="resolution-select">Quality:</label>
                            <select id="resolution-select" v-model="videoUrl" @change="onResolutionChange">
                                <option v-for="res in resolutions" :key="res.url" :value="res.url">
                                    {{ res.label }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <!-- Custom Loader for Direct API resolution -->
                    <div v-if="isResolving" class="stream-frame__loading" role="status" aria-live="polite">
                        <div class="stream-frame__skeleton" aria-hidden="true" />
                        <div class="stream-frame__loader">
                            <div class="stream-frame__spinner" aria-hidden="true" />
                            <p class="meta">Striking the high-performance print…</p>
                        </div>
                    </div>
                </div>

                <!-- If not Moviebox Direct: Render standard iframe -->
                <iframe
                    v-else-if="embedUrl && !isNative && !hasError"
                    ref="frameEl"
                    :src="embedUrl"
                    :title="title"
                    class="stream-frame__iframe"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowfullscreen
                    frameborder="0"
                    @load="onLoad"
                    @error="onError"
                />

                <!-- General loading states -->
                <div v-if="isLoading && !isNative && !hasError" class="stream-frame__loading" role="status" aria-live="polite">
                    <div class="stream-frame__skeleton" aria-hidden="true" />
                    <div class="stream-frame__loader">
                        <div class="stream-frame__spinner" aria-hidden="true" />
                        <p class="meta">{{ loadingLabel }}</p>
                    </div>
                </div>

                <!-- Iframe Error -->
                <div v-if="hasError && !isNative" class="stream-frame__error" role="alert">
                    <p class="eyebrow">Reel jam</p>
                    <h3>The frame didn't catch.</h3>
                    <p class="stream-frame__error-message">
                        Try a different server below, or reload this projector.
                    </p>
                    <button type="button" class="stream-frame__retry" @click="retry">Reload</button>
                </div>

                <!-- Native Resolve Error -->
                <div v-if="resolveError" class="stream-frame__error" role="alert">
                    <p class="eyebrow">Projector Fault</p>
                    <h3>Unable to strike direct stream.</h3>
                    <p class="stream-frame__error-message">{{ resolveError }}</p>
                    <button type="button" class="stream-frame__retry" @click="resolveStream">Retry</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import { useWebImage } from '../../utils/useWebImage';
import { useAmbientColor } from '../../composables/useAmbientColor';
import { startProgressTracking } from '../../composables/useProgress';

export default defineComponent({
    name: 'StreamFrame',
    props: {
        embedUrl: { type: String, default: '' },
        title: { type: String, default: 'Stream' },
        backdropPath: { type: String, default: '' },
        posterPath: { type: String, default: '' },
        mediaId: { type: [String, Number], default: '' },
        mediaType: { type: String as () => 'movie' | 'tv', default: 'movie' },
        season: { type: Number, default: 0 },
        episode: { type: Number, default: 0 }
    },
    setup(props) {
        const rootRef = ref<HTMLElement | null>(null);
        const frameEl = ref<HTMLIFrameElement | null>(null);
        const videoEl = ref<HTMLVideoElement | null>(null);
        const isLoading = ref(true);
        const hasError = ref(false);

        // Native streaming states
        const isNative = computed(() => props.embedUrl && (props.embedUrl.startsWith('http://161.118.191.46') || props.embedUrl.startsWith('https://api.moovie.fun')));
        const videoUrl = ref('');
        const subtitles = ref<Array<{ label: string; src: string; srclang: string; default: boolean }>>([]);
        const resolutions = ref<Array<{ label: string; url: string }>>([]);
        const isResolving = ref(false);
        const resolveError = ref('');

        const ambientPath = computed(() => props.backdropPath || props.posterPath || null);
        useAmbientColor(ambientPath, rootRef);

        const loadingMessages = [
            'Threading the reel…',
            'Cueing the projector…',
            'Striking the print…',
            'Rolling film…'
        ];
        const loadingLabel = ref(loadingMessages[0]);
        let messageTimer: ReturnType<typeof setInterval> | null = null;

        const startMessages = () => {
            let i = 0;
            messageTimer = setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                loadingLabel.value = loadingMessages[i];
            }, 2200);
        };

        const stopMessages = () => {
            if (messageTimer) {
                clearInterval(messageTimer);
                messageTimer = null;
            }
        };

        let stopTracking: (() => void) | null = null;

        const startTrackingIfNeeded = () => {
            if (stopTracking) {
                stopTracking();
                stopTracking = null;
            }
            if (props.mediaId && props.embedUrl) {
                stopTracking = startProgressTracking(
                    props.mediaId,
                    props.mediaType,
                    props.mediaType === 'tv' ? props.season : undefined,
                    props.mediaType === 'tv' ? props.episode : undefined
                );
            }
        };

        const ambientImage = ref<string>('');
        const computeAmbient = () => {
            const path = props.backdropPath || props.posterPath;
            ambientImage.value = path ? useWebImage(path, 'large') : '';
        };

        const onLoad = () => {
            window.setTimeout(() => {
                isLoading.value = false;
                hasError.value = false;
                stopMessages();
            }, 600);
        };

        const onError = () => {
            isLoading.value = false;
            hasError.value = true;
            stopMessages();
        };

        const retry = () => {
            hasError.value = false;
            isLoading.value = true;
            startMessages();
            if (frameEl.value && props.embedUrl) {
                const src = frameEl.value.src;
                frameEl.value.src = '';
                window.setTimeout(() => {
                    if (frameEl.value) frameEl.value.src = src;
                }, 80);
            }
        };

        // Resolves Moviebox dynamic stream links
        const resolveStream = async () => {
            if (!isNative.value) return;

            isResolving.value = true;
            resolveError.value = '';
            videoUrl.value = '';
            subtitles.value = [];
            resolutions.value = [];

            try {
                const type = props.mediaType;
                const titleEnc = encodeURIComponent(props.title);

                // Step 1: Search VPS API to get the correct Moviebox subject ID and detailPath
                const searchUrl = `https://api.moovie.fun/vps-proxy/search?q=${titleEnc}&type=${type === 'movie' ? 'movie' : 'tv'}`;
                const searchRes = await fetch(searchUrl);
                if (!searchRes.ok) throw new Error('Metadata resolver is currently offline');
                
                const searchData = await searchRes.json();
                const item = searchData.results?.[0];
                if (!item) throw new Error('No matching streaming source found on Moviebox Direct');

                const detailPath = item.raw?.detailPath || item.pageUrl;
                const subjectId = item.id;

                // Step 2: Resolve stream options and subtitles
                const resolveUrl = `https://api.moovie.fun/vps-proxy/resolve?detailPath=${encodeURIComponent(detailPath)}&subjectId=${subjectId}&type=${type}&season=${props.season}&episode=${props.episode}`;
                const resolveRes = await fetch(resolveUrl);
                if (!resolveRes.ok) throw new Error('Failed to resolve media stream URLs');

                const resolveData = await resolveRes.json();
                if (!resolveData.stream && (!resolveData.options || resolveData.options.length === 0)) {
                    throw new Error('Streaming resource is currently offline for this item');
                }

                // Format stream options
                const streamOptions = resolveData.options || [];
                resolutions.value = streamOptions.map((opt: any) => ({
                    label: `${opt.quality}p (${opt.format.toUpperCase()})`,
                    url: opt.url
                }));

                const defaultStream = resolveData.stream || streamOptions[0];
                videoUrl.value = defaultStream.url;

                // Subtitles options mapping
                const captionOptions = resolveData.captions || [];
                subtitles.value = captionOptions.map((sub: any, idx: number) => ({
                    label: sub.language,
                    src: sub.url,
                    srclang: sub.languageCode || 'en',
                    default: idx === 0 || sub.language.toLowerCase() === 'english'
                }));

            } catch (err: any) {
                resolveError.value = err.message || 'Failed to strike print';
                console.error('[STREAM_RESOLVER_ERROR]', err);
            } finally {
                isResolving.value = false;
                isLoading.value = false;
            }
        };

        const onResolutionChange = (event: Event) => {
            const select = event.target as HTMLSelectElement;
            videoUrl.value = select.value;
        };

        watch(
            () => props.embedUrl,
            (next, prev) => {
                if (next && next !== prev) {
                    if (isNative.value) {
                        resolveStream();
                    } else {
                        isLoading.value = true;
                        hasError.value = false;
                        startMessages();
                    }
                    startTrackingIfNeeded();
                }
            }
        );

        watch(
            () => [props.season, props.episode],
            () => {
                if (isNative.value) {
                    resolveStream();
                }
            }
        );

        watch(
            () => [props.backdropPath, props.posterPath],
            () => computeAmbient(),
            { immediate: true }
        );

        onMounted(() => {
            if (isNative.value) {
                resolveStream();
            } else {
                startMessages();
                window.setTimeout(() => {
                    if (isLoading.value) onLoad();
                }, 15000);
            }
            startTrackingIfNeeded();
        });

        onUnmounted(() => {
            stopMessages();
            if (stopTracking) {
                stopTracking();
                stopTracking = null;
            }
        });

        return {
            rootRef,
            frameEl,
            videoEl,
            isLoading,
            hasError,
            loadingLabel,
            ambientImage,
            isNative,
            videoUrl,
            subtitles,
            resolutions,
            isResolving,
            resolveError,
            onLoad,
            onError,
            retry,
            resolveStream,
            onResolutionChange
        };
    }
});
</script>

<style lang="scss" scoped>
.stream-frame {
    position: relative;
    width: 100%;
    isolation: isolate;

    &__bloom {
        position: absolute;
        inset: -10% -5%;
        width: fit-content;
        background-size: cover;
        background-position: center;
        filter: blur(80px) saturate(1.4) brightness(0.55);
        opacity: 0.55;
        z-index: -1;
        pointer-events: none;

        &::after {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(
                ellipse at center,
                transparent 0%,
                var(--ink-900) 78%
            );
        }
    }

    &__stage {
        position: relative;
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--s-5) var(--s-4);

        @media (min-width: 768px) {
            padding: var(--s-6) var(--s-5);
        }
    }

    &__player {
        position: relative;
        aspect-ratio: 16 / 9;
        background: #000;
        border-radius: var(--r-lg);
        overflow: hidden;
        box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.6),
            0 0 60px rgba(var(--ambient), 0.18),
            0 0 0 1px var(--rule);
        transition: box-shadow var(--dur-slow) var(--ease-out);
    }

    &__native-wrapper {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #000;
    }

    &__video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;

        &::cue {
            background: rgba(11, 10, 8, 0.85);
            color: var(--bone-50);
            font-family: var(--font-ui);
            font-size: var(--fs-lg);
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
            border-radius: var(--r-md);
        }
    }

    &__settings-bar {
        position: absolute;
        bottom: 50px;
        right: var(--s-4);
        display: flex;
        align-items: center;
        gap: var(--s-3);
        background: rgba(11, 10, 8, 0.85);
        backdrop-filter: blur(8px);
        padding: 0.5rem 0.85rem;
        border-radius: var(--r-pill);
        box-shadow: inset 0 0 0 1px var(--rule);
        z-index: 10;
        pointer-events: auto;
        opacity: 0;
        transition: opacity var(--dur-fast) var(--ease-out);

        .stream-frame__player:hover & {
            opacity: 1;
        }

        .meta {
            color: var(--bone-400);
            font-weight: 600;
            font-size: var(--fs-xs);
            letter-spacing: var(--ls-micro);
            text-transform: uppercase;
        }
    }

    &__selector {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--bone-100);
        font-family: var(--font-ui);
        font-size: var(--fs-sm);

        select {
            background: var(--surface-tint);
            border: 1px solid var(--rule-strong);
            color: var(--bone-50);
            font-size: var(--fs-xs);
            font-weight: 600;
            border-radius: var(--r-md);
            padding: 2px 6px;
            cursor: pointer;
            outline: none;
            transition: background var(--dur-fast) var(--ease-out);

            &:hover {
                background: var(--surface-tint-hover);
            }
        }
    }

    &__iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
    }

    &__loading {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: var(--ink-900);
        z-index: 5;
    }

    &__skeleton {
        position: absolute;
        inset: 0;
        background:
            linear-gradient(
                100deg,
                rgba(255, 255, 255, 0) 30%,
                rgba(255, 255, 255, 0.04) 50%,
                rgba(255, 255, 255, 0) 70%
            ) var(--ink-800);
        background-size: 220% 100%;
        animation: streamFrameShimmer 2.4s infinite ease-in-out;
    }

    &__loader {
        position: relative;
        z-index: 1;
        display: grid;
        gap: var(--s-3);
        justify-items: center;
        color: var(--bone-200);
    }

    &__spinner {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid var(--rule-strong);
        border-top-color: var(--ember);
        animation: streamFrameSpin 1.1s linear infinite;
    }

    &__error {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        gap: var(--s-3);
        text-align: center;
        padding: var(--s-6);
        background: var(--ink-900);
        z-index: 5;

        h3 {
            font-family: var(--font-display);
            font-size: var(--fs-2xl);
            color: var(--bone-50);
            margin: 0;
            letter-spacing: var(--ls-tight);
        }
    }

    &__error-message {
        color: var(--bone-200);
        max-width: 360px;
        margin: 0 auto;
    }

    &__retry {
        margin-top: var(--s-2);
        padding: 0.65rem 1.4rem;
        background: var(--ember);
        color: var(--ink-900);
        border: 0;
        border-radius: var(--r-pill);
        font-family: var(--font-ui);
        font-weight: 600;
        cursor: pointer;
        transition:
            background-color var(--dur-fast) var(--ease-out),
            transform var(--dur-fast) var(--ease-out);

        &:hover {
            background: var(--ember-600);
            transform: translateY(-1px);
        }
    }
}

@keyframes streamFrameShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes streamFrameSpin {
    to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
    .stream-frame__skeleton,
    .stream-frame__spinner {
        animation: none;
    }
}
</style>
