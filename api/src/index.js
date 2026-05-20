// ========================================
// 知HR API - ES Module 格式
// ========================================

export default {
  async fetch(request, env) {
    return await handleRequest(request, env)
  }
}

function generateId() {
  return crypto.randomUUID()
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function signJwt(payload, env) {
  const secret = env?.JWT_SECRET || 'your-secret-key-change-in-production'
  const header = { alg: 'HS256', typ: 'JWT' }
  const payloadStr = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '')
  const encodedPayload = btoa(payloadStr).replace(/=/g, '')
  
  const data = `${encodedHeader}.${encodedPayload}`
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(data))
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '')
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

async function verifyJwt(token, env) {
  const secret = env?.JWT_SECRET || 'your-secret-key-change-in-production'
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
    const payload = JSON.parse(atob(encodedPayload))
    
    if (payload.exp < Date.now() / 1000) {
      return null
    }
    
    const data = `${encodedHeader}.${encodedPayload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    
    const signature = new Uint8Array(atob(encodedSignature).split('').map(c => c.charCodeAt(0)))
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data))
    
    return isValid ? payload : null
  } catch {
    return null
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  const url = new URL(request.url)
  let path = url.pathname
  const method = request.method

  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1)
  }

  if (path === '/api/health') {
    return jsonResponse({ success: true, message: 'API is running' })
  }

  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, env)
  }

  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env)
  }

  if (path === '/api/auth/me' && method === 'GET') {
    return handleMe(request, env)
  }

  if (path === '/api/tasks') {
    if (method === 'GET') return handleGetTasks(request, env)
    if (method === 'POST') return handleCreateTask(request, env)
  }

  if (path.match(/^\/api\/tasks\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateTask(request, id, env)
    if (method === 'DELETE') return handleDeleteTask(request, id, env)
  }

  if (path === '/api/categories') {
    if (method === 'GET') return handleGetCategories(request, env)
    if (method === 'POST') return handleCreateCategory(request, env)
  }

  if (path.match(/^\/api\/categories\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'DELETE') return handleDeleteCategory(request, id, env)
  }

  if (path === '/api/reviews') {
    if (method === 'GET') return handleGetReviews(request, env)
    if (method === 'POST') return handleCreateReview(request, env)
  }

  if (path.match(/^\/api\/reviews\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateReview(request, id, env)
    if (method === 'DELETE') return handleDeleteReview(request, id, env)
  }

  if (path === '/api/config') {
    if (method === 'GET') return handleGetConfig(request, env)
    if (method === 'PUT') return handleUpdateConfig(request, env)
  }

  if (path === '/api/feedbacks') {
    if (method === 'GET') return handleGetFeedbacks(request, env)
    if (method === 'POST') return handleCreateFeedback(request, env)
  }

  if (path.match(/^\/api\/feedbacks\/[a-f0-9\-]+$/)) {
    const id = path.split('/')[3]
    if (method === 'PUT') return handleUpdateFeedback(request, id, env)
  }

  return jsonResponse({ success: false, message: 'Not found' }, 404)
}

async function handleRegister(request, env) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password || username.length < 3 || password.length < 4) {
      return jsonResponse({ success: false, message: '账号至少3位，密码至少4位' }, 400)
    }

    const db = env.DB
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    
    if (existing) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400)
    }
    
    const passwordHash = await hashPassword(password)
    const userId = generateId()
    
    await db.prepare('INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, username, passwordHash, new Date().toISOString(), new Date().toISOString()).run()
    
    const token = await signJwt({ userId, username }, env)
    
    return jsonResponse({ success: true, message: '注册成功', data: { userId, username, token } })
  } catch (error) {
    return jsonResponse({ success: false, message: '注册失败: ' + error.message }, 500)
  }
}

async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return jsonResponse({ success: false, message: '请输入账号和密码' }, 400)
    }

    const db = env.DB
    const user = await db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').bind(username).first()
    
    if (!user) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400)
    }
    
    const passwordHash = await hashPassword(password)
    
    if (user.password_hash !== passwordHash) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400)
    }
    
    const token = await signJwt({ userId: user.id, username: user.username }, env)
    
    return jsonResponse({ success: true, message: '登录成功', data: { userId: user.id, username: user.username, token } })
  } catch (error) {
    return jsonResponse({ success: false, message: '登录失败: ' + error.message }, 500)
  }
}

async function handleMe(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }
  
  const payload = await verifyJwt(token, env)
  if (!payload) {
    return jsonResponse({ success: false, message: '无效的token' }, 401)
  }
  
  return jsonResponse({ success: true, data: payload })
}

async function getAuthenticatedUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  
  const payload = await verifyJwt(token, env)
  return payload
}

async function handleGetTasks(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    const url = new URL(request.url)
    
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    
    let query = 'SELECT * FROM tasks WHERE user_id = ?'
    const params = [user.userId]
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    if (priority) {
      query += ' AND priority = ?'
      params.push(priority)
    }
    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)'
      params.push('%' + search + '%', '%' + search + '%')
    }
    
    query += ' ORDER BY created_at DESC'
    
    const tasks = await db.prepare(query).bind(...params).all()
    
    return jsonResponse({ success: true, data: tasks.results })
  } catch (error) {
    return jsonResponse({ success: false, message: '获取任务失败: ' + error.message }, 500)
  }
}

async function handleCreateTask(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const { title, description, category, priority, due_date, status = '待办' } = await request.json()
    
    if (!title) {
      return jsonResponse({ success: false, message: '任务标题不能为空' }, 400)
    }
    
    const db = env.DB
    const taskId = generateId()
    
    await db.prepare('INSERT INTO tasks (id, user_id, title, description, category, priority, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(taskId, user.userId, title, description || null, category || null, priority || '中', due_date || null, status, new Date().toISOString(), new Date().toISOString()).run()
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first()
    
    return jsonResponse({ success: true, message: '创建成功', data: task })
  } catch (error) {
    return jsonResponse({ success: false, message: '创建任务失败: ' + error.message }, 500)
  }
}

async function handleUpdateTask(request, taskId, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const updates = await request.json()
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404)
    }
    
    const fields = []
    const params = []
    
    if (updates.title !== undefined) {
      fields.push('title = ?')
      params.push(updates.title)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      params.push(updates.description)
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      params.push(updates.category)
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      params.push(updates.priority)
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?')
      params.push(updates.due_date)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(updates.status)
    }
    
    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(taskId)
    params.push(user.userId)
    
    await db.prepare('UPDATE tasks SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first()
    
    return jsonResponse({ success: true, message: '更新成功', data: task })
  } catch (error) {
    return jsonResponse({ success: false, message: '更新任务失败: ' + error.message }, 500)
  }
}

async function handleDeleteTask(request, taskId, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404)
    }
    
    await db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(taskId, user.userId).run()
    
    return jsonResponse({ success: true, message: '删除成功' })
  } catch (error) {
    return jsonResponse({ success: false, message: '删除任务失败: ' + error.message }, 500)
  }
}

async function handleGetCategories(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()
    
    return jsonResponse({ success: true, data: categories.results })
  } catch (error) {
    return jsonResponse({ success: false, message: '获取分类失败: ' + error.message }, 500)
  }
}

async function handleCreateCategory(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const { name } = await request.json()
    
    if (!name || name.trim() === '') {
      return jsonResponse({ success: false, message: '分类名称不能为空' }, 400)
    }
    
    const db = env.DB
    
    try {
      await db.prepare('INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind(generateId(), user.userId, name.trim(), new Date().toISOString()).run()
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return jsonResponse({ success: false, message: '分类已存在' }, 400)
      }
      throw e
    }
    
    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()
    
    return jsonResponse({ success: true, message: '创建成功', data: categories.results })
  } catch (error) {
    return jsonResponse({ success: false, message: '创建分类失败: ' + error.message }, 500)
  }
}

async function handleDeleteCategory(request, categoryId, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(categoryId, user.userId).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '分类不存在' }, 404)
    }
    
    await db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(categoryId, user.userId).run()
    
    const categories = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC').bind(user.userId).all()
    
    return jsonResponse({ success: true, message: '删除成功', data: categories.results })
  } catch (error) {
    return jsonResponse({ success: false, message: '删除分类失败: ' + error.message }, 500)
  }
}

async function handleGetReviews(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const reviews = await db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY review_date DESC, created_at DESC').bind(user.userId).all()
    
    return jsonResponse({ 
      success: true, 
      data: reviews.results.map(r => ({
        ...r,
        content: r.content ? JSON.parse(r.content) : null
      })) 
    })
  } catch (error) {
    return jsonResponse({ success: false, message: '获取复盘失败: ' + error.message }, 500)
  }
}

async function handleCreateReview(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const { title, content, review_date } = await request.json()
    
    if (!title) {
      return jsonResponse({ success: false, message: '复盘标题不能为空' }, 400)
    }
    
    const db = env.DB
    const reviewId = generateId()
    
    await db.prepare('INSERT INTO reviews (id, user_id, title, content, review_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(reviewId, user.userId, title, content ? JSON.stringify(content) : null, review_date || new Date().toISOString().split('T')[0], new Date().toISOString(), new Date().toISOString()).run()
    
    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first()
    
    return jsonResponse({ success: true, message: '创建成功', data: { ...review, content: review.content ? JSON.parse(review.content) : null } })
  } catch (error) {
    return jsonResponse({ success: false, message: '创建复盘失败: ' + error.message }, 500)
  }
}

async function handleUpdateReview(request, reviewId, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const updates = await request.json()
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404)
    }
    
    const fields = []
    const params = []
    
    if (updates.title !== undefined) {
      fields.push('title = ?')
      params.push(updates.title)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      params.push(JSON.stringify(updates.content))
    }
    if (updates.review_date !== undefined) {
      fields.push('review_date = ?')
      params.push(updates.review_date)
    }
    
    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(reviewId)
    params.push(user.userId)
    
    await db.prepare('UPDATE reviews SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()
    
    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first()
    
    return jsonResponse({ success: true, message: '更新成功', data: { ...review, content: review.content ? JSON.parse(review.content) : null } })
  } catch (error) {
    return jsonResponse({ success: false, message: '更新复盘失败: ' + error.message }, 500)
  }
}

async function handleDeleteReview(request, reviewId, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404)
    }
    
    await db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?').bind(reviewId, user.userId).run()
    
    return jsonResponse({ success: true, message: '删除成功' })
  } catch (error) {
    return jsonResponse({ success: false, message: '删除复盘失败: ' + error.message }, 500)
  }
}

async function handleGetConfig(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const db = env.DB
    
    const config = await db.prepare('SELECT config FROM user_configs WHERE user_id = ?').bind(user.userId).first()
    
    return jsonResponse({ success: true, data: config ? JSON.parse(config.config) : {} })
  } catch (error) {
    return jsonResponse({ success: false, message: '获取配置失败: ' + error.message }, 500)
  }
}

async function handleUpdateConfig(request, env) {
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401)
  }

  try {
    const config = await request.json()
    const db = env.DB
    
    const existing = await db.prepare('SELECT id FROM user_configs WHERE user_id = ?').bind(user.userId).first()
    
    if (existing) {
      await db.prepare('UPDATE user_configs SET config = ?, updated_at = ? WHERE user_id = ?')
        .bind(JSON.stringify(config), new Date().toISOString(), user.userId).run()
    } else {
      await db.prepare('INSERT INTO user_configs (id, user_id, config, updated_at) VALUES (?, ?, ?, ?)')
        .bind(generateId(), user.userId, JSON.stringify(config), new Date().toISOString()).run()
    }
    
    return jsonResponse({ success: true, message: '配置更新成功', data: config })
  } catch (error) {
    return jsonResponse({ success: false, message: '更新配置失败: ' + error.message }, 500)
  }
}

async function handleGetFeedbacks(request, env) {
  try {
    const db = env.DB
    const url = new URL(request.url)
    
    const limit = parseInt(url.searchParams.get('limit')) || 100
    const status = url.searchParams.get('status')
    
    let query = 'SELECT * FROM feedbacks'
    const params = []
    
    if (status) {
      query += ' WHERE status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)
    
    const feedbacks = await db.prepare(query).bind(...params).all()
    
    return jsonResponse({ success: true, data: feedbacks.results })
  } catch (error) {
    return jsonResponse({ success: false, message: '获取反馈失败: ' + error.message }, 500)
  }
}

async function handleCreateFeedback(request, env) {
  try {
    const { name, content, status = 'pending' } = await request.json()
    
    if (!content) {
      return jsonResponse({ success: false, message: '反馈内容不能为空' }, 400)
    }
    
    const db = env.DB
    const feedbackId = generateId()
    
    await db.prepare('INSERT INTO feedbacks (id, name, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(feedbackId, name || '匿名', content, status, new Date().toISOString(), new Date().toISOString()).run()
    
    const feedback = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(feedbackId).first()
    
    return jsonResponse({ success: true, message: '反馈提交成功', data: feedback })
  } catch (error) {
    return jsonResponse({ success: false, message: '提交反馈失败: ' + error.message }, 500)
  }
}

async function handleUpdateFeedback(request, id, env) {
  try {
    const updates = await request.json()
    const db = env.DB
    
    const existing = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(id).first()
    
    if (!existing) {
      return jsonResponse({ success: false, message: '反馈不存在' }, 404)
    }
    
    const fields = []
    const params = []
    
    if (updates.name !== undefined) {
      fields.push('name = ?')
      params.push(updates.name)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      params.push(updates.content)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(updates.status)
    }
    
    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400)
    }
    
    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)
    
    await db.prepare('UPDATE feedbacks SET ' + fields.join(', ') + ' WHERE id = ?').bind(...params).run()
    
    const feedback = await db.prepare('SELECT * FROM feedbacks WHERE id = ?').bind(id).first()
    
    return jsonResponse({ success: true, message: '更新成功', data: feedback })
  } catch (error) {
    return jsonResponse({ success: false, message: '更新反馈失败: ' + error.message }, 500)
  }
}
