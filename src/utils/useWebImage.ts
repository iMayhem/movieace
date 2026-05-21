import empty_movie_state from '../assets/img/empty-movie-state.png';
import { Movie } from '../composables/useHighlights';
import { MovieDetails } from '../composables/useMovies';
import { TVShowDetails } from '../composables/useTvShows';

const IMAGE_BASEURL = import.meta.env.VITE_IMAGE_BASE_URL;

const selectSize = (size: "medium" | "large" | "small") => {
    const sizeOptions = {
        small: "w300",
        medium: "w500",
        large: "w780",
    }
    return sizeOptions[size] || sizeOptions.medium
}
export const useWebImage = (url: string, size: "medium" | "large" | "small" = "medium") => {
    let imgSize = selectSize(size)
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url
    return `${baseUrl}${imgSize}/${cleanUrl}`
}
// return {
//     backdrop: movie.value?.backdrop_path === null ? empty_movie_state : `${IMAGE_BASEURL}w1280${movie.value?.backdrop_path}`,
//     poster: movie.value?.poster_path === null ? empty_movie_state : `${IMAGE_BASEURL}w780${movie.value?.poster_path}`
// };
export const getMovieImageUrl = (data: Movie | MovieDetails | TVShowDetails) => {
    const baseUrl = IMAGE_BASEURL.endsWith('/') ? IMAGE_BASEURL : `${IMAGE_BASEURL}/`
    const cleanBackdrop = data.backdrop_path ? (data.backdrop_path.startsWith('/') ? data.backdrop_path.slice(1) : data.backdrop_path) : null
    const cleanPoster = data.poster_path ? (data.poster_path.startsWith('/') ? data.poster_path.slice(1) : data.poster_path) : null

    const backdrop = cleanBackdrop === null ? empty_movie_state : `${baseUrl}w1280/${cleanBackdrop}`;
    const poster = cleanPoster === null ? empty_movie_state : `${baseUrl}w780/${cleanPoster}`;
    return {
        backdrop,
        poster
    } as const;
}
