import { debugLog, sanitizeInput, jsonResponse, maskError, getAuthenticatedUser } from '../utils/router.js'

export const routes = [
  { method: 'GET', path: '/api/{resource}', handler: handleList },
  { method: 'POST', path: '/api/{resource}', handler: handleCreate },
  { method: 'GET', path: '/api/{resource}/:id', handler: handleGet },
  { method: 'PUT', path: '/api/{resource}/:id', handler: handleUpdate },
  { method: 'DELETE', path: '/api/{resource}/:id', handler: handleDelete },
]

async function handleList(request, env, corsHeaders) {
  debugLog('{Module}', 'handleList called')
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const items = await db.prepare('SELECT * FROM {table} WHERE user_id = ? ORDER BY created_at DESC').bind(user.userId).all()

    return jsonResponse({
      success: true,
      data: items.results
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('{Module}', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreate(request, env, corsHeaders) {
  debugLog('{Module}', 'handleCreate called')
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const db = env.DB

    debugLog('{Module}', 'Creating item')
    return jsonResponse({
      success: true,
      message: '创建成功'
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('{Module}', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGet(request, env, corsHeaders, id) {
  debugLog('{Module}', 'handleGet called:', id)
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const item = await db.prepare('SELECT * FROM {table} WHERE id = ? AND user_id = ?').bind(id, user.userId).first()

    if (!item) {
      return jsonResponse({ success: false, message: '不存在' }, 404, corsHeaders)
    }

    return jsonResponse({ success: true, data: item }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdate(request, env, corsHeaders, id) {
  debugLog('{Module}', 'handleUpdate called:', id)
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM {table} WHERE id = ? AND user_id = ?').bind(id, user.userId).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '不存在' }, 404, corsHeaders)
    }

    debugLog('{Module}', 'Updating item')
    return jsonResponse({ success: true, message: '更新成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDelete(request, env, corsHeaders, id) {
  debugLog('{Module}', 'handleDelete called:', id)
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM {table} WHERE id = ? AND user_id = ?').bind(id, user.userId).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM {table} WHERE id = ? AND user_id = ?').bind(id, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}
