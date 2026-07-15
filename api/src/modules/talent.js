import { debugLog, jsonResponse, maskError, parsePagination, requireAuth, requireAdmin, getUserPositions, logOperation, getClientIp } from '../utils/router.js'
import { parseFile, parseExcel, generateTemplateBuffer, docxToHtml, docToHtml } from './talent_parsers.js'
import { OSSClient } from '../utils/oss.js'

const VALID_STATUSES = ['pending', 'contacted', 'interviewing', 'offered', 'rejected']

// ========= 岗位权限校验工具 =========

async function checkPositionPermission(env, user, candidatePosition) {
  if (user.role === 'admin') return true
  const allowedPositions = await getUserPositions(env, user.userId, user.role)
  if (allowedPositions === null) return true
  if (candidatePosition === null || candidatePosition === undefined) return true
  return allowedPositions.includes(candidatePosition)
}

// ========= 候选人 CRUD =========

async function listCandidates(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const allowedPositions = await getUserPositions(env, user.userId, user.role)

    const conditions = []
    const params = []

    if (allowedPositions !== null) {
      if (allowedPositions.length === 0) {
        return jsonResponse({ success: true, data: [], total: 0, page, pageSize }, 200, corsHeaders)
      }
      conditions.push(`position IN (${allowedPositions.map(() => '?').join(',')})`)
      params.push(...allowedPositions)
    }

    const keyword = url.searchParams.get('keyword')
    if (keyword) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    const position = url.searchParams.get('position')
    if (position) { conditions.push('position = ?'); params.push(position) }
    const education = url.searchParams.get('education')
    if (education) { conditions.push('education = ?'); params.push(education) }
    const expMin = url.searchParams.get('experience_min')
    if (expMin !== null && expMin !== undefined && expMin !== '') {
      conditions.push('experience_years >= ?'); params.push(Number(expMin))
    }
    const expMax = url.searchParams.get('experience_max')
    if (expMax !== null && expMax !== undefined && expMax !== '') {
      conditions.push('experience_years <= ?'); params.push(Number(expMax))
    }
    const status = url.searchParams.get('status')
    if (status) {
      const statuses = status.split(',').filter(s => VALID_STATUSES.includes(s))
      if (statuses.length > 0) {
        conditions.push(`status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }
    const source = url.searchParams.get('source')
    if (source) { conditions.push('source = ?'); params.push(source) }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM talent_candidates ${where}`).bind(...params).first()
    const total = countRow.total

    const rows = await env.DB.prepare(
      `SELECT * FROM talent_candidates ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()

    return jsonResponse({ success: true, data: rows.results, total, page, pageSize }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function getFilterOptions(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const allowedPositions = await getUserPositions(env, user.userId, user.role)

    let positionSql = "SELECT DISTINCT position FROM talent_candidates WHERE position IS NOT NULL"
    let positionParams = []
    if (allowedPositions !== null) {
      if (allowedPositions.length === 0) {
        return jsonResponse({ success: true, data: { positions: [], sources: [] } }, 200, corsHeaders)
      }
      positionSql += ` AND position IN (${allowedPositions.map(() => '?').join(',')})`
      positionParams = [...allowedPositions]
    }
    positionSql += ' ORDER BY position'

    const positions = await env.DB.prepare(positionSql).bind(...positionParams).all()
    const sources = await env.DB.prepare(
      "SELECT DISTINCT source FROM talent_candidates WHERE source IS NOT NULL ORDER BY source"
    ).all()
    return jsonResponse({
      success: true,
      data: {
        positions: positions.results.map(r => r.position),
        sources: sources.results.map(r => r.source)
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function getCandidate(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const id = params.id
    const candidate = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    if (!(await checkPositionPermission(env, user, candidate.position))) {
      return jsonResponse({ success: false, message: '无权查看该候选人' }, 403, corsHeaders)
    }

    const experiences = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE candidate_id = ? ORDER BY start_date DESC'
    ).bind(id).all()

    const attachments = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE candidate_id = ? ORDER BY created_at DESC'
    ).bind(id).all()

    return jsonResponse({
      success: true,
      data: { ...candidate, experiences: experiences.results, attachments: attachments.results }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function createCandidate(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    if (!body.name) {
      return jsonResponse({ success: false, message: '姓名为必填项' }, 400, corsHeaders)
    }

    if (user.role !== 'admin') {
      const allowedPositions = await getUserPositions(env, user.userId, user.role)
      if (body.position && allowedPositions !== null && !allowedPositions.includes(body.position)) {
        return jsonResponse({ success: false, message: '无权创建该岗位的候选人' }, 403, corsHeaders)
      }
    }

    const skillsJson = Array.isArray(body.skills) ? JSON.stringify(body.skills) : (body.skills || null)
    const result = await env.DB.prepare(`
      INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name, body.phone || null, body.email || null, body.position || null,
      skillsJson, body.education || null, body.experience_years || null,
      body.status || 'pending', body.source || null, body.summary || null
    ).run()

    const newId = result.meta.last_row_id
    await logOperation(env, user, 'create_candidate', 'candidate', String(newId), { name: body.name }, getClientIp(request))

    return getCandidate(request, env, corsHeaders, { id: newId })
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateCandidate(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const id = params.id
    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    if (!(await checkPositionPermission(env, user, existing.position))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const body = await request.json()
    if (user.role !== 'admin' && body.position !== undefined && body.position !== existing.position) {
      const allowedPositions = await getUserPositions(env, user.userId, user.role)
      if (allowedPositions !== null && !allowedPositions.includes(body.position)) {
        return jsonResponse({ success: false, message: '无权将候选人调整为该岗位' }, 403, corsHeaders)
      }
    }

    const allowedFields = ['name', 'phone', 'email', 'position', 'skills', 'education', 'experience_years', 'status', 'source', 'summary']
    const fields = []
    const values = []

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`)
        let val = body[field]
        if (field === 'skills' && Array.isArray(val)) val = JSON.stringify(val)
        values.push(val)
      }
    }

    if (fields.length === 0) {
      return getCandidate(request, env, corsHeaders, { id })
    }

    fields.push("updated_at = CURRENT_TIMESTAMP")
    values.push(id)

    await env.DB.prepare(`UPDATE talent_candidates SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return getCandidate(request, env, corsHeaders, { id })
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateStatus(request, env, corsHeaders, params) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return jsonResponse({ success: false, message: `无效状态，允许值: ${VALID_STATUSES.join(', ')}` }, 400, corsHeaders)
    }
    return updateCandidate(request, env, corsHeaders, { id: params.id })
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function deleteCandidate(request, env, corsHeaders, params) {
  const { user, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)

  try {
    const id = params.id
    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const attachments = await env.DB.prepare('SELECT r2_key FROM talent_attachments WHERE candidate_id = ?').bind(id).all()
    if (oss.isConfigured()) {
      for (const att of attachments.results) {
        if (att.r2_key) {
          try { await oss.delete(att.r2_key) } catch (e) { debugLog('Talent', 'OSS delete failed:', e.message) }
        }
      }
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_work_experiences WHERE candidate_id = ?').bind(id),
      env.DB.prepare('DELETE FROM talent_attachments WHERE candidate_id = ?').bind(id),
      env.DB.prepare('DELETE FROM talent_candidates WHERE id = ?').bind(id)
    ])

    await logOperation(env, user, 'delete_candidate', 'candidate', String(id), { name: existing.name }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// ========= 工作经历 =========

async function listExperiences(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
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
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
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
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
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
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    await env.DB.prepare('DELETE FROM talent_work_experiences WHERE id = ? AND candidate_id = ?').bind(params.expId, params.id).run()
    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// ========= 附件管理（R2 存储） =========

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE = 10 * 1024 * 1024
// 普通用户每日简历上传上限（管理员不受限制）
const DAILY_UPLOAD_LIMIT = 100

// 统计今日（中国时区 UTC+8）该用户的简历上传数量
async function getDailyUploadCount(env, userId) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM talent_operation_logs
     WHERE user_id = ? AND action = 'upload_attachment'
     AND date(created_at, '+8 hours') = date('now', '+8 hours')`
  ).bind(String(userId)).first()
  return row?.count || 0
}

// 构建上传配额信息
async function buildUploadQuota(env, user) {
  if (user.role === 'admin') {
    return { limit: -1, used: 0, remaining: -1, unlimited: true }
  }
  const used = await getDailyUploadCount(env, user.userId)
  return { limit: DAILY_UPLOAD_LIMIT, used, remaining: Math.max(0, DAILY_UPLOAD_LIMIT - used), unlimited: false }
}

async function getUploadUrl(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）', status: 'oss_not_configured' }, 503, corsHeaders)
  }

  // 普通用户每日上传量限制校验（管理员不受限）
  if (user.role !== 'admin') {
    const usedCount = await getDailyUploadCount(env, user.userId)
    if (usedCount >= DAILY_UPLOAD_LIMIT) {
      return jsonResponse({
        success: false,
        message: `每日简历上传上限为 ${DAILY_UPLOAD_LIMIT} 份，今日已上传 ${usedCount} 份，已达上限。管理员账户不受此限制。`,
        code: 'UPLOAD_LIMIT_EXCEEDED',
        data: { limit: DAILY_UPLOAD_LIMIT, used: usedCount, remaining: 0 }
      }, 429, corsHeaders)
    }
  }

  try {
    const candidateId = params.id
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const url = new URL(request.url)
    const fileName = url.searchParams.get('file_name') || 'attachment'
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}` }, 400, corsHeaders)
    }

    // 验证文件大小（管理员不受限制，但文件超过最大值仍拒绝）
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
    const signedUrl = await oss.getSignedUrl('PUT', ossKey, 300)

    const quota = await buildUploadQuota(env, user)
    return jsonResponse({
      success: true,
      data: {
        uploadUrl: signedUrl,
        ossKey,
        fileName,
        fileType,
        fileSize: fileSize || null
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

    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
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

// 旧的 Worker 代理上传接口保留作为兼容性占位（当前前端已不再使用）
async function uploadAttachment(request, env, corsHeaders, params) {
  return jsonResponse({ success: false, message: '请使用直传接口：GET /api/talent/candidates/:id/attachments/upload-url', status: 'use_direct_upload' }, 410, corsHeaders)
}

async function listAttachments(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
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
  // 简历附件一旦上传不支持删除，防止已入库简历被误删或恶意清除
  return jsonResponse({
    success: false,
    message: '简历附件上传后不支持删除操作'
  }, 403, corsHeaders)
}

// 查询当前用户今日上传配额
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

    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(attachment.candidate_id).first()
    if (candidate && !(await checkPositionPermission(env, user, candidate.position))) {
      return jsonResponse({ success: false, message: '无权下载该附件' }, 403, corsHeaders)
    }

    const signedUrl = await oss.getSignedUrl('GET', attachment.r2_key, 300)
    return jsonResponse({ success: true, data: { url: signedUrl, fileName: attachment.file_name } }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function downloadAttachment(request, env, corsHeaders, params) {
  return jsonResponse({ success: false, message: '请使用直链接口：GET /api/talent/attachments/:id/download-url', status: 'use_direct_download' }, 410, corsHeaders)
}

async function previewAttachment(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const attachment = await env.DB.prepare(
      'SELECT * FROM talent_attachments WHERE id = ?'
    ).bind(params.id).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }

    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(attachment.candidate_id).first()
    if (candidate && !(await checkPositionPermission(env, user, candidate.position))) {
      return jsonResponse({ success: false, message: '无权预览该附件' }, 403, corsHeaders)
    }

    const ossRes = await oss.get(attachment.r2_key)
    if (!ossRes) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const arrayBuffer = await ossRes.arrayBuffer()
    const fileType = attachment.file_type?.toLowerCase()

    if (fileType === 'docx') {
      const html = docxToHtml(arrayBuffer)
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else if (fileType === 'doc') {
      const html = docToHtml(arrayBuffer)
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else if (fileType === 'pdf') {
      return jsonResponse({ success: true, data: { type: 'pdf' } }, 200, corsHeaders)
    } else {
      return jsonResponse({ success: false, message: '该文件类型不支持在线预览，请下载后查看' }, 400, corsHeaders)
    }
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// ========= 简历解析与批量导入 =========

async function parseResume(request, env, corsHeaders) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    const arrayBuffer = await file.arrayBuffer()
    const parsed = await parseFile(file.name, arrayBuffer)

    // 避免返回过大的原始文本
    if (parsed.raw_text && parsed.raw_text.length > 5000) {
      parsed.raw_text = parsed.raw_text.slice(0, 5000) + '\n...（已截断）'
    }

    return jsonResponse({ success: true, data: parsed }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// AI 简历解析（调用 Agnes AI 模型，适用于本地解析不准确的情况）
const AI_API_BASE = 'https://apihub.agnes-ai.com/v1'
const AI_MODEL = 'agnes-2.0-flash'

const AI_SYSTEM_PROMPT = `你是一个专业的简历信息提取助手。请从以下简历文本中提取候选人信息，并以严格的JSON格式返回。

必须返回以下结构的JSON（不要包含任何markdown包裹标记，只返回纯JSON）：
{
  "name": "姓名（字符串）",
  "phone": "手机号（字符串，如13800138000）",
  "email": "邮箱地址（字符串）",
  "position": "求职意向/目标岗位（字符串）",
  "education": "最高学历（大专/本科/硕士/博士/其他）",
  "school": "毕业院校（字符串）",
  "major": "专业（字符串）",
  "experience_years": "工作年限（数字，整数）",
  "skills": ["技能1", "技能2"],
  "summary": "自我评价或备注（字符串）",
  "experiences": [
    {
      "company": "公司名称",
      "title": "职位名称",
      "start_date": "开始年月，格式YYYY-MM",
      "end_date": "结束年月，格式YYYY-MM，或至今",
      "description": "工作描述"
    }
  ]
}

注意事项：
1. name、phone、email、position 如果无法识别请返回null
2. education 只能从：大专、本科、硕士、博士、其他 中选择
3. experience_years 根据工作经历计算，如果无法确定返回null
4. skills 格式化为标准技能名称列表
5. experiences 按照时间倒序排列
6. 所有字段都必须存在，不确定的字段用null或空数组替代`

async function aiParseResume(request, env, corsHeaders) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    // 1. 先使用本地解析器提取文本
    const arrayBuffer = await file.arrayBuffer()
    const parsed = await parseFile(file.name, arrayBuffer)
    const resumeText = parsed.raw_text || ''

    if (!resumeText || resumeText.trim().length < 10) {
      return jsonResponse({ success: false, message: '无法从文件中提取足够文本，请确认文件内容是否正常' }, 400, corsHeaders)
    }

    // 2. 调用 Agnes AI 解析
    const aiApiKey = env.AI_API_KEY
    if (!aiApiKey) {
      return jsonResponse({ success: false, message: 'AI 解析服务未配置（缺少 API Key）' }, 503, corsHeaders)
    }

    const aiResponse = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: `请解析以下简历内容，提取结构化信息：\n\n${resumeText}` }
        ],
        temperature: 0.1,
        max_tokens: 4096
      })
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => '')
      throw new Error(`AI 模型调用失败 (${aiResponse.status}): ${errText}`)
    }

    const aiData = await aiResponse.json()
    const content = aiData?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI 模型返回内容为空')
    }

    // 3. 解析 AI 返回的 JSON
    // 处理可能的 markdown 包裹
    let cleanContent = content.trim()
    const jsonMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      cleanContent = jsonMatch[1].trim()
    }

    let aiResult
    try {
      aiResult = JSON.parse(cleanContent)
    } catch {
      // 尝试从内容中提取 JSON 对象
      const objMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (objMatch) {
        aiResult = JSON.parse(objMatch[0])
      } else {
        throw new Error('AI 返回格式无法解析为 JSON')
      }
    }

    return jsonResponse({ success: true, data: aiResult }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function batchImport(request, env, corsHeaders) {
  const { user, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return jsonResponse({ success: false, message: '批量导入仅支持 Excel/CSV 文件' }, 400, corsHeaders)
    }

    const arrayBuffer = await file.arrayBuffer()
    const { candidates } = parseExcel(arrayBuffer)

    const results = { success: 0, failed: 0, errors: [] }

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i]
      if (!row.name) {
        results.failed++
        results.errors.push(`第 ${i + 2} 行: 姓名为空，已跳过`)
        continue
      }
      try {
        const skills = typeof row.skills === 'string'
          ? row.skills.split(/[,，]/).map(s => s.trim())
          : row.skills
        const expYears = row.experience_years ? parseInt(row.experience_years, 10) : null

        await env.DB.prepare(`
          INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(
          row.name, row.phone || null, row.email || null, row.position || null,
          Array.isArray(skills) ? JSON.stringify(skills) : null,
          row.education || null, expYears, row.source || null, row.summary || null
        ).run()
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push(`第 ${i + 2} 行: ${err.message}`)
      }
    }

    await logOperation(env, user, 'batch_import_candidates', 'candidate', null, { success: results.success, failed: results.failed }, getClientIp(request))

    return jsonResponse({ success: true, data: results }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function downloadTemplate(request, env, corsHeaders) {
  const { error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const buffer = generateTemplateBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=talent-pool-template.xlsx',
        'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*'
      }
    })
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// ========= 路由注册 =========

export const routes = [
  { method: 'GET',  path: '/api/talent/candidates',                   handler: listCandidates },
  { method: 'GET',  path: '/api/talent/candidates/filter-options',    handler: getFilterOptions },
  { method: 'POST', path: '/api/talent/candidates/parse-resume',      handler: parseResume },
  { method: 'POST', path: '/api/talent/candidates/ai-parse-resume',   handler: aiParseResume },
  { method: 'POST', path: '/api/talent/candidates/import',            handler: batchImport },
  { method: 'GET',  path: '/api/talent/candidates/import/template',   handler: downloadTemplate },
  { method: 'GET',  path: '/api/talent/candidates/:id',               handler: getCandidate },
  { method: 'POST', path: '/api/talent/candidates',                   handler: createCandidate },
  { method: 'PUT',  path: '/api/talent/candidates/:id',               handler: updateCandidate },
  { method: 'PATCH',path: '/api/talent/candidates/:id/status',        handler: updateStatus },
  { method: 'DELETE',path: '/api/talent/candidates/:id',              handler: deleteCandidate },

  { method: 'GET',  path: '/api/talent/candidates/:id/experiences',         handler: listExperiences },
  { method: 'POST', path: '/api/talent/candidates/:id/experiences',         handler: addExperience },
  { method: 'PUT',  path: '/api/talent/candidates/:id/experiences/:expId',  handler: updateExperience },
  { method: 'DELETE',path: '/api/talent/candidates/:id/experiences/:expId', handler: deleteExperience },

  { method: 'POST',  path: '/api/talent/candidates/:id/attachments',          handler: uploadAttachment },
  { method: 'GET',   path: '/api/talent/candidates/:id/attachments',          handler: listAttachments },
  { method: 'GET',   path: '/api/talent/candidates/:id/attachments/upload-url', handler: getUploadUrl },
  { method: 'POST',  path: '/api/talent/candidates/:id/attachments/confirm',  handler: confirmUpload },
  { method: 'DELETE',path: '/api/talent/candidates/:id/attachments/:attachId',handler: deleteAttachment },
  { method: 'GET',   path: '/api/talent/attachments/:id/download',            handler: downloadAttachment },
  { method: 'GET',   path: '/api/talent/attachments/:id/download-url',        handler: getDownloadUrl },
  { method: 'GET',   path: '/api/talent/attachments/:id/preview',             handler: previewAttachment },
  { method: 'GET',   path: '/api/talent/upload-quota',                        handler: getUploadQuota },
]
