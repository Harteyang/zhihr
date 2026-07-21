import { useAuthStore, getRefreshToken, setRefreshToken } from '@/stores/auth'

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
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (!data.success) return false

      setRefreshToken(data.data.refreshToken || null)
      useAuthStore.getState().setAuth({
        userId: useAuthStore.getState().userId || '',
        username: useAuthStore.getState().username || '',
        token: data.data.token,
      })
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function getToken(): string | null {
  // 优先从 SharedAuth 获取
  if (typeof SharedAuth !== 'undefined' && SharedAuth.getToken) {
    return SharedAuth.getToken()
  }
  return useAuthStore.getState().token
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, skipRefresh = false } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new NetworkError()
  } finally {
    clearTimeout(timeoutId)
  }

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return apiRequest<T>(endpoint, { ...options, skipRefresh: true })
    throw new AuthError()
  }

  const data = await response.json()
  if (!data.success) throw new ApiError(data.message || '请求失败', response.status)
  return data as T
}

export { API_BASE }