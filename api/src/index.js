// ========================================
// 知HR API - ES Module 格式
// 安全加固版：PBKDF2 密码哈希、CORS 限制、限流、JWT 改进
// ========================================

const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const HASH_LENGTH = 32
const ACCESS_TOKEN_EXPIRY = 3600
const REFRESH_TOKEN_EXPIRY = 2592000
const RATE_LIMIT_WINDOW = 60
const RATE_LIMIT_MAX_AUTH = 10
const RATE_LIMIT_MAX_API = 60
const RATE_LIMIT_MAX_FEEDBACK = 3
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

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
  const combined = new Uint8Array(storedHash.match(/.{2}/g).map(byte => parseInt(byte, 16)))
  const salt = combined.slice(0, SALT_LENGTH)
  const originalHash = combined.slice(SALT_LENGTH)
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, HASH_LENGTH * 8
  )
  const newHash = new Uint8Array(derivedBits)
  if (originalHash.length !== newHash.length) return false
  let diff = 0
  for (let i = 0; i < originalHash.length; i++) {
    diff |= originalHash[i] ^ newHash[i]
  }
  return diff === 0
}

async function signJwt(payload, env, expiresIn = ACCESS_TOKEN_EXPIRY) {
  const secret = env?.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payloadWithExp = { ...payload, iat: now, exp: now + expiresIn }
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

function getAllowedOrigins(env) {
  const origins = env?.ALLOWED_ORIGINS || ''
  return origins.split(',').map(o => o.trim()).filter(Boolean)
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = getAllowedOrigins(env)
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }
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

function handleOptions(request, env) {
  return new Response(null, {
    headers: getCorsHeaders(request, env)
  })
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
}

async function checkRateLimit(env, key, maxRequests) {
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

function sanitizeInput(str, maxLength = 255) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLength)
}

function maskError(error) {
  // 在响应中包含错误详情以便调试，但不暴露内部实现
  const message = error?.message || String(error)
  // 对已知错误返回可读信息，未知错误返回通用提示
  if (message.includes('UNIQUE constraint')) {
    return '该日期已存在复盘记录，请使用覆盖模式'
  }
  if (message.includes('no such table')) {
    return '数据库表不存在，请联系管理员'
  }
  // 保留原始错误信息以便前端调试
  return message || '服务器内部错误，请稍后重试'
}

function parsePagination(url) {
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return handleOptions(request, env)
  }

  const corsHeaders = getCorsHeaders(request, env)
  const url = new URL(request.url)
  let path = url.pathname
  const method = request.method

  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1)
  }

  if (path === '/api/health') {
    return jsonResponse({ success: true, message: 'API is running' }, 200, corsHeaders)
  }

  const clientIp = getClientIp(request)

  if (path === '/api/auth/register' && method === 'POST') {
    if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
      return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
    }
    return handleRegister(request, env, corsHeaders)
  }

  if (path === '/api/auth/login' && method === 'POST') {
    if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
      return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
    }
    return handleLogin(request, env, corsHeaders)
  }

  if (path === '/api/auth/refresh' && method === 'POST') {
    return handleRefreshToken(request, env, corsHeaders)
  }

  if (path === '/api/auth/me' && method === 'GET') {
    return handleMe(request, env, corsHeaders)
  }

  if (path === '/api/tasks') {
    if (!await checkRateLimit(env, `api:${clientIp}`, RATE_LIMIT_MAX_API)) {
      return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
    }
    if (method === 'GET') return handleGetTasks(request, env, corsHeaders)
    if (method === 'POST') return handleCreateTask(request, env, corsHeaders)
  }

  if (path.match(/^\/api\/tasks\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateTask(request, id, env, corsHeaders)
    if (method === 'DELETE') return handleDeleteTask(request, id, env, corsHeaders)
  }

  if (path === '/api/categories') {
    if (method === 'GET') return handleGetCategories(request, env, corsHeaders)
    if (method === 'POST') return handleCreateCategory(request, env, corsHeaders)
  }

  if (path.match(/^\/api\/categories\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'DELETE') return handleDeleteCategory(request, id, env, corsHeaders)
  }

  if (path === '/api/reviews/sync' && method === 'POST') {
    return handleSyncReviews(request, env, corsHeaders)
  }

  if (path === '/api/reviews') {
    if (method === 'GET') return handleGetReviews(request, env, corsHeaders)
    if (method === 'POST') return handleCreateReview(request, env, corsHeaders)
    if (method === 'PUT') return handleUpdateReviewByDate(request, env, corsHeaders)
  }

  if (path.match(/^\/api\/reviews\/[a-zA-Z0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateReview(request, id, env, corsHeaders)
    if (method === 'DELETE') return handleDeleteReview(request, id, env, corsHeaders)
  }

  if (path === '/api/config') {
    if (method === 'GET') return handleGetConfig(request, env, corsHeaders)
    if (method === 'PUT') return handleUpdateConfig(request, env, corsHeaders)
  }

  if (path === '/api/feedbacks') {
    if (method === 'GET') return handleGetFeedbacks(request, env, corsHeaders)
    if (method === 'POST') {
      if (!await checkRateLimit(env, `feedback:${clientIp}`, RATE_LIMIT_MAX_FEEDBACK)) {
        return jsonResponse({ success: false, message: '反馈提交过于频繁，请稍后重试' }, 429, corsHeaders)
      }
      return handleCreateFeedback(request, env, corsHeaders)
    }
  }

  // 数据库迁移接口 - 移除 reviews 表的唯一约束
  if (path === '/api/admin/migrate-reviews' && method === 'POST') {
    return handleMigrateReviews(request, env, corsHeaders)
  }

  if (path.match(/^\/api\/feedbacks\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateFeedback(request, id, env, corsHeaders)
  }

  return jsonResponse({ success: false, message: 'Not found' }, 404, corsHeaders)
}

async function handleRegister(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password

    if (!username || username.length < 3) {
      return jsonResponse({ success: false, message: '账号至少3位' }, 400, corsHeaders)
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return jsonResponse({ success: false, message: '账号只能包含字母、数字、下划线和中文' }, 400, corsHeaders)
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return jsonResponse({ success: false, message: passwordError }, 400, corsHeaders)
    }

    const db = env.DB
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()

    if (existing) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400, corsHeaders)
    }

    const passwordHash = await hashPassword(password)
    const userId = generateId()

    await db.prepare('INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, username, passwordHash, new Date().toISOString(), new Date().toISOString()).run()

    const accessToken = await signJwt({ userId, username, type: 'access' }, env, ACCESS_TOKEN_EXPIRY)
    const refreshToken = await signJwt({ userId, username, type: 'refresh' }, env, REFRESH_TOKEN_EXPIRY)

    return jsonResponse({
      success: true, message: '注册成功',
      data: { userId, username, token: accessToken, refreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleLogin(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password

    if (!username || !password) {
      return jsonResponse({ success: false, message: '请输入账号和密码' }, 400, corsHeaders)
    }

    const db = env.DB
    const user = await db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').bind(username).first()

    if (!user) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400, corsHeaders)
    }

    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400, corsHeaders)
    }

    const accessToken = await signJwt({ userId: user.id, username: user.username, type: 'access' }, env, ACCESS_TOKEN_EXPIRY)
    const refreshToken = await signJwt({ userId: user.id, username: user.username, type: 'refresh' }, env, REFRESH_TOKEN_EXPIRY)

    return jsonResponse({
      success: true, message: '登录成功',
      data: { userId: user.id, username: user.username, token: accessToken, refreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleRefreshToken(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const refreshToken = body.refreshToken

    if (!refreshToken) {
      return jsonResponse({ success: false, message: '缺少 refresh token' }, 400, corsHeaders)
    }

    const payload = await verifyJwt(refreshToken, env)
    if (!payload || payload.type !== 'refresh') {
      return jsonResponse({ success: false, message: '无效的 refresh token' }, 401, corsHeaders)
    }

    const accessToken = await signJwt(
      { userId: payload.userId, username: payload.username, type: 'access' }, env, ACCESS_TOKEN_EXPIRY
    )
    const newRefreshToken = await signJwt(
      { userId: payload.userId, username: payload.username, type: 'refresh' }, env, REFRESH_TOKEN_EXPIRY
    )

    return jsonResponse({
      success: true,
      data: { token: accessToken, refreshToken: newRefreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleMe(request, env, corsHeaders) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  const payload = await verifyJwt(token, env)
  if (!payload || payload.type !== 'access') {
    return jsonResponse({ success: false, message: '无效的token' }, 401, corsHeaders)
  }

  return jsonResponse({ success: true, data: { userId: payload.userId, username: payload.username } }, 200, corsHeaders)
}

async function getAuthenticatedUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const payload = await verifyJwt(token, env)
  if (!payload || payload.type !== 'access') return null
  return payload
}

async function handleGetTasks(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')

    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?'
    let query = 'SELECT * FROM tasks WHERE user_id = ?'
    const params = [user.userId]
    const countParams = [user.userId]

    if (status) {
      query += ' AND status = ?'
      countQuery += ' AND status = ?'
      params.push(status)
      countParams.push(status)
    }
    if (priority) {
      query += ' AND priority = ?'
      countQuery += ' AND priority = ?'
      params.push(priority)
      countParams.push(priority)
    }
    if (category) {
      query += ' AND category = ?'
      countQuery += ' AND category = ?'
      params.push(category)
      countParams.push(category)
    }
    if (search) {
      const searchTerm = `%${sanitizeInput(search, 100)}%`
      query += ' AND (title LIKE ? OR description LIKE ?)'
      countQuery += ' AND (title LIKE ? OR description LIKE ?)'
      params.push(searchTerm, searchTerm)
      countParams.push(searchTerm, searchTerm)
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const tasks = await db.prepare(query).bind(...params).all()

    return jsonResponse({
      success: true,
      data: tasks.results,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateTask(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const title = sanitizeInput(body.title, 200)
    const description = sanitizeInput(body.description, 2000)
    const category = sanitizeInput(body.category, 50)
    const priority = sanitizeInput(body.priority, 10) || '中'
    const due_date = body.due_date || null
    const status = sanitizeInput(body.status, 20) || '待办'

    if (!title) {
      return jsonResponse({ success: false, message: '任务标题不能为空' }, 400, corsHeaders)
    }

    const db = env.DB
    const taskId = generateId()

    await db.prepare('INSERT INTO tasks (id, user_id, title, description, category, priority, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(taskId, user.userId, title, description || null, category || null, priority, due_date, status, new Date().toISOString(), new Date().toISOString()).run()

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first()

    return jsonResponse({ success: true, message: '创建成功', data: task }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateTask(request, taskId, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const updates = await request.json()
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      params.push(sanitizeInput(updates.title, 200))
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      params.push(sanitizeInput(updates.description, 2000))
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      params.push(sanitizeInput(updates.category, 50))
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      params.push(sanitizeInput(updates.priority, 10))
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?')
      params.push(updates.due_date)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(sanitizeInput(updates.status, 20))
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(taskId)
    params.push(user.userId)

    await db.prepare('UPDATE tasks SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first()

    return jsonResponse({ success: true, message: '更新成功', data: task }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteTask(request, taskId, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGetCategories(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()

    return jsonResponse({ success: true, data: categories.results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateCategory(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const name = sanitizeInput(body.name, 50)

    if (!name) {
      return jsonResponse({ success: false, message: '分类名称不能为空' }, 400, corsHeaders)
    }

    const db = env.DB

    try {
      await db.prepare('INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind(generateId(), user.userId, name, new Date().toISOString()).run()
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return jsonResponse({ success: false, message: '分类已存在' }, 400, corsHeaders)
      }
      throw e
    }

    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()

    return jsonResponse({ success: true, message: '创建成功', data: categories.results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteCategory(request, categoryId, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(categoryId, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '分类不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(categoryId, user.userId).run()

    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()

    return jsonResponse({ success: true, message: '删除成功', data: categories.results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGetReviews(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?'
    let query = 'SELECT * FROM reviews WHERE user_id = ?'
    const params = [user.userId]
    const countParams = [user.userId]

    if (startDate) {
      query += ' AND review_date >= ?'
      countQuery += ' AND review_date >= ?'
      params.push(startDate)
      countParams.push(startDate)
    }
    if (endDate) {
      query += ' AND review_date <= ?'
      countQuery += ' AND review_date <= ?'
      params.push(endDate)
      countParams.push(endDate)
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0

    query += ' ORDER BY review_date DESC, created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const reviews = await db.prepare(query).bind(...params).all()

    return jsonResponse({
      success: true,
      data: reviews.results.map(r => ({
        id: r.id,
        date: r.review_date,  // 前端期望 date 字段
        title: r.title,
        content: r.content ? JSON.parse(r.content) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateReview(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    // 兼容前端字段名: date->review_date, summary->title
    const review_date = body.review_date || body.date || new Date().toISOString().split('T')[0]
    const title = sanitizeInput(body.title || body.summary, 200) || review_date
    // content 可能是对象或字符串，统一处理为字符串存储
    let contentStr = null
    if (body.content) {
      contentStr = typeof body.content === 'string' ? body.content : JSON.stringify(body.content)
    }

    const db = env.DB
    // 使用前端提供的id或生成新id
    const reviewId = body.id || generateId()

    // 如果前端提供了id，先检查是否已存在（支持幂等创建）
    if (body.id) {
      const existing = await db.prepare('SELECT id FROM reviews WHERE id = ? AND user_id = ?').bind(body.id, user.userId).first()
      if (existing) {
        // 记录已存在，转为更新操作
        await db.prepare('UPDATE reviews SET title = ?, content = ?, review_date = ?, updated_at = ? WHERE id = ? AND user_id = ?')
          .bind(title, contentStr, review_date, new Date().toISOString(), body.id, user.userId).run()
        const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(body.id).first()
        return jsonResponse({
          success: true,
          message: '更新成功',
          data: {
            id: review.id,
            date: review.review_date,
            title: review.title,
            content: review.content ? JSON.parse(review.content) : null,
            createdAt: review.created_at,
            updatedAt: review.updated_at
          }
        }, 200, corsHeaders)
      }
    }

    // 检查是否存在唯一约束冲突（user_id + review_date）
    const existingByDate = await db.prepare('SELECT id FROM reviews WHERE user_id = ? AND review_date = ? ORDER BY updated_at DESC LIMIT 1').bind(user.userId, review_date).first()
    if (existingByDate) {
      // 同日已有记录，转为更新操作（兼容旧版唯一约束）
      await db.prepare('UPDATE reviews SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(title, contentStr, new Date().toISOString(), existingByDate.id, user.userId).run()
      const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(existingByDate.id).first()
      return jsonResponse({
        success: true,
        message: '已更新现有记录',
        data: {
          id: review.id,
          date: review.review_date,
          title: review.title,
          content: review.content ? JSON.parse(review.content) : null,
          createdAt: review.created_at,
          updatedAt: review.updated_at
        }
      }, 200, corsHeaders)
    }

    await db.prepare('INSERT INTO reviews (id, user_id, title, content, review_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(reviewId, user.userId, title, contentStr, review_date, new Date().toISOString(), new Date().toISOString()).run()

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first()

    return jsonResponse({
      success: true,
      message: '创建成功',
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? JSON.parse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

// 按日期更新复盘记录 - 前端使用date字段
async function handleUpdateReviewByDate(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const db = env.DB

    // 前端发送 date 字段
    const reviewDate = body.date
    if (!reviewDate) {
      return jsonResponse({ success: false, message: '日期不能为空' }, 400, corsHeaders)
    }

    // 查找该日期的最新记录（支持同日多条记录）
    const existing = await db.prepare('SELECT * FROM reviews WHERE user_id = ? AND review_date = ? ORDER BY updated_at DESC LIMIT 1').bind(user.userId, reviewDate).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

    // 兼容前端字段名: summary->title
    if (body.title !== undefined) {
      fields.push('title = ?')
      params.push(sanitizeInput(body.title, 200))
    } else if (body.summary !== undefined) {
      fields.push('title = ?')
      params.push(sanitizeInput(body.summary, 200))
    }
    if (body.content !== undefined) {
      fields.push('content = ?')
      params.push(typeof body.content === 'string' ? body.content : JSON.stringify(body.content))
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(existing.id)
    params.push(user.userId)

    await db.prepare('UPDATE reviews SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(existing.id).first()

    return jsonResponse({
      success: true,
      message: '更新成功',
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? JSON.parse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateReview(request, reviewId, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const updates = await request.json()
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

    // 兼容前端字段名: summary->title, date->review_date
    if (updates.title !== undefined) {
      fields.push('title = ?')
      params.push(sanitizeInput(updates.title, 200))
    } else if (updates.summary !== undefined) {
      fields.push('title = ?')
      params.push(sanitizeInput(updates.summary, 200))
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      params.push(typeof updates.content === 'string' ? updates.content : JSON.stringify(updates.content))
    }
    if (updates.review_date !== undefined) {
      fields.push('review_date = ?')
      params.push(updates.review_date)
    } else if (updates.date !== undefined) {
      fields.push('review_date = ?')
      params.push(updates.date)
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(reviewId)
    params.push(user.userId)

    await db.prepare('UPDATE reviews SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first()

    return jsonResponse({
      success: true,
      message: '更新成功',
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? JSON.parse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteReview(request, reviewId, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleSyncReviews(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const { reviews: clientReviews } = body

    if (!Array.isArray(clientReviews)) {
      return jsonResponse({ success: false, message: '无效的数据格式' }, 400, corsHeaders)
    }

    const db = env.DB

    const serverReviews = await db.prepare('SELECT * FROM reviews WHERE user_id = ?').bind(user.userId).all()
    const serverMap = new Map(serverReviews.results.map(r => [r.id, r]))

    // Collect all operations for batch execution
    const batchOps = []
    let synced = 0
    for (const review of clientReviews) {
      if (!review.id || !review.date) continue

      const content = review.content ? (typeof review.content === 'string' ? review.content : JSON.stringify(review.content)) : null
      const serverReview = serverMap.get(review.id)

      if (!serverReview) {
        const reviewId = review.id || generateId()
        batchOps.push(
          db.prepare('INSERT INTO reviews (id, user_id, title, content, review_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(reviewId, user.userId, review.summary || review.date, content, review.date, new Date().toISOString(), new Date().toISOString())
        )
        synced++
      } else {
        const clientUpdated = new Date(review.updatedAt || 0).getTime()
        const serverUpdated = new Date(serverReview.updated_at).getTime()

        if (clientUpdated > serverUpdated) {
          batchOps.push(
            db.prepare('UPDATE reviews SET title = ?, content = ?, review_date = ?, updated_at = ? WHERE id = ? AND user_id = ?')
              .bind(review.summary || serverReview.title, content, review.date, new Date().toISOString(), review.id, user.userId)
          )
          synced++
        }
      }
    }

    // Execute all operations in a single batch for atomicity
    if (batchOps.length > 0) {
      await db.batch(batchOps)
    }

    const allReviews = await db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY review_date DESC').bind(user.userId).all()

    return jsonResponse({
      success: true,
      data: allReviews.results.map(r => ({
        id: r.id,
        date: r.review_date,  // 前端期望 date 字段
        title: r.title,
        content: r.content ? JSON.parse(r.content) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      synced
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGetConfig(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const config = await db.prepare('SELECT config FROM user_configs WHERE user_id = ?').bind(user.userId).first()

    return jsonResponse({
      success: true,
      data: config ? { config: config.config } : { config: null }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateConfig(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const config = body.config

    if (config && JSON.stringify(config).length > 10000) {
      return jsonResponse({ success: false, message: '配置数据过大' }, 400, corsHeaders)
    }

    const db = env.DB
    const configStr = typeof config === 'string' ? config : JSON.stringify(config || {})

    const existing = await db.prepare('SELECT id FROM user_configs WHERE user_id = ?').bind(user.userId).first()

    if (existing) {
      await db.prepare('UPDATE user_configs SET config = ?, updated_at = ? WHERE user_id = ?')
        .bind(configStr, new Date().toISOString(), user.userId).run()
    } else {
      await db.prepare('INSERT INTO user_configs (id, user_id, config, updated_at) VALUES (?, ?, ?, ?)')
        .bind(generateId(), user.userId, configStr, new Date().toISOString()).run()
    }

    return jsonResponse({ success: true, message: '配置已保存' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGetFeedbacks(request, env, corsHeaders) {
  try {
    const db = env.DB
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const status = url.searchParams.get('status')

    let countQuery = 'SELECT COUNT(*) as total FROM feedbacks'
    let query = 'SELECT * FROM feedbacks'
    const params = []
    const countParams = []

    if (status) {
      query += ' WHERE status = ?'
      countQuery += ' WHERE status = ?'
      params.push(sanitizeInput(status, 20))
      countParams.push(sanitizeInput(status, 20))
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const feedbacks = await db.prepare(query).bind(...params).all()

    return jsonResponse({
      success: true,
      data: feedbacks.results,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

// 数据库迁移核心逻辑：移除 reviews 表的 UNIQUE(user_id, review_date) 约束
// SQLite/D1 不支持 ALTER TABLE DROP CONSTRAINT，需要重建表
async function migrateReviewsRemoveUniqueConstraint(db) {
  // 检查当前表结构是否有唯一约束
  const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reviews'").first()
  const currentSchema = tableInfo?.sql || ''

  if (!currentSchema.includes('UNIQUE')) {
    return { migrated: false, message: 'reviews 表没有唯一约束，无需迁移', schema: currentSchema }
  }

  // 清理可能存在的残留表（之前迁移中途失败）
  try { await db.prepare('DROP TABLE IF EXISTS reviews_new').run() } catch (e) { /* ignore */ }

  // 重建表：创建新表 → 复制数据 → 删除旧表 → 重命名
  await db.batch([
    db.prepare(`CREATE TABLE reviews_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      review_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`),
    db.prepare('INSERT INTO reviews_new SELECT * FROM reviews'),
    db.prepare('DROP TABLE reviews'),
    db.prepare('ALTER TABLE reviews_new RENAME TO reviews'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON reviews(user_id, review_date DESC)')
  ])

  const newTableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reviews'").first()
  return { migrated: true, message: 'reviews 表迁移成功，已移除唯一约束', oldSchema: currentSchema, newSchema: newTableInfo?.sql || '' }
}

// 数据库迁移 API 端点
async function handleMigrateReviews(request, env, corsHeaders) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  // Admin check: require admin secret in header
  const adminSecret = request.headers.get('X-Admin-Secret')
  if (!adminSecret || adminSecret !== env.ADMIN_SECRET) {
    return jsonResponse({ success: false, message: '需要管理员权限' }, 403, corsHeaders)
  }

  try {
    const result = await migrateReviewsRemoveUniqueConstraint(env.DB)
    return jsonResponse({ success: true, ...result }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateFeedback(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const name = sanitizeInput(body.name, 50) || '匿名'
    const content = sanitizeInput(body.content, 2000)

    if (!content) {
      return jsonResponse({ success: false, message: '反馈内容不能为空' }, 400, corsHeaders)
    }

    const db = env.DB
    const feedbackId = generateId()

    await db.prepare('INSERT INTO feedbacks (id, name, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(feedbackId, name, content, 'pending', new Date().toISOString(), new Date().toISOString()).run()

    const feedback = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(feedbackId).first()

    return jsonResponse({ success: true, message: '感谢您的反馈！', data: feedback }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateFeedback(request, id, env, corsHeaders) {
  try {
    const updates = await request.json()
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(id).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '反馈不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      params.push(sanitizeInput(updates.name, 50))
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      params.push(sanitizeInput(updates.content, 2000))
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(sanitizeInput(updates.status, 20))
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    await db.prepare('UPDATE feedbacks SET ' + fields.join(', ') + ' WHERE id = ?').bind(...params).run()

    const feedback = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(id).first()

    return jsonResponse({ success: true, message: '更新成功', data: feedback }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

export default {
  async fetch(request, env) {
    return await handleRequest(request, env)
  }
}
