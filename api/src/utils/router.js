const DEBUG = true

function debugLog(module, ...args) {
  if (DEBUG) console.log(`[${module}]`, ...args)
}

function generateId() {
  return crypto.randomUUID()
}

function base64UrlEncode(data) {
  const uint8 = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let binary = ''
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function hashPassword(password) {
  const PBKDF2_ITERATIONS = 100000
  const SALT_LENGTH = 16
  const HASH_LENGTH = 32
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, HASH_LENGTH * 8
  )
  const hashArray = new Uint8Array(derivedBits)
  const combined = new Uint8Array(SALT_LENGTH + HASH_LENGTH)
  combined.set(salt, 0)
  combined.set(hashArray, SALT_LENGTH)
  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password, storedHash) {
  const PBKDF2_ITERATIONS = 100000
  const SALT_LENGTH = 16
  const HASH_LENGTH = 32
  const bytes = new Uint8Array(storedHash.match(/.{2}/g).map(byte => parseInt(byte, 16)))

  // 新格式：salt(16) + hash(32) = 48 字节 (96 位十六进制)
  if (bytes.length === SALT_LENGTH + HASH_LENGTH) {
    const salt = bytes.slice(0, SALT_LENGTH)
    const originalHash = bytes.slice(SALT_LENGTH)
    const derived = await deriveKey(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH)
    return { valid: timingSafeEqual(originalHash, derived), needsMigration: false }
  }

  // 旧格式：纯 hash(32) = 32 字节 (64 位十六进制)，使用 SHA-256 直接哈希
  if (bytes.length === HASH_LENGTH) {
    const encoder = new TextEncoder()
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(password)))
    if (timingSafeEqual(bytes, digest)) {
      // 验证通过，标记需要迁移到 PBKDF2 格式
      return { valid: true, needsMigration: true }
    }
    return { valid: false, needsMigration: false }
  }

  return { valid: false, needsMigration: false }
}

async function deriveKey(password, salt, iterations, length) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, length * 8
  )
  return new Uint8Array(derivedBits)
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function signJwt(payload, env, expiresIn = 3600) {
  const secret = env?.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  const ACCESS_TOKEN_EXPIRY = 3600
  const REFRESH_TOKEN_EXPIRY = 2592000
  const actualExpiry = expiresIn || ACCESS_TOKEN_EXPIRY
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payloadWithExp = { ...payload, iat: now, exp: now + actualExpiry }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payloadWithExp))
  const data = `${encodedHeader}.${encodedPayload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const encodedSignature = base64UrlEncode(new Uint8Array(signature))
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

async function verifyJwt(token, env) {
  const secret = env?.JWT_SECRET
  if (!secret) return null
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)))
    if (payload.exp < Date.now() / 1000) return null
    const data = `${encodedHeader}.${encodedPayload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const signature = base64UrlDecode(encodedSignature)
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data))
    return isValid ? payload : null
  } catch {
    return null
  }
}

function sanitizeInput(str, maxLength = 255) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLength)
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })
}

function getCorsHeaders(request, env) {
  const origins = env?.ALLOWED_ORIGINS || ''
  const allowedOrigins = origins.split(',').map(o => o.trim()).filter(Boolean)
  const origin = request.headers.get('Origin') || ''
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
}

async function checkRateLimit(env, key, maxRequests) {
  const RATE_LIMIT_WINDOW = 60
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `rl:${key}:${Math.floor(now / RATE_LIMIT_WINDOW)}`
  try {
    const count = await env.RATE_LIMITER?.get(windowKey)
    const current = parseInt(count || '0') + 1
    await env.RATE_LIMITER?.put(windowKey, String(current), {
      expirationTtl: RATE_LIMIT_WINDOW
    })
    return current <= maxRequests
  } catch {
    return true
  }
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return '密码至少8位'
  }
  if (password.length > 128) {
    return '密码不能超过128位'
  }
  if (!/[a-z]/.test(password)) {
    return '密码必须包含小写字母'
  }
  if (!/[A-Z]/.test(password)) {
    return '密码必须包含大写字母'
  }
  if (!/[0-9]/.test(password)) {
    return '密码必须包含数字'
  }
  return null
}

function maskError(error) {
  const message = error?.message || String(error)
  if (message.includes('UNIQUE constraint')) {
    return '该日期已存在复盘记录，请使用覆盖模式'
  }
  if (message.includes('no such table')) {
    return '数据库表不存在，请联系管理员'
  }
  return message || '服务器内部错误，请稍后重试'
}

function parsePagination(url) {
  const DEFAULT_PAGE_SIZE = 20
  const MAX_PAGE_SIZE = 100
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

async function getAuthenticatedUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const payload = await verifyJwt(token, env)
  if (!payload || payload.type !== 'access') return null
  return payload
}

async function getAuthUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyJwt(token, env)
  if (!payload || payload.type !== 'access') return null

  const user = await env.DB.prepare(
    'SELECT id, username, role, status FROM users WHERE id = ?'
  ).bind(payload.userId).first()

  if (!user || user.status === 'disabled') return null
  return { userId: user.id, username: user.username, role: user.role }
}

async function requireAuth(request, env, corsHeaders) {
  const user = await getAuthUser(request, env)
  if (!user) {
    return { user: null, error: jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders) }
  }
  return { user, error: null }
}

async function requireAdmin(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return { user: null, error }
  if (user.role !== 'admin') {
    return { user: null, error: jsonResponse({ success: false, message: '需要管理员权限' }, 403, corsHeaders) }
  }
  return { user, error: null }
}

async function getUserPositions(env, userId, role) {
  if (role === 'admin') return null
  const rows = await env.DB.prepare(
    'SELECT position FROM talent_user_positions WHERE user_id = ?'
  ).bind(userId).all()
  const positions = rows.results.map(r => r.position)
  // '*' 表示全部岗位权限，等效于管理员
  if (positions.includes('*')) return null
  return positions
}

async function logOperation(env, user, action, resourceType, resourceId, detail, ipAddress) {
  try {
    await env.DB.prepare(`
      INSERT INTO talent_operation_logs (user_id, username, action, resource_type, resource_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user?.userId || null, user?.username || null,
      action, resourceType || null, resourceId || null,
      detail ? JSON.stringify(detail) : null,
      ipAddress || null
    ).run()
  } catch (e) {
    debugLog('OperationLog', 'Failed to log:', e.message)
  }
}

const routes = []

export function register(module) {
  for (const route of module.routes) {
    routes.push(route)
  }
}

export function matchRoute(method, path) {
  for (const route of routes) {
    if (route.method === method && path === route.path) {
      return { handler: route.handler, params: {} }
    }
    const pattern = route.path.replace(/:[^/]+/g, '([^/]+)')
    if (route.method === method && new RegExp(`^${pattern}$`).test(path)) {
      return { handler: route.handler, params: extractParams(route.path, path) }
    }
  }
  return null
}

function extractParams(pattern, path) {
  const keys = pattern.match(/:([^/]+)/g) || []
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, '([^/]+)')}$`)
  const values = path.match(regex) || []
  return keys.reduce((acc, key, i) => ({ ...acc, [key.slice(1)]: values[i + 1] }), {})
}

export { DEBUG, debugLog, generateId, base64UrlEncode, base64UrlDecode, hashPassword, verifyPassword, signJwt, verifyJwt, sanitizeInput, jsonResponse, getCorsHeaders, getClientIp, checkRateLimit, validatePassword, maskError, parsePagination, getAuthenticatedUser, getAuthUser, requireAuth, requireAdmin, getUserPositions, logOperation }
