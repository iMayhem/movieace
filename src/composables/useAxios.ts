import axios from 'axios'
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.themoviedb.org/3/'
const API_KEY = import.meta.env.VITE_API_KEY || 'dfa4c2c7c1de1005adee824dc5593672'
const useAxios = () => {
    const axiosInstance = axios.create({
        baseURL: BASE_URL,
        params: {
            api_key: API_KEY
        },
        headers: {
            'Content-Type': 'application/json',
        }
    })
    return axiosInstance
}
export default useAxios