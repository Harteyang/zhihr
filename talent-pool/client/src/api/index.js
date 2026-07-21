import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip/api'

const api = axios.create({ baseURL, timeout: 30000 })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      const refreshTokenStr = localStorage.getItem('refreshToken')

      if (refreshTokenStr) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const res = await api.post('/auth/refresh', { refreshToken: refreshTokenStr })
          const { token: newToken, refreshToken: newRefreshToken } = res.data.data

          localStorage.setItem('token', newToken)
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken)
          }

          processQueue(null, newToken)

          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          const { default: router } = await import('../router')
          router.push('/login')
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // No refresh token available, redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      const { default: router } = await import('../router')
      router.push('/login')
    }

    return Promise.reject(error)
  }
)

export * from './auth.js'
export * from './candidates.js'
export * from './attachments.js'
export * from './parse-queue.js'
export * from './users.js'
export * from './evaluations.js'
export * from './share.js'
export * from './resume-share.js'

export default api
