import { debugLog, jsonResponse, maskError, parsePagination, requireAuth, requireAdmin, getUserPositions, logOperation, getClientIp } from '../utils/router.js'
import { parseFile, parseExcel, generateTemplateBuffer } from './talent_parsers.js'

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

    const newId = result.meta.last_row_id_string
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

  try {
    const id = params.id
    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const attachments = await env.DB.prepare('SELECT r2_key FROM talent_attachments WHERE candidate_id = ?').bind(id).all()
    for (const att of attachments.results) {
      try { await env.RESUME_BUCKET.delete(att.r2_key) } catch (e) { debugLog('Talent', 'R2 delete failed:', att.r2_key) }
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

    const exp = await env.DB.prepare('SELECT * FROM talent_work_experiences WHERE id = ?').bind(result.meta.last_row_id_string).first()
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

async function uploadAttachment(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidateId = params.id
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (!(await checkPositionPermission(env, user, candidate.position))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse({ success: false, message: '文件大小不能超过 10MB' }, 400, corsHeaders)
    }

    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}` }, 400, corsHeaders)
    }

    const timestamp = Date.now()
    const r2Key = `resumes/${candidateId}/${timestamp}_${fileName}`

    await env.RESUME_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type }
    })

    const fileType = ext.replace('.', '')
    const result = await env.DB.prepare(`
      INSERT INTO talent_attachments (candidate_id, file_name, file_type, r2_key, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).bind(candidateId, fileName, fileType, r2Key, file.size).run()

    const attachment = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE id = ?'
    ).bind(result.meta.last_row_id_string).first()

    await logOperation(env, user, 'upload_attachment', 'attachment', String(attachment.id), { candidate_id: candidateId, file_name: fileName }, getClientIp(request))

    return jsonResponse({ success: true, data: attachment }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
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
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const attachment = await env.DB.prepare(
      'SELECT * FROM talent_attachments WHERE id = ? AND candidate_id = ?'
    ).bind(params.attachId, params.id).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }

    try { await env.RESUME_BUCKET.delete(attachment.r2_key) } catch (e) { debugLog('Talent', 'R2 delete failed:', attachment.r2_key) }

    await env.DB.prepare('DELETE FROM talent_attachments WHERE id = ?').bind(params.attachId).run()

    await logOperation(env, user, 'delete_attachment', 'attachment', String(params.attachId), { file_name: attachment.file_name }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function downloadAttachment(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

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

    const object = await env.RESUME_BUCKET.get(attachment.r2_key)
    if (!object) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`)
    headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'] || '*')

    return new Response(object.body, { headers })
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
    return jsonResponse({ success: true, data: parsed }, 200, corsHeaders)
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
  { method: 'DELETE',path: '/api/talent/candidates/:id/attachments/:attachId',handler: deleteAttachment },
  { method: 'GET',   path: '/api/talent/attachments/:id/download',            handler: downloadAttachment },
]
