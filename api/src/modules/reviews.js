import { debugLog, generateId, sanitizeInput, jsonResponse, maskError, parsePagination, getAuthUser } from '../utils/router.js'

export const routes = [
  { method: 'GET', path: '/api/reviews', handler: handleGetReviews },
  { method: 'POST', path: '/api/reviews', handler: handleCreateReview },
  { method: 'PUT', path: '/api/reviews', handler: handleUpdateReviewByDate },
  { method: 'POST', path: '/api/reviews/sync', handler: handleSyncReviews },
  { method: 'GET', path: '/api/reviews/:id', handler: handleGetReviewById },
  { method: 'PUT', path: '/api/reviews/:id', handler: handleUpdateReview },
  { method: 'DELETE', path: '/api/reviews/:id', handler: handleDeleteReview },
]

function safeParse(jsonStr) {
  try { return JSON.parse(jsonStr) } catch { return null }
}

async function handleGetReviews(request, env, corsHeaders) {
  debugLog('Reviews', 'handleGetReviews called')
  const user = await getAuthUser(request, env)
  if (!user) {
    debugLog('Reviews', 'Auth failed')
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }
  debugLog('Reviews', 'Auth OK, userId:', user.userId)

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
    debugLog('Reviews', 'Found', reviews.results.length, 'reviews, total:', total)

    return jsonResponse({
      success: true,
      data: reviews.results.map(r => ({
        id: r.id,
        date: r.review_date,
        title: r.title,
        content: r.content ? safeParse(r.content) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Reviews', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleGetReviewById(request, env, corsHeaders, id) {
  debugLog('Reviews', 'handleGetReviewById called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB
    const review = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(id, user.userId).first()

    if (!review) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    return jsonResponse({
      success: true,
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? safeParse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleCreateReview(request, env, corsHeaders) {
  debugLog('Reviews', 'handleCreateReview called')
  const user = await getAuthUser(request, env)
  if (!user) {
    debugLog('Reviews', 'Auth failed')
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }
  debugLog('Reviews', 'Auth OK, userId:', user.userId)

  try {
    const body = await request.json()
    const review_date = body.review_date || body.date || new Date().toISOString().split('T')[0]
    const title = sanitizeInput(body.title || body.summary, 200) || review_date
    let contentStr = null
    if (body.content) {
      contentStr = typeof body.content === 'string' ? body.content : JSON.stringify(body.content)
    }

    const db = env.DB
    // 忽略客户端传递的 id，始终使用服务端生成的 ID
    const reviewId = generateId()
    debugLog('Reviews', 'reviewId:', reviewId, 'date:', review_date)

    const existingByDate = await db.prepare('SELECT id FROM reviews WHERE user_id = ? AND review_date = ? ORDER BY updated_at DESC LIMIT 1').bind(user.userId, review_date).first()
    if (existingByDate) {
      debugLog('Reviews', 'Found existing by date, updating')
      await db.prepare('UPDATE reviews SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(title, contentStr, new Date().toISOString(), existingByDate.id, user.userId).run()
      const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(existingByDate.id).first()
      debugLog('Reviews', 'Update complete')
      return jsonResponse({
        success: true,
        message: '已更新现有记录',
        data: {
          id: review.id,
          date: review.review_date,
          title: review.title,
          content: review.content ? safeParse(review.content) : null,
          createdAt: review.created_at,
          updatedAt: review.updated_at
        }
      }, 200, corsHeaders)
    }

    debugLog('Reviews', 'Inserting new review')
    await db.prepare('INSERT INTO reviews (id, user_id, title, content, review_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(reviewId, user.userId, title, contentStr, review_date, new Date().toISOString(), new Date().toISOString()).run()

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first()
    debugLog('Reviews', 'Insert complete')

    return jsonResponse({
      success: true,
      message: '创建成功',
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? safeParse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Reviews', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateReviewByDate(request, env, corsHeaders) {
  debugLog('Reviews', 'handleUpdateReviewByDate called')
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const body = await request.json()
    const db = env.DB

    const reviewDate = body.date
    if (!reviewDate) {
      return jsonResponse({ success: false, message: '日期不能为空' }, 400, corsHeaders)
    }

    const existing = await db.prepare('SELECT * FROM reviews WHERE user_id = ? AND review_date = ? ORDER BY updated_at DESC LIMIT 1').bind(user.userId, reviewDate).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

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
        content: review.content ? safeParse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleUpdateReview(request, env, corsHeaders, id) {
  debugLog('Reviews', 'handleUpdateReview called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const updates = await request.json()
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(id, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    const fields = []
    const params = []

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
      // 检查新日期是否与其他已有复盘记录冲突
      const existingByDate = await db.prepare('SELECT id FROM reviews WHERE user_id = ? AND review_date = ? AND id != ?').bind(user.userId, updates.review_date, id).first()
      if (existingByDate) {
        return jsonResponse({ success: false, message: '该日期已存在复盘记录' }, 409, corsHeaders)
      }
      fields.push('review_date = ?')
      params.push(updates.review_date)
    } else if (updates.date !== undefined) {
      const existingByDate = await db.prepare('SELECT id FROM reviews WHERE user_id = ? AND review_date = ? AND id != ?').bind(user.userId, updates.date, id).first()
      if (existingByDate) {
        return jsonResponse({ success: false, message: '该日期已存在复盘记录' }, 409, corsHeaders)
      }
      fields.push('review_date = ?')
      params.push(updates.date)
    }

    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有要更新的字段' }, 400, corsHeaders)
    }

    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)
    params.push(user.userId)

    await db.prepare('UPDATE reviews SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?').bind(...params).run()

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(id).first()

    return jsonResponse({
      success: true,
      message: '更新成功',
      data: {
        id: review.id,
        date: review.review_date,
        title: review.title,
        content: review.content ? safeParse(review.content) : null,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleDeleteReview(request, env, corsHeaders, id) {
  debugLog('Reviews', 'handleDeleteReview called:', id)
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  try {
    const db = env.DB

    const existing = await db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?').bind(id, user.userId).first()

    if (!existing) {
      return jsonResponse({ success: false, message: '复盘不存在' }, 404, corsHeaders)
    }

    await db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?').bind(id, user.userId).run()

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function handleSyncReviews(request, env, corsHeaders) {
  debugLog('Sync', 'handleSyncReviews called')
  const user = await getAuthUser(request, env)
  if (!user) {
    debugLog('Sync', 'Auth failed')
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }
  debugLog('Sync', 'Auth OK, userId:', user.userId)

  try {
    const body = await request.json()
    const { reviews: clientReviews } = body
    debugLog('Sync', 'Received', clientReviews?.length || 0, 'reviews from client')

    if (!Array.isArray(clientReviews)) {
      debugLog('Sync', 'Invalid data format')
      return jsonResponse({ success: false, message: '无效的数据格式' }, 400, corsHeaders)
    }

    // 限制最大同步数量
    if (clientReviews.length > 100) {
      return jsonResponse({ success: false, message: '同步数据不能超过 100 条' }, 400, corsHeaders)
    }

    const db = env.DB

    const serverReviews = await db.prepare('SELECT * FROM reviews WHERE user_id = ?').bind(user.userId).all()
    debugLog('Sync', 'Server has', serverReviews.results.length, 'reviews')
    const serverMap = new Map(serverReviews.results.map(r => [r.id, r]))

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
        const clientUpdated = review.updatedAt ? new Date(review.updatedAt).getTime() : 0
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

    debugLog('Sync', 'Batch ops:', batchOps.length)
    if (batchOps.length > 0) {
      await db.batch(batchOps)
    }

    const allReviews = await db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY review_date DESC').bind(user.userId).all()
    debugLog('Sync', 'Sync complete, returning', allReviews.results.length, 'reviews')

    return jsonResponse({
      success: true,
      data: allReviews.results.map(r => ({
        id: r.id,
        date: r.review_date,
        title: r.title,
        content: r.content ? safeParse(r.content) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      synced
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Sync', 'Error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}