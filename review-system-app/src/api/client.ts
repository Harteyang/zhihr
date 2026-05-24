const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.zhihr.vip'

const DEBUG = import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true'

function truncate(obj: unknown, maxLen = 300): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

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
    if (!refreshToken) {
      DEBUG && console.log('[API] No refresh token found')
      return false
    }

    DEBUG && console.log('[API] Attempting token refresh...')
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (!data.success) {
        DEBUG && console.log('[API] Token refresh failed:', data.message)
        return false
      }

      localStorage.setItem('zhihr_access_token', data.data.token)
      localStorage.setItem('zhihr_refresh_token', data.data.refreshToken)
      DEBUG && console.log('[API] Token refresh success')
      return true
    } catch (e) {
      DEBUG && console.error('[API] Token refresh error:', e)
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
  let token: string | null = null
  if (auth) {
    token = localStorage.getItem('zhihr_access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  DEBUG && console.log(`[API] → ${method} ${endpoint}`, body ? truncate(body) : '')

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    DEBUG && console.error(`[API] ✗ Network error ${endpoint}:`, e)
    throw new NetworkError()
  }

  DEBUG && console.log(`[API] ← ${response.status} ${endpoint}`)

  if (response.status === 401 && auth && !skipRefresh) {
    DEBUG && console.log('[API] Got 401, attempting token refresh...')
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      DEBUG && console.log('[API] Token refreshed, retrying request...')
      return apiRequest<T>(endpoint, { ...options, skipRefresh: true })
    }
    DEBUG && console.log('[API] Token refresh failed, clearing auth')
    clearAuthStorage()
    throw new AuthError()
  }

  let data: { success: boolean; message?: string; data?: unknown }
  try {
    data = await response.json()
  } catch (e) {
    DEBUG && console.error(`[API] ✗ Invalid JSON response:`, e)
    throw new ApiError('服务器响应格式错误', response.status)
  }

  DEBUG && console.log(`[API] Response:`, truncate(data))

  if (!data.success) {
    DEBUG && console.error(`[API] ✗ Request failed:`, data.message)
    throw new ApiError(data.message || '请求失败', response.status)
  }

  return data as T
}

export function clearAuthStorage() {
  localStorage.removeItem('zhihr_access_token')
  localStorage.removeItem('zhihr_refresh_token')
  localStorage.removeItem('zhihr_user_id')
  localStorage.removeItem('zhihr_username')
}
