import { ref } from 'vue';

export interface AnimeMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  bannerImage: string | null;
  description: string | null;
  averageScore: number | null;
  genres: string[];
  seasonYear: number | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
}

export interface AnimeResponse {
  data: {
    Page: {
      media: AnimeMedia[];
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
        perPage: number;
      };
    };
  };
}

const ANILIST_API = 'https://graphql.anilist.co';

async function queryAniList(query: string, variables: any): Promise<any> {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.statusText}`);
  }

  return response.json();
}

export function useAniList() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTrendingAnime = async (page = 1, perPage = 20) => {
    loading.value = true;
    error.value = null;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            description
            averageScore
            genres
            seasonYear
            episodes
            format
            status
          }
        }
      }
    `;

    try {
      const response = await queryAniList(query, { page, perPage });
      loading.value = false;
      return response as AnimeResponse;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
      throw err;
    }
  };

  const fetchPopularAnime = async (page = 1, perPage = 20) => {
    loading.value = true;
    error.value = null;

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            description
            averageScore
            genres
            seasonYear
            episodes
            format
            status
          }
        }
      }
    `;

    try {
      const response = await queryAniList(query, { page, perPage });
      loading.value = false;
      return response as AnimeResponse;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
      throw err;
    }
  };

  const searchAnime = async (searchTerm: string, page = 1, perPage = 20) => {
    loading.value = true;
    error.value = null;

    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(type: ANIME, search: $search) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            description
            averageScore
            genres
            seasonYear
            episodes
            format
            status
          }
        }
      }
    `;

    try {
      const response = await queryAniList(query, { search: searchTerm, page, perPage });
      loading.value = false;
      return response as AnimeResponse;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
      throw err;
    }
  };

  const fetchAnimeById = async (id: number) => {
    loading.value = true;
    error.value = null;

    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description
          averageScore
          genres
          seasonYear
          episodes
          format
          status
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          studios {
            nodes {
              name
            }
          }
          trailer {
            id
            site
          }
          nextAiringEpisode {
            airingAt
            timeUntilAiring
            episode
          }
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                  english
                  native
                }
                type
                format
                episodes
                seasonYear
                coverImage {
                  large
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await queryAniList(query, { id });
      loading.value = false;
      return response;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
      throw err;
    }
  };

  const discoverAnime = async (options: {
    page?: number;
    perPage?: number;
    genres?: string[];
    yearStart?: number;
    yearEnd?: number;
    sort?: string;
  }) => {
    loading.value = true;
    error.value = null;

    const query = `
      query ($page: Int, $perPage: Int, $genres: [String], $startDateGreater: FuzzyDateInt, $startDateLesser: FuzzyDateInt, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(
            type: ANIME,
            genre_in: $genres,
            startDate_greater: $startDateGreater,
            startDate_lesser: $startDateLesser,
            sort: $sort
          ) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            description
            averageScore
            genres
            seasonYear
            episodes
            format
            status
          }
        }
      }
    `;

    const variables: any = {
      page: options.page || 1,
      perPage: options.perPage || 20,
    };

    if (options.genres && options.genres.length > 0) {
      variables.genres = options.genres;
    }
    
    if (options.yearStart) {
      // YYYY0000 to get anything starting in or after that year
      variables.startDateGreater = (options.yearStart - 1) * 10000 + 1231;
    }
    
    if (options.yearEnd) {
      // YYYY1231 to get anything starting in or before that year
      variables.startDateLesser = options.yearEnd * 10000 + 1231;
    }

    if (options.sort) {
      variables.sort = [options.sort];
    }

    try {
      const response = await queryAniList(query, variables);
      loading.value = false;
      return response as AnimeResponse;
    } catch (err: any) {
      error.value = err.message;
      loading.value = false;
      throw err;
    }
  };

  return {
    loading,
    error,
    fetchTrendingAnime,
    fetchPopularAnime,
    searchAnime,
    fetchAnimeById,
    discoverAnime
  };
}
