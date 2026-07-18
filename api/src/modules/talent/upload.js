import { debugLog, jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { checkPositionPermission } from './permissions.js'
import { getMimeType } from './candidates.js'

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const DAILY_UPLOAD_LIMIT = 100

const BATCH_MAX_FILES = 10
const BATCH_MAX_FILE_SIZE = 10 * 1024 * 1024
const BATCH_ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt']

async function getDailyUploadCount(env, userId) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM talent_operation_logs
     WHERE user_id = ? AND action = 'upload_attachment'
     AND date(created_at, '+8 hours') = date('now', '+8 hours')`
  ).bind(String(userId)).first()
  return row?.count || 0
}

async function buildUploadQuota(env, user) {
  if (user.role === 'admin') {
    return { limit: -1, used: 0, remaining: -1, unlimited: true }
  }
  const used = await getDailyUploadCount(env, user.userId)
  return { limit: DAILY_UPLOAD_LIMIT, used, remaining: Math.max(0, DAILY_UPLOAD_LIMIT - used), unlimited: false }
}

async function getUploadQuota(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error
  try {
    const quota = await buildUploadQuota(env, user)
    return jsonResponse({ success: true, data: quota }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function getUploadUrl(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）', status: 'oss_not_configured' }, 503, corsHeaders)
  }

  const quota = await buildUploadQuota(env, user)
  if (!quota.unlimited && quota.remaining <= 0) {
    return jsonResponse({
      success: false,
      message: `每日简历上传上限为 ${DAILY_UPLOAD_LIMIT} 份，今日已上传 ${quota.used} 份，已达上限。管理员账户不受此限制。`,
      code: 'UPLOAD_LIMIT_EXCEEDED',
      data: { limit: DAILY_UPLOAD_LIMIT, used: quota.used, remaining: 0 }
    }, 429, corsHeaders)
  }

  try {
    const candidateId = params.id
    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const url = new URL(request.url)
    const fileName = url.searchParams.get('file_name') || 'attachment'
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}` }, 400, corsHeaders)
    }

    const fileSize = parseInt(url.searchParams.get('file_size') || '0', 10)
    if (fileSize > MAX_FILE_SIZE) {
      return jsonResponse({
        success: false,
        message: `文件大小不能超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB（当前 ${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB）`
      }, 400, corsHeaders)
    }

    const timestamp = Date.now()
    const ossKey = `resumes/${candidateId}/${timestamp}_${fileName}`
    const fileType = ext.replace('.', '')
    const contentType = getMimeType(ext)
    const signedUrl = await oss.getSignedUrl('PUT', ossKey, 300, {}, contentType)

    return jsonResponse({
      success: true,
      data: {
        uploadUrl: signedUrl,
        ossKey,
        fileName,
        fileType,
        fileSize: fileSize || null,
        contentType
      },
      quota
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function confirmUpload(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidateId = params.id
    const body = await request.json()
    const { ossKey, fileName, fileType, fileSize } = body
    if (!ossKey || !fileName) {
      return jsonResponse({ success: false, message: '参数不完整' }, 400, corsHeaders)
    }

    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const result = await env.DB.prepare(`
      INSERT INTO talent_attachments (candidate_id, file_name, file_type, r2_key, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).bind(candidateId, fileName, fileType || '', ossKey, fileSize || 0).run()

    const attachment = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE id = ?'
    ).bind(result.meta.last_row_id).first()

    await logOperation(env, user, 'upload_attachment', 'attachment', String(attachment.id), { candidate_id: candidateId, file_name: fileName }, getClientIp(request))

    const quota = await buildUploadQuota(env, user)
    return jsonResponse({ success: true, data: attachment, quota }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function uploadAttachment(request, env, corsHeaders, params) {
  return jsonResponse({ success: false, message: '请使用直传接口：GET /api/talent/candidates/:id/attachments/upload-url', status: 'use_direct_upload' }, 410, corsHeaders)
}

async function getBatchUploadUrl(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const body = await request.json()
    const { file_name, file_size } = body
    if (!file_name) {
      return jsonResponse({ success: false, message: 'file_name 为必填' }, 400, corsHeaders)
    }

    const ext = file_name.substring(file_name.lastIndexOf('.')).toLowerCase()
    if (!BATCH_ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}，允许: ${BATCH_ALLOWED_EXTENSIONS.join(', ')}` }, 400, corsHeaders)
    }

    const fileSize = parseInt(file_size || '0', 10)
    if (fileSize > BATCH_MAX_FILE_SIZE) {
      return jsonResponse({ success: false, message: `文件大小不能超过 ${BATCH_MAX_FILE_SIZE / 1024 / 1024}MB` }, 400, corsHeaders)
    }

    const timestamp = Date.now()
    const ossKey = `batch-resumes/${user.userId}/${timestamp}_${file_name}`
    const fileType = ext.replace('.', '')
    const contentType = getMimeType(ext)
    const signedUrl = await oss.getSignedUrl('PUT', ossKey, 300, {}, contentType)

    return jsonResponse({
      success: true,
      data: { uploadUrl: signedUrl, ossKey, fileName: file_name, fileType, fileSize: fileSize || null, contentType }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'POST', path: '/api/talent/candidates/:id/attachments', handler: uploadAttachment },
  { method: 'GET', path: '/api/talent/candidates/:id/attachments/upload-url', handler: getUploadUrl },
  { method: 'POST', path: '/api/talent/candidates/:id/attachments/confirm', handler: confirmUpload },
  { method: 'POST', path: '/api/talent/parse-tasks/batch-upload-url', handler: getBatchUploadUrl },
  { method: 'GET', path: '/api/talent/upload-quota', handler: getUploadQuota },
]

export { BATCH_MAX_FILES, BATCH_MAX_FILE_SIZE, BATCH_ALLOWED_EXTENSIONS, ALLOWED_EXTENSIONS, MAX_FILE_SIZE }