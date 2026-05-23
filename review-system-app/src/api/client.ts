const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.zhihr.vip'

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class AuthError extends ApiError {
  constructor(message = '登录已过期，请重新登录') {
    super(message, 401)
  }
}

export class NetworkError extends ApiError {
  constructor() {
    super('网络连接失败，请检查网络', 0)
  }
}

interface ApiRequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  skipRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('zhihr_refresh_token')
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (!data.success) return false

      localStorage.setItem('zhihr_access_token', data.data.token)
      localStorage.setItem('zhihr_refresh_token', data.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, skipRefresh = false } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = localStorage.getItem('zhihr_access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new NetworkError()
  }

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return apiRequest<T>(endpoint, { ...options, skipRefresh: true })
    clearAuthStorage()
    throw new AuthError()
  }

  const data = await response.json()
  if (!data.success) throw new ApiError(data.message || '请求失败', response.status)
  return data as T
}

export function clearAuthStorage() {
  localStorage.removeItem('zhihr_access_token')
  localStorage.removeItem('zhihr_refresh_token')
  localStorage.removeItem('zhihr_user_id')
  localStorage.removeItem('zhihr_username')
}
