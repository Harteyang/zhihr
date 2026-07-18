import { jsonResponse, maskError, requireAuth, getClientIp } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { checkPositionPermission } from './permissions.js'

async function listAttachments(request, env, corsHeaders, params) {
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
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE candidate_id = ? ORDER BY created_at DESC'
    ).bind(params.id).all()
    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteAttachment(request, env, corsHeaders, params) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error
  return jsonResponse({
    success: false,
    message: '简历附件上传后不支持删除操作'
  }, 403, corsHeaders)
}

async function downloadAttachment(request, env, corsHeaders, params) {
  return jsonResponse({ success: false, message: '请使用直链接口：GET /api/talent/attachments/:id/download-url', status: 'use_direct_download' }, 410, corsHeaders)
}

async function getDownloadUrl(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）', status: 'oss_not_configured' }, 503, corsHeaders)
  }

  try {
    const attachment = await env.DB.prepare(
      'SELECT * FROM talent_attachments WHERE id = ?'
    ).bind(params.id).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }

    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(attachment.candidate_id).first()
    if (candidate && candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权下载该附件' }, 403, corsHeaders)
    }

    const signedUrl = await oss.getSignedUrl('GET', attachment.r2_key, 300)
    return jsonResponse({ success: true, data: { url: signedUrl, fileName: attachment.file_name } }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/attachments', handler: listAttachments },
  { method: 'DELETE', path: '/api/talent/candidates/:id/attachments/:attachId', handler: deleteAttachment },
  { method: 'GET', path: '/api/talent/attachments/:id/download', handler: downloadAttachment },
  { method: 'GET', path: '/api/talent/attachments/:id/download-url', handler: getDownloadUrl },
]