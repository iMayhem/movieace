import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function useIsMobileApp() {
    const route = useRoute();
    return computed(() => route.path === '/m' || route.path.startsWith('/m/'));
}

export function useAppPaths() {
    const isMobile = useIsMobileApp();
    const prefix = computed(() => (isMobile.value ? '/m' : ''));

    const home = computed(() => (isMobile.value ? '/m' : '/'));

    function movie(id: number | string) {
        return `${prefix.value}/movie/${id}`;
    }

    function tvShow(id: number | string) {
        return `${prefix.value}/tv-show/${id}`;
    }

    function anime(id: number | string) {
        return `${prefix.value}/anime/${id}`;
    }

    function actor(id: number | string) {
        return `${prefix.value}/actor/${id}`;
    }

    function streamMovie(id: number | string) {
        return `${prefix.value}/stream/movie/${id}`;
    }

    function streamTvShow(id: number | string, season: number | string, episode: number | string) {
        return `${prefix.value}/stream/tv-show/${id}/season/${season}/episode/${episode}`;
    }

    function streamAnime(id: number | string, episode?: number | string) {
        if (episode != null) return `${prefix.value}/stream/anime/${id}/episode/${episode}`;
        return `${prefix.value}/stream/anime/${id}`;
    }

    function detailPath(type: 'movie' | 'tv' | 'anime', id: number | string) {
        if (type === 'tv') return tvShow(id);
        if (type === 'anime') return anime(id);
        return movie(id);
    }

    const movies = computed(() => `${prefix.value}/movies`);
    const tvShows = computed(() => `${prefix.value}/tv-shows`);
    const animeList = computed(() => `${prefix.value}/anime`);
    const search = computed(() => `${prefix.value}/search`);
    const watchlist = computed(() => `${prefix.value}/watchlist`);
    const actors = computed(() => `${prefix.value}/actors`);

    const streamMovieRouteName = computed(() => (isMobile.value ? 'm-StreamMovie' : 'StreamMovie'));
    const streamTvRouteName = computed(() => (isMobile.value ? 'm-StreamTVShow' : 'StreamTVShow'));
    const streamAnimeRouteName = computed(() => (isMobile.value ? 'm-StreamAnime' : 'StreamAnime'));
    const streamAnimeEpisodeRouteName = computed(() =>
        isMobile.value ? 'm-StreamAnimeEpisode' : 'StreamAnimeEpisode'
    );

    return {
        isMobile,
        prefix,
        home,
        movies,
        tvShows,
        animeList,
        search,
        watchlist,
        actors,
        movie,
        tvShow,
        anime,
        actor,
        streamMovie,
        streamTvShow,
        streamAnime,
        detailPath,
        streamMovieRouteName,
        streamTvRouteName,
        streamAnimeRouteName,
        streamAnimeEpisodeRouteName
    };
}
