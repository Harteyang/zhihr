import { jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

/**
 * 面试评价模块（内部用户填写）
 * 分享链接提交的评价在 share-public.js 中处理
 */

async function listEvaluations(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare(
      'SELECT position, created_by FROM talent_candidates WHERE id = ?'
    ).bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权查看该候选人' }, 403, corsHeaders)
    }

    const rows = await env.DB.prepare(
      `SELECT id, candidate_id, evaluator_name, content, source, share_link_id, created_by, created_at, updated_at
       FROM talent_interview_evaluations
       WHERE candidate_id = ?
       ORDER BY created_at DESC`
    ).bind(params.id).all()

    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function createEvaluation(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare(
      'SELECT position, created_by, name FROM talent_candidates WHERE id = ?'
    ).bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const body = await request.json()
    const evaluatorName = String(body.evaluator_name || '').trim()
    const content = String(body.content || '').trim()
    if (!evaluatorName) {
      return jsonResponse({ success: false, message: '评价人姓名为必填' }, 400, corsHeaders)
    }
    if (!content) {
      return jsonResponse({ success: false, message: '评价内容为必填' }, 400, corsHeaders)
    }
    if (evaluatorName.length > 50) {
      return jsonResponse({ success: false, message: '评价人姓名不能超过 50 字' }, 400, corsHeaders)
    }
    if (content.length > 5000) {
      return jsonResponse({ success: false, message: '评价内容不能超过 5000 字' }, 400, corsHeaders)
    }

    const result = await env.DB.prepare(
      `INSERT INTO talent_interview_evaluations (candidate_id, evaluator_name, content, source, created_by)
       VALUES (?, ?, ?, 'internal', ?)`
    ).bind(params.id, evaluatorName, content, user.userId).run()

    const evalRow = await env.DB.prepare(
      'SELECT id, candidate_id, evaluator_name, content, source, share_link_id, created_by, created_at, updated_at FROM talent_interview_evaluations WHERE id = ?'
    ).bind(result.meta.last_row_id).first()

    await logOperation(env, user, 'create_evaluation', 'evaluation', String(evalRow.id), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name,
      evaluator_name: evaluatorName
    }, getClientIp(request))

    return jsonResponse({ success: true, data: evalRow }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateEvaluation(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare(
      'SELECT position, created_by, name FROM talent_candidates WHERE id = ?'
    ).bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const existing = await env.DB.prepare(
      'SELECT id, source, share_link_id, evaluator_name FROM talent_interview_evaluations WHERE id = ? AND candidate_id = ?'
    ).bind(params.evalId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '评价不存在' }, 404, corsHeaders)
    }
    // 分享链接来源的评价不允许从内部接口修改（应由分享页或其对应的 share 接口修改）
    if (existing.source === 'share') {
      return jsonResponse({ success: false, message: '该评价由分享链接提交，请通过分享页面修改' }, 403, corsHeaders)
    }

    const body = await request.json()
    const fields = []
    const values = []
    if (body.evaluator_name !== undefined) {
      const name = String(body.evaluator_name).trim()
      if (!name) return jsonResponse({ success: false, message: '评价人姓名不能为空' }, 400, corsHeaders)
      if (name.length > 50) return jsonResponse({ success: false, message: '评价人姓名不能超过 50 字' }, 400, corsHeaders)
      fields.push('evaluator_name = ?')
      values.push(name)
    }
    if (body.content !== undefined) {
      const content = String(body.content).trim()
      if (!content) return jsonResponse({ success: false, message: '评价内容不能为空' }, 400, corsHeaders)
      if (content.length > 5000) return jsonResponse({ success: false, message: '评价内容不能超过 5000 字' }, 400, corsHeaders)
      fields.push('content = ?')
      values.push(content)
    }
    if (fields.length === 0) {
      return jsonResponse({ success: false, message: '没有需要更新的字段' }, 400, corsHeaders)
    }
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(params.evalId)

    await env.DB.prepare(
      `UPDATE talent_interview_evaluations SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    const updated = await env.DB.prepare(
      'SELECT id, candidate_id, evaluator_name, content, source, share_link_id, created_by, created_at, updated_at FROM talent_interview_evaluations WHERE id = ?'
    ).bind(params.evalId).first()

    await logOperation(env, user, 'update_evaluation', 'evaluation', String(params.evalId), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name,
      evaluator_name: updated.evaluator_name
    }, getClientIp(request))

    return jsonResponse({ success: true, data: updated }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteEvaluation(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare(
      'SELECT position, created_by, name FROM talent_candidates WHERE id = ?'
    ).bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const existing = await env.DB.prepare(
      'SELECT id, evaluator_name FROM talent_interview_evaluations WHERE id = ? AND candidate_id = ?'
    ).bind(params.evalId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '评价不存在' }, 404, corsHeaders)
    }

    await env.DB.prepare(
      'DELETE FROM talent_interview_evaluations WHERE id = ? AND candidate_id = ?'
    ).bind(params.evalId, params.id).run()

    await logOperation(env, user, 'delete_evaluation', 'evaluation', String(params.evalId), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name,
      evaluator_name: existing.evaluator_name
    }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/evaluations', handler: listEvaluations },
  { method: 'POST', path: '/api/talent/candidates/:id/evaluations', handler: createEvaluation },
  { method: 'PUT', path: '/api/talent/candidates/:id/evaluations/:evalId', handler: updateEvaluation },
  { method: 'DELETE', path: '/api/talent/candidates/:id/evaluations/:evalId', handler: deleteEvaluation }
]
