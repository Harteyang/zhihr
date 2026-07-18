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

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      const loginUrl = import.meta.env.BASE_URL + 'login'
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginUrl
      }
    }
    return Promise.reject(error)
  }
)

export * from './auth.js'
export * from './candidates.js'
export * from './attachments.js'
export * from './parse-queue.js'
export * from './users.js'

export default api
