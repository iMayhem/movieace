import empty_movie_state from '../assets/img/empty-movie-state.png';
import { Movie } from '../composables/useHighlights';
import { MovieDetails } from '../composables/useMovies';
import { TVShowDetails } from '../composables/useTvShows';

const IMAGE_BASEURL = import.meta.env.VITE_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/';
const USE_WSRV = true; // Enable wsrv.nl optimization

const selectSize = (size: "medium" | "large" | "small") => {
    const sizeOptions = {
        small: "w300",
        medium: "w500",
        large: "w780",
    }
    return sizeOptions[size] || sizeOptions.medium
}

const optimizeWithWsrv = (tmdbUrl: string, width: number) => {
    // wsrv.nl format: https://wsrv.nl/?url={image_url}&w={width}&output=webp&q=85
    return `https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&w=${width}&output=webp&q=85`;
}

export const useWebImage = (url: string, size: "medium" | "large" | "small" = "medium") => {
    let imgSize = selectSize(size)
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url
    const tmdbUrl = `${baseUrl}${imgSize}/${cleanUrl}`;
    
    if (USE_WSRV) {
        const widthMap = { small: 300, medium: 500, large: 780 };
        return optimizeWithWsrv(tmdbUrl, widthMap[size]);
    }
    
    return tmdbUrl;
}

export const getMovieImageUrl = (data: Movie | MovieDetails | TVShowDetails) => {
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanBackdrop = data.backdrop_path ? (data.backdrop_path.startsWith('/') ? data.backdrop_path.slice(1) : data.backdrop_path) : null
    const cleanPoster = data.poster_path ? (data.poster_path.startsWith('/') ? data.poster_path.slice(1) : data.poster_path) : null

    let backdrop = cleanBackdrop === null ? empty_movie_state : `${baseUrl}w1280/${cleanBackdrop}`;
    let poster = cleanPoster === null ? empty_movie_state : `${baseUrl}w780/${cleanPoster}`;
    
    if (USE_WSRV && cleanBackdrop !== null) {
        backdrop = optimizeWithWsrv(backdrop, 1280);
    }
    if (USE_WSRV && cleanPoster !== null) {
        poster = optimizeWithWsrv(poster, 780);
    }
    
    return {
        backdrop,
        poster
    } as const;
}
