import { debugLog, generateId, sanitizeInput, jsonResponse, maskError, getAuthUser } from '../utils/router.js'

export const routes = [
  // 任务
  { method: 'GET', path: '/api/tasks', handler: handleGetTasks },
  { method: 'POST', path: '/api/tasks', handler: handleCreateTask },
  { method: 'PUT', path: '/api/tasks/:id', handler: handleUpdateTask },
  { method: 'DELETE', path: '/api/tasks/:id', handler: handleDeleteTask },
  // 分类
  { method: 'GET', path: '/api/categories', handler: handleGetCategories },
  { method: 'POST', path: '/api/categories', handler: handleCreateCategory },
  { method: 'DELETE', path: '/api/categories/:id', handler: handleDeleteCategory },
]

// ========================================
// 任务
// ========================================

async function handleGetTasks(request, env, corsHeaders) {
  debugLog('Tasks', 'handleGetTasks called')
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const tasks = await db.prepare(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.userId).all()

    return jsonResponse({
      success: true,
      data: tasks.results.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        completed_at: t.completed ? t.updated_at : null,
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Tasks', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateTask(request, env, corsHeaders) {
  debugLog('Tasks', 'handleCreateTask called')
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const taskId = body.id || generateId()
    const now = new Date().toISOString()

    await env.DB.prepare(
      `INSERT INTO tasks (id, user_id, title, description, category, status, priority, due_date, completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      taskId,
      user.userId,
      sanitizeInput(body.title, 200) || '未命名任务',
      body.description ? sanitizeInput(body.description, 2000) : null,
      body.category ? sanitizeInput(body.category, 100) : null,
      body.status || '待办',
      body.priority || '中',
      body.due_date || null,
      body.status === '已完成' ? 1 : 0,
      body.created_at || now,
      now
    ).run()

    const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first()

    return jsonResponse({
      success: true,
      message: '创建成功',
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        completed_at: task.completed ? task.updated_at : null,
        created_at: task.created_at,
        updated_at: task.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Tasks', 'Create error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateTask(request, env, corsHeaders, id) {
  debugLog('Tasks', 'handleUpdateTask called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const existing = await db.prepare(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404, corsHeaders)
    }

    const updates = await request.json()
    const fields = []
    const params = []

    const stringFields = ['title', 'description', 'category', 'status', 'priority', 'due_date']
    for (const field of stringFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`)
        params.push(updates[field] !== '' ? sanitizeInput(String(updates[field]), field === 'description' ? 2000 : 200) : null)
      }
    }

    if (updates.status === '已完成') {
      fields.push('completed = ?')
      params.push(1)
    } else if (updates.status !== undefined && updates.status !== '已完成') {
      fields.push('completed = ?')
      params.push(0)
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)
    params.push(user.userId)

    await db.prepare(
      'UPDATE tasks SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?'
    ).bind(...params).run()

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first()

    return jsonResponse({
      success: true,
      message: '更新成功',
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        completed_at: task.completed ? task.updated_at : null,
        created_at: task.created_at,
        updated_at: task.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Tasks', 'Update error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteTask(request, env, corsHeaders, id) {
  debugLog('Tasks', 'handleDeleteTask called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const existing = await db.prepare(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '任务不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(id, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    debugLog('Tasks', 'Delete error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

// ========================================
// 分类
// ========================================

async function handleGetCategories(request, env, corsHeaders) {
  debugLog('Categories', 'handleGetCategories called')
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const categories = await db.prepare(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at ASC'
    ).bind(user.userId).all()

    return jsonResponse({
      success: true,
      data: categories.results.map(c => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at
      }))
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Categories', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateCategory(request, env, corsHeaders) {
  debugLog('Categories', 'handleCreateCategory called')
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const name = sanitizeInput(body.name, 100)

    if (!name) {
      return jsonResponse({ success: false, message: '分类名称不能为空' }, 400, corsHeaders)
    }

    const db = env.DB
    const existing = await db.prepare(
      'SELECT id FROM categories WHERE user_id = ? AND name = ?'
    ).bind(user.userId, name).first()

    if (existing) {
      return jsonResponse({ success: true, message: '分类已存在', data: { id: existing.id, name } }, 200, corsHeaders)
    }

    const categoryId = generateId()
    await db.prepare(
      'INSERT INTO categories (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
    ).bind(categoryId, user.userId, name, new Date().toISOString()).run()

    return jsonResponse({
      success: true,
      message: '创建成功',
      data: { id: categoryId, name }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Categories', 'Create error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteCategory(request, env, corsHeaders, id) {
  debugLog('Categories', 'handleDeleteCategory called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const existing = await db.prepare(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '分类不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(id, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    debugLog('Categories', 'Delete error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}