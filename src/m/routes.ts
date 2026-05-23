import type { RouteRecordRaw } from 'vue-router';

/** Mobile/tablet experience — all routes live under /m */
export const mobileRoutes: RouteRecordRaw[] = [
    {
        path: '/m',
        name: 'm-Home',
        component: () => import('./pages/Home.vue'),
        meta: { title: 'Home', mobileApp: true }
    },
    {
        path: '/m/movies',
        name: 'm-Movies',
        component: () => import('./pages/Movies.vue'),
        meta: { title: 'Movies', mobileApp: true }
    },
    {
        path: '/m/tv-shows',
        alias: '/m/tv',
        name: 'm-TVShows',
        component: () => import('./pages/TVShows.vue'),
        meta: { title: 'TV Shows', mobileApp: true }
    },
    {
        path: '/m/anime',
        name: 'm-Anime',
        component: () => import('./pages/Anime.vue'),
        meta: { title: 'Anime', mobileApp: true }
    },
    {
        path: '/m/search',
        name: 'm-Search',
        component: () => import('./pages/Search.vue'),
        meta: { title: 'Search', mobileApp: true }
    },
    {
        path: '/m/watchlist',
        name: 'm-Watchlist',
        component: () => import('./pages/Watchlist.vue'),
        meta: { title: 'Watchlist', mobileApp: true }
    },
    {
        path: '/m/actors',
        name: 'm-Actors',
        component: () => import('./pages/Actors.vue'),
        meta: { title: 'Actors', mobileApp: true }
    },
    {
        path: '/m/movie/:id',
        name: 'm-Movie',
        component: () => import('./pages/Movie.vue'),
        meta: { title: 'Movie', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/tv-show/:id',
        alias: '/m/tv/:id',
        name: 'm-TVShow',
        component: () => import('./pages/TVShow.vue'),
        meta: { title: 'TV Show', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/actor/:id',
        name: 'm-Actor',
        component: () => import('./pages/Actor.vue'),
        meta: { title: 'Actor', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/anime/:id',
        name: 'm-AnimeDetail',
        component: () => import('./pages/AnimeDetail.vue'),
        meta: { title: 'Anime', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/stream/movie/:id',
        alias: '/m/watch/movie/:id',
        name: 'm-StreamMovie',
        component: () => import('./pages/StreamMovie.vue'),
        meta: { title: 'Watch', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/stream/tv-show/:id/season/:season/episode/:episode',
        alias: '/m/watch/tv/:id/:season/:episode',
        name: 'm-StreamTVShow',
        component: () => import('./pages/StreamTVShow.vue'),
        meta: { title: 'Watch', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/stream/anime/:id',
        alias: '/m/watch/anime/:id',
        name: 'm-StreamAnime',
        component: () => import('./pages/StreamAnime.vue'),
        meta: { title: 'Watch Anime', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/stream/anime/:id/episode/:episode',
        alias: '/m/watch/anime/:id/:episode',
        name: 'm-StreamAnimeEpisode',
        component: () => import('./pages/StreamAnime.vue'),
        meta: { title: 'Watch Anime', mobileApp: true, showInHeader: false }
    },
    {
        path: '/m/:pathMatch(.*)*',
        name: 'm-NotFound',
        component: () => import('./pages/NotFound.vue'),
        meta: { title: 'Not Found', mobileApp: true, showInHeader: false }
    }
];

/** Must stay after specific /m routes; desktop 404 is registered after this array in routes/index.ts */
