import { jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

/**
 * 候选人分享链接管理（内部用户调用）
 * 公开访问的分享页接口在 share-public.js
 */

function generateToken() {
  // 32 字节随机值，base64url 编码后约 43 字符，足够防碰撞
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function listShareLinks(request, env, corsHeaders, params) {
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
      `SELECT sl.id, sl.candidate_id, sl.token, sl.evaluator_name, sl.created_by, sl.created_at,
              (SELECT COUNT(*) FROM talent_interview_evaluations e WHERE e.share_link_id = sl.id) AS evaluation_count
       FROM talent_share_links sl
       WHERE sl.candidate_id = ?
       ORDER BY sl.created_at DESC`
    ).bind(params.id).all()

    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function createShareLink(request, env, corsHeaders, params) {
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
    if (!evaluatorName) {
      return jsonResponse({ success: false, message: '评价人姓名为必填' }, 400, corsHeaders)
    }
    if (evaluatorName.length > 50) {
      return jsonResponse({ success: false, message: '评价人姓名不能超过 50 字' }, 400, corsHeaders)
    }

    const token = generateToken()
    const result = await env.DB.prepare(
      `INSERT INTO talent_share_links (candidate_id, token, evaluator_name, created_by)
       VALUES (?, ?, ?, ?)`
    ).bind(params.id, token, evaluatorName, user.userId).run()

    const link = await env.DB.prepare(
      `SELECT id, candidate_id, token, evaluator_name, created_by, created_at FROM talent_share_links WHERE id = ?`
    ).bind(result.meta.last_row_id).first()

    await logOperation(env, user, 'create_share_link', 'share_link', String(link.id), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name,
      evaluator_name: evaluatorName
    }, getClientIp(request))

    return jsonResponse({ success: true, data: link }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteShareLink(request, env, corsHeaders, params) {
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
      'SELECT id, evaluator_name FROM talent_share_links WHERE id = ? AND candidate_id = ?'
    ).bind(params.linkId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '分享链接不存在' }, 404, corsHeaders)
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_interview_evaluations WHERE share_link_id = ?').bind(params.linkId),
      env.DB.prepare('DELETE FROM talent_share_links WHERE id = ?').bind(params.linkId)
    ])

    await logOperation(env, user, 'delete_share_link', 'share_link', String(params.linkId), {
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
  { method: 'GET', path: '/api/talent/candidates/:id/share-links', handler: listShareLinks },
  { method: 'POST', path: '/api/talent/candidates/:id/share-links', handler: createShareLink },
  { method: 'DELETE', path: '/api/talent/candidates/:id/share-links/:linkId', handler: deleteShareLink }
]
