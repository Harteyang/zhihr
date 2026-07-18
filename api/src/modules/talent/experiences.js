import { jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

async function listExperiences(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权查看该候选人' }, 403, corsHeaders)
    }

    const rows = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE candidate_id = ? ORDER BY start_date DESC'
    ).bind(params.id).all()
    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function addExperience(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const body = await request.json()
    if (!body.company || !body.title) {
      return jsonResponse({ success: false, message: '公司和职位为必填项' }, 400, corsHeaders)
    }
    const result = await env.DB.prepare(`
      INSERT INTO talent_work_experiences (candidate_id, company, title, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(params.id, body.company, body.title, body.start_date || null, body.end_date || null, body.description || null).run()

    const exp = await env.DB.prepare('SELECT * FROM talent_work_experiences WHERE id = ?').bind(result.meta.last_row_id).first()
    return jsonResponse({ success: true, data: exp }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateExperience(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE id = ? AND candidate_id = ?'
    ).bind(params.expId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '工作经历不存在' }, 404, corsHeaders)
    }

    const body = await request.json()
    const allowedFields = ['company', 'title', 'start_date', 'end_date', 'description']
    const fields = []
    const values = []
    for (const field of allowedFields) {
      if (body[field] !== undefined) { fields.push(`${field} = ?`); values.push(body[field]) }
    }
    if (fields.length === 0) {
      return jsonResponse({ success: true, data: existing }, 200, corsHeaders)
    }

    values.push(params.expId)
    await env.DB.prepare(`UPDATE talent_work_experiences SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    const updated = await env.DB.prepare('SELECT * FROM talent_work_experiences WHERE id = ?').bind(params.expId).first()
    return jsonResponse({ success: true, data: updated }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteExperience(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    await env.DB.prepare('DELETE FROM talent_work_experiences WHERE id = ? AND candidate_id = ?').bind(params.expId, params.id).run()
    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/experiences', handler: listExperiences },
  { method: 'POST', path: '/api/talent/candidates/:id/experiences', handler: addExperience },
  { method: 'PUT', path: '/api/talent/candidates/:id/experiences/:expId', handler: updateExperience },
  { method: 'DELETE', path: '/api/talent/candidates/:id/experiences/:expId', handler: deleteExperience },
]