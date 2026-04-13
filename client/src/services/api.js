import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Use the build-time env var, but never point at localhost from a
// non-localhost browser (catches stale Docker images built with the
// old VITE_API_BASE_URL=http://localhost:5000/api dev value).
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL =
  typeof window !== 'undefined' &&
  rawBase.includes('localhost') &&
  window.location.hostname !== 'localhost'
    ? '/api'
    : rawBase;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest) return Promise.reject(error)

    const requestUrl = originalRequest?.url || ''
    const skipRefresh = Boolean(
      originalRequest?._skipAuthRefresh ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/verify-email')
    )
    if (skipRefresh) return Promise.reject(error)

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const { setTokens, logout } = useAuthStore.getState()

      try {
        const res = await axios.post(
          BASE_URL + '/auth/refresh',
          {},
          { withCredentials: true }
        )
        const { accessToken } = res.data
        setTokens(accessToken)
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        await logout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
