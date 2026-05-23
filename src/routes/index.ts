import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { mobileRoutes } from '../m/routes'
import { shouldUseMobileSite } from '../utils/device'
import { isBypassPath, isMobileAppPath } from '../utils/mobileRedirect'
declare module 'vue-router' {
    interface RouteMeta {
        showInHeader?: boolean,
        title?: string
    }
}


const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../pages/Home.vue'),
        meta: {
            showInHeader: true,
            title: 'Home'
        }
    },
    {
        path: '/movies',
        name: 'Movies',
        component: () => import('../pages/Movies.vue'),
        meta: {
            showInHeader: true,
            title: 'Movies'
        }
    },
    {
        path: '/tv-shows',
        alias: '/tv',
        name: 'TVShows',
        component: () => import('../pages/TVShows.vue'),
        meta: {
            showInHeader: true,
            title: 'TV Shows'
        }
    },
    {
        path: '/anime',
        name: 'Anime',
        component: () => import('../pages/Anime.vue'),
        meta: {
            showInHeader: true,
            title: 'Anime'
        }
    },
    {
        'path': '/actors',
        'name': 'Actors',
        'component': () => import('../pages/Actors.vue'),
        meta: {
            showInHeader: true,
            title: 'Actors'
        }
    },
    {
        'path': '/movie/:id',
        'name': 'Movie',
        'component': () => import('../pages/Movie.vue'),
        meta: {
            showInHeader: false,
            title: 'Movie'
        }
    },
    {
        'path': '/tv-show/:id',
        alias: '/tv/:id',
        'name': 'TVShow',
        'component': () => import('../pages/TVShow.vue'),
        meta: {
            showInHeader: false,
            title: 'TV Show'
        }
    },
    {
        'path': '/actor/:id',
        'name': 'Actor',
        'component': () => import('../pages/Actor.vue'),
        meta: {
            showInHeader: false,
            title: 'Actor'
        }
    },
    {
        'path': '/search',
        'name': 'Search',
        'component': () => import('../pages/Search.vue'),
        meta: {
            showInHeader: true,
            title: 'Search'
        }
    },
    {
        path: '/watchlist',
        name: 'Watchlist',
        component: () => import('../pages/Watchlist.vue'),
        meta: {
            showInHeader: true,
            title: 'Watchlist'
        }
    },
    {
        'path': '/stream/movie/:id',
        alias: '/watch/movie/:id',
        'name': 'StreamMovie',
        'component': () => import('../pages/StreamMovie.vue'),
        meta: {
            showInHeader: false,
            title: 'Stream Movie'
        }
    },
    {
        'path': '/stream/tv-show/:id/season/:season/episode/:episode',
        alias: '/watch/tv/:id/:season/:episode',
        'name': 'StreamTVShow',
        'component': () => import('../pages/StreamTVShow.vue'),
        meta: {
            showInHeader: false,
            title: 'Stream TV Show'
        }
    },
    {
        'path': '/anime/:id',
        'name': 'AnimeDetail',
        'component': () => import('../pages/AnimeDetail.vue'),
        meta: {
            showInHeader: false,
            title: 'Anime Detail'
        }
    },
    {
        'path': '/stream/anime/:id',
        alias: '/watch/anime/:id',
        'name': 'StreamAnime',
        'component': () => import('../pages/StreamAnime.vue'),
        meta: {
            showInHeader: false,
            title: 'Stream Anime'
        }
    },
    {
        'path': '/stream/anime/:id/episode/:episode',
        alias: '/watch/anime/:id/:episode',
        'name': 'StreamAnimeEpisode',
        'component': () => import('../pages/StreamAnime.vue'),
        meta: {
            showInHeader: false,
            title: 'Stream Anime Episode'
        }
    },
    ...mobileRoutes,
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('../pages/NotFound.vue'),
        meta: {
            showInHeader: false,
            title: 'Not Found'
        }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
        if (savedPosition) return savedPosition;
        return { top: 0, left: 0 };
    }
});

router.beforeEach((to, _from, next) => {
    if (isBypassPath(to.path)) {
        next();
        return;
    }

    const useMobile = shouldUseMobileSite(
        typeof window !== 'undefined' ? window.location.search : ''
    );
    const onMobile = isMobileAppPath(to.path);

    if (useMobile && !onMobile) {
        next({
            path: to.path === '/' ? '/m' : `/m${to.path}`,
            query: to.query,
            hash: to.hash,
            replace: true
        });
        return;
    }

    if (!useMobile && onMobile) {
        const desktopPath = to.path === '/m' ? '/' : to.path.replace(/^\/m/, '') || '/';
        next({
            path: desktopPath,
            query: to.query,
            hash: to.hash,
            replace: true
        });
        return;
    }

    next();
});

export { router, routes }