import { jsonResponse, requireAdmin, requireAuth, getUserPositions, logOperation, hashPassword, sanitizeInput, validatePassword, generateId, getClientIp, parsePagination } from '../utils/router.js'

// ========= 用户管理 =========

// 批量操作最大用户数（防止超出 D1 batch 语句数限制和 Workers 执行时间）
const MAX_BATCH_USERS = 100

async function listUsers(request, env, corsHeaders) {
  const { error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const rows = await env.DB.prepare(
      `SELECT id, username, display_name, role, status, last_login_at, created_at
       FROM users ORDER BY created_at DESC`
    ).all()

    const usersWithPositions = await Promise.all(rows.results.map(async u => {
      const positions = await getUserPositions(env, u.id, u.role)
      return { ...u, positions: positions || [] }
    }))

    return jsonResponse({ success: true, data: usersWithPositions }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// 查询单个用户详情（避免编辑用户时拉取全量列表）
async function getUser(request, env, corsHeaders, params) {
  const { error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const u = await env.DB.prepare(
      `SELECT id, username, display_name, role, status, last_login_at, created_at
       FROM users WHERE id = ?`
    ).bind(params.id).first()

    if (!u) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders)
    }

    const positions = await getUserPositions(env, u.id, u.role)
    return jsonResponse({ success: true, data: { ...u, positions: positions || [] } }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function createUser(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password
    const displayName = sanitizeInput(body.display_name, 50) || username
    const role = body.role === 'admin' ? 'admin' : 'user'

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

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400, corsHeaders)
    }

    const passwordHash = await hashPassword(password)
    const userId = generateId()
    const now = new Date().toISOString()

    await env.DB.prepare(
      'INSERT INTO users (id, username, password_hash, role, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, username, passwordHash, role, displayName, 'active', now, now).run()

    await logOperation(env, admin, 'create_user', 'user', userId, { username, role }, getClientIp(request))

    return jsonResponse({
      success: true, message: '用户创建成功',
      data: { userId, username, display_name: displayName, role, status: 'active' }
    }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function updateUser(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(params.id).first()
    if (!target) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders)
    }

    const body = await request.json()
    const fields = []
    const values = []

    if (body.display_name !== undefined) {
      fields.push('display_name = ?'); values.push(sanitizeInput(body.display_name, 50))
    }
    if (body.role !== undefined) {
      fields.push('role = ?'); values.push(body.role === 'admin' ? 'admin' : 'user')
    }
    if (body.password !== undefined) {
      const passwordError = validatePassword(body.password)
      if (passwordError) {
        return jsonResponse({ success: false, message: passwordError }, 400, corsHeaders)
      }
      const passwordHash = await hashPassword(body.password)
      fields.push('password_hash = ?'); values.push(passwordHash)
    }

    if (fields.length > 0) {
      fields.push("updated_at = CURRENT_TIMESTAMP")
      values.push(params.id)
      await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    }

    // 审计日志：记录变更字段但排除密码（敏感信息不入库）
    const auditDetail = { ...body }
    if (auditDetail.password !== undefined) {
      auditDetail.password = '[REDACTED]'
    }
    await logOperation(env, admin, 'update_user', 'user', params.id, auditDetail, getClientIp(request))

    return jsonResponse({ success: true, message: '更新成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function deleteUser(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    if (params.id === admin.userId) {
      return jsonResponse({ success: false, message: '不能删除自己的账号' }, 400, corsHeaders)
    }

    const target = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(params.id).first()
    if (!target) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders)
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(params.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(params.id)
    ])

    await logOperation(env, admin, 'delete_user', 'user', params.id, { username: target.username }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function updateUserStatus(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const status = body.status === 'active' ? 'active' : 'disabled'

    if (params.id === admin.userId && status === 'disabled') {
      return jsonResponse({ success: false, message: '不能禁用自己的账号' }, 400, corsHeaders)
    }

    await env.DB.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(status, params.id).run()

    await logOperation(env, admin, 'update_user_status', 'user', params.id, { status }, getClientIp(request))

    return jsonResponse({ success: true, message: status === 'active' ? '已启用' : '已禁用' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 岗位权限分配 =========

async function getUserPositionsRoute(request, env, corsHeaders, params) {
  const { error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const positions = await getUserPositions(env, params.id, 'user')
    return jsonResponse({ success: true, data: positions || [] }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function setUserPositions(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const positions = Array.isArray(body.positions) ? body.positions : []

    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(params.id),
      ...positions.map(p => env.DB.prepare(
        'INSERT INTO talent_user_positions (user_id, position) VALUES (?, ?)'
      ).bind(params.id, p))
    ])

    await logOperation(env, admin, 'update_positions', 'user', params.id, { positions }, getClientIp(request))

    return jsonResponse({ success: true, message: '岗位权限已更新' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 操作日志 =========

async function listOperationLogs(request, env, corsHeaders) {
  const { error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const conditions = []
    const params = []

    const username = url.searchParams.get('username')
    if (username) { conditions.push('username LIKE ?'); params.push(`%${username}%`) }
    const action = url.searchParams.get('action')
    if (action) { conditions.push('action = ?'); params.push(action) }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM talent_operation_logs ${where}`
    ).bind(...params).first()

    const rows = await env.DB.prepare(
      `SELECT * FROM talent_operation_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()

    return jsonResponse({
      success: true, data: rows.results, total: countRow.total, page, pageSize
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 可选岗位列表 =========

async function getAvailablePositions(request, env, corsHeaders) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const rows = await env.DB.prepare(
      "SELECT DISTINCT position FROM talent_candidates WHERE position IS NOT NULL ORDER BY position"
    ).all()
    return jsonResponse({ success: true, data: rows.results.map(r => r.position) }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 批量操作 =========

async function batchUpdateStatus(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []
    const status = body.status === 'active' ? 'active' : 'disabled'

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }
    if (userIds.length > MAX_BATCH_USERS) {
      return jsonResponse({ success: false, message: `单次批量操作不能超过 ${MAX_BATCH_USERS} 个用户` }, 400, corsHeaders)
    }
    if (status === 'disabled' && userIds.includes(admin.userId)) {
      return jsonResponse({ success: false, message: '不能禁用自己的账号' }, 400, corsHeaders)
    }

    const stmts = userIds.map(id =>
      env.DB.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id)
    )
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_update_status', 'user', null, { userIds, status }, getClientIp(request))

    return jsonResponse({ success: true, message: `已${status === 'active' ? '启用' : '禁用'} ${userIds.length} 个账号` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function batchDeleteUsers(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }
    if (userIds.length > MAX_BATCH_USERS) {
      return jsonResponse({ success: false, message: `单次批量操作不能超过 ${MAX_BATCH_USERS} 个用户` }, 400, corsHeaders)
    }
    if (userIds.includes(admin.userId)) {
      return jsonResponse({ success: false, message: '不能删除自己的账号' }, 400, corsHeaders)
    }

    const stmts = []
    for (const id of userIds) {
      stmts.push(env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(id))
      stmts.push(env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id))
    }
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_delete_users', 'user', null, { userIds }, getClientIp(request))

    return jsonResponse({ success: true, message: `已删除 ${userIds.length} 个账号` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function batchSetPositions(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []
    const positions = Array.isArray(body.positions) ? body.positions : []

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }
    if (userIds.length > MAX_BATCH_USERS) {
      return jsonResponse({ success: false, message: `单次批量操作不能超过 ${MAX_BATCH_USERS} 个用户` }, 400, corsHeaders)
    }

    const stmts = []
    for (const userId of userIds) {
      stmts.push(env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(userId))
      for (const pos of positions) {
        stmts.push(env.DB.prepare(
          'INSERT INTO talent_user_positions (user_id, position) VALUES (?, ?)'
        ).bind(userId, pos))
      }
    }
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_update_positions', 'user', null, { userIds, positions }, getClientIp(request))

    return jsonResponse({ success: true, message: `已为 ${userIds.length} 个用户更新岗位权限` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 管理员认领（用于已有用户但无 admin 的数据库）=========

async function setupAdmin(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const adminCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    ).first()

    if (adminCount.count > 0) {
      return jsonResponse({ success: false, message: '系统已存在管理员，请联系管理员分配权限' }, 403, corsHeaders)
    }

    await env.DB.prepare(
      "UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(user.userId).run()

    await logOperation(env, user, 'setup_admin', 'user', user.userId, null, getClientIp(request))

    return jsonResponse({
      success: true, message: '已成为系统管理员',
      data: { userId: user.userId, username: user.username, role: 'admin' }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 路由注册 =========

export const routes = [
  { method: 'GET',    path: '/api/auth/users',                  handler: listUsers },
  { method: 'POST',   path: '/api/auth/users',                  handler: createUser },

  { method: 'PATCH',  path: '/api/auth/users/batch/status',     handler: batchUpdateStatus },
  { method: 'POST',   path: '/api/auth/users/batch/delete',     handler: batchDeleteUsers },
  { method: 'PUT',    path: '/api/auth/users/batch/positions',  handler: batchSetPositions },

  { method: 'POST',   path: '/api/talent/auth/setup-admin',     handler: setupAdmin },

  { method: 'GET',    path: '/api/auth/users/:id',              handler: getUser },
  { method: 'GET',    path: '/api/auth/users/:id/positions',    handler: getUserPositionsRoute },
  { method: 'PUT',    path: '/api/auth/users/:id/positions',    handler: setUserPositions },
  { method: 'PUT',    path: '/api/auth/users/:id',              handler: updateUser },
  { method: 'DELETE', path: '/api/auth/users/:id',              handler: deleteUser },
  { method: 'PATCH',  path: '/api/auth/users/:id/status',       handler: updateUserStatus },

  { method: 'GET',    path: '/api/talent/positions/available',  handler: getAvailablePositions },
  { method: 'GET',    path: '/api/auth/operation-logs',         handler: listOperationLogs },
]
