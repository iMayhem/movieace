import empty_movie_state from '../assets/img/empty-movie-state.png';
import { Movie } from '../composables/useHighlights';
import { MovieDetails } from '../composables/useMovies';
import { TVShowDetails } from '../composables/useTvShows';

const IMAGE_BASEURL = import.meta.env.VITE_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/';
const USE_WSRV = true; // Enable wsrv.nl optimization

const selectSize = (size: "medium" | "large" | "small" | "xlarge") => {
    const sizeOptions = {
        small: "w500",      // Upgraded from w300 to w500
        medium: "w780",     // Upgraded from w500 to w780
        large: "original",  // Upgraded from w780 to original
        xlarge: "original"  // New size for maximum quality
    }
    return sizeOptions[size] || sizeOptions.medium
}

const optimizeWithWsrv = (tmdbUrl: string, width: number) => {
    // wsrv.nl format: https://wsrv.nl/?url={image_url}&w={width}&output=webp&q=90
    // Increased quality from 85 to 90 for better image quality
    return `https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&w=${width}&output=webp&q=90`;
}

export const useWebImage = (url: string, size: "medium" | "large" | "small" | "xlarge" = "medium") => {
    let resolvedUrl = url;
    if (url.startsWith('//')) {
        resolvedUrl = `https:${url}`;
    }

    if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
        return resolvedUrl;
    }

    let imgSize = selectSize(size)
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url
    const tmdbUrl = `${baseUrl}${imgSize}/${cleanUrl}`;
    
    if (USE_WSRV) {
        // Updated width map with higher quality sizes
        const widthMap = { small: 500, medium: 780, large: 1920, xlarge: 2560 };
        return optimizeWithWsrv(tmdbUrl, widthMap[size]);
    }
    
    return tmdbUrl;
}

export const getMovieImageUrl = (data: Movie | MovieDetails | TVShowDetails) => {
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanBackdrop = data.backdrop_path ? (data.backdrop_path.startsWith('/') ? data.backdrop_path.slice(1) : data.backdrop_path) : null
    const cleanPoster = data.poster_path ? (data.poster_path.startsWith('/') ? data.poster_path.slice(1) : data.poster_path) : null

    let backdrop = cleanBackdrop === null ? empty_movie_state : `${baseUrl}original/${cleanBackdrop}`;
    let poster = cleanPoster === null ? empty_movie_state : `${baseUrl}original/${cleanPoster}`;
    
    if (USE_WSRV && cleanBackdrop !== null) {
        backdrop = optimizeWithWsrv(backdrop, 1920); // Upgraded from 1280 to 1920
    }
    if (USE_WSRV && cleanPoster !== null) {
        poster = optimizeWithWsrv(poster, 1280); // Upgraded from 780 to 1280
    }
    
    return {
        backdrop,
        poster
    } as const;
}
