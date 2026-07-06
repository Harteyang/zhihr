import { debugLog, generateId, hashPassword, verifyPassword, signJwt, verifyJwt, sanitizeInput, jsonResponse, getCorsHeaders, getClientIp, checkRateLimit, validatePassword, maskError, getAuthenticatedUser } from '../utils/router.js'

const ACCESS_TOKEN_EXPIRY = 3600
const REFRESH_TOKEN_EXPIRY = 2592000
const RATE_LIMIT_MAX_AUTH = 10

export const routes = [
  { method: 'POST', path: '/api/auth/register', handler: handleRegister },
  { method: 'POST', path: '/api/auth/login', handler: handleLogin },
  { method: 'POST', path: '/api/auth/refresh', handler: handleRefreshToken },
  { method: 'GET', path: '/api/auth/me', handler: handleMe },
]

async function handleRegister(request, env, corsHeaders) {
  debugLog('Auth', 'handleRegister called')
  const clientIp = getClientIp(request)

  if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
    debugLog('Auth', 'Rate limit exceeded')
    return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
  }

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

    debugLog('Auth', 'Register success:', username)
    return jsonResponse({
      success: true, message: '注册成功',
      data: { userId, username, token: accessToken, refreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Auth', 'Register error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleLogin(request, env, corsHeaders) {
  debugLog('Auth', 'handleLogin called')
  const clientIp = getClientIp(request)

  if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
    debugLog('Auth', 'Rate limit exceeded')
    return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
  }

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

    debugLog('Auth', 'Login success:', username)
    return jsonResponse({
      success: true, message: '登录成功',
      data: { userId: user.id, username: user.username, token: accessToken, refreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Auth', 'Login error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleRefreshToken(request, env, corsHeaders) {
  debugLog('Auth', 'handleRefreshToken called')

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

    debugLog('Auth', 'Token refresh success')
    return jsonResponse({
      success: true,
      data: { token: accessToken, refreshToken: newRefreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Auth', 'Refresh error:', error)
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
