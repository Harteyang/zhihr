import { jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

/**
 * 候选人简历分享链接管理（内部用户调用）
 * 公开访问的简历分享页接口在 resume-share-public.js
 * 与 share-links.js（评价分享）不同，简历分享用于将简历发给面试官预览并触达状态变更
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

async function listResumeShares(request, env, corsHeaders, params) {
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
      `SELECT id, candidate_id, token, created_by, created_at, screener_name
       FROM talent_resume_shares
       WHERE candidate_id = ?
       ORDER BY created_at DESC`
    ).bind(params.id).all()

    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function createResumeShare(request, env, corsHeaders, params) {
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

    const body = await request.json().catch(() => ({}))
    const screenerName = String(body.screener_name || '').trim().slice(0, 50) || null

    const token = generateToken()
    const result = await env.DB.prepare(
      `INSERT INTO talent_resume_shares (candidate_id, token, created_by, screener_name)
       VALUES (?, ?, ?, ?)`
    ).bind(params.id, token, user.userId, screenerName).run()

    const link = await env.DB.prepare(
      `SELECT id, candidate_id, token, created_by, created_at, screener_name FROM talent_resume_shares WHERE id = ?`
    ).bind(result.meta.last_row_id).first()

    await logOperation(env, user, 'create_resume_share', 'resume_share', String(link.id), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name
    }, getClientIp(request))

    return jsonResponse({ success: true, data: link }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteResumeShare(request, env, corsHeaders, params) {
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
      'SELECT id FROM talent_resume_shares WHERE id = ? AND candidate_id = ?'
    ).bind(params.linkId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '分享链接不存在' }, 404, corsHeaders)
    }

    await env.DB.prepare('DELETE FROM talent_resume_shares WHERE id = ?').bind(params.linkId).run()

    await logOperation(env, user, 'delete_resume_share', 'resume_share', String(params.linkId), {
      candidate_id: Number(params.id),
      candidate_name: candidate.name
    }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/resume-shares', handler: listResumeShares },
  { method: 'POST', path: '/api/talent/candidates/:id/resume-shares', handler: createResumeShare },
  { method: 'DELETE', path: '/api/talent/candidates/:id/resume-shares/:linkId', handler: deleteResumeShare }
]
