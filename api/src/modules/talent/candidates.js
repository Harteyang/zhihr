import { debugLog, jsonResponse, maskError, parsePagination, requireAuth, requireAdmin, getUserPositions, logOperation, getClientIp } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { checkPositionPermission } from './permissions.js'

const VALID_STATUSES = [
  'to_recommend',      // 待推荐
  'resume_passed',     // 简历筛选通过
  'interview_scheduled', // 已安排面试
  'interview_passed',  // 面试通过
  'offer_discussing',  // offer沟通
  'offer_rejected',    // 拒绝offer
  'hired',             // 已录用
  'screening_failed'   // 筛选不通过
]

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8'
}

function getMimeType(ext) {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream'
}

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
        conditions.push('created_by = ?')
        params.push(user.userId)
      } else {
        conditions.push(`(created_by = ? OR position IN (${allowedPositions.map(() => '?').join(',')}))`)
        params.push(user.userId, ...allowedPositions)
      }
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

    if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
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

function normalizeName(name) {
  if (!name) return ''
  return String(name).replace(/[\s\u3000\u00A0]+/g, '').toLowerCase()
}

function normalizePhone(phone) {
  if (!phone) return ''
  let digits = String(phone).replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('86')) {
    digits = digits.slice(2)
  }
  return digits
}

async function checkDuplicate(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const rawName = url.searchParams.get('name') || ''
    const rawPhone = url.searchParams.get('phone') || ''

    const normalizedName = normalizeName(rawName)
    const normalizedPhone = normalizePhone(rawPhone)

    if (!normalizedName || !normalizedPhone) {
      await logOperation(env, user, 'check_duplicate_candidate', 'candidate', null, {
        name: rawName, phone: rawPhone, found: false, reason: 'missing_required_field'
      }, getClientIp(request))
      return jsonResponse({ success: true, data: { duplicate: false, matches: [] } }, 200, corsHeaders)
    }

    const rows = await env.DB.prepare(
      `SELECT id, name, phone, email, position, status, created_at
       FROM talent_candidates
       WHERE name = ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).bind(rawName.trim()).all()

    const matches = (rows.results || []).filter(c => normalizePhone(c.phone) === normalizedPhone)
    const found = matches.length > 0

    await logOperation(env, user, 'check_duplicate_candidate', 'candidate', null, {
      name: rawName, phone: rawPhone, found, matchCount: matches.length,
      matchIds: matches.map(m => m.id)
    }, getClientIp(request))

    return jsonResponse({
      success: true,
      data: { duplicate: found, matches }
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
    if (!body.name || !body.name.trim()) {
      return jsonResponse({ success: false, message: '姓名为必填项' }, 400, corsHeaders)
    }
    if (!body.position || !body.position.trim()) {
      return jsonResponse({ success: false, message: '岗位为必填项' }, 400, corsHeaders)
    }

    const skillsJson = Array.isArray(body.skills) ? JSON.stringify(body.skills) : (body.skills || null)
    const result = await env.DB.prepare(`
      INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name.trim(), body.phone || null, body.email || null, body.position.trim(),
      skillsJson, body.education || null, body.experience_years || null,
      body.status || 'to_recommend', body.source || null, body.summary || null, user.userId
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

    if (existing.created_by !== user.userId && !(await checkPositionPermission(env, user, existing.position, existing.created_by))) {
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

    await logOperation(env, user, 'update_candidate', 'candidate', String(id), {
      candidate_id: Number(id),
      candidate_name: existing.name,
      fields: fields.filter(f => !f.startsWith('updated_at')).map(f => f.split(' = ')[0])
    }, getClientIp(request))

    return getCandidate(request, env, corsHeaders, { id })
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateStatus(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return jsonResponse({ success: false, message: `无效状态，允许值: ${VALID_STATUSES.join(', ')}` }, 400, corsHeaders)
    }

    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    if (existing.created_by !== user.userId && !(await checkPositionPermission(env, user, existing.position, existing.created_by))) {
      return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
    }

    // 状态未变化时直接返回，避免在跟进记录里产生噪音
    if (existing.status === body.status) {
      return getCandidate(request, env, corsHeaders, { id: params.id })
    }

    await env.DB.prepare('UPDATE talent_candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(body.status, params.id).run()

    // 记录状态变更到操作日志，便于在跟进记录中展示新旧状态
    await logOperation(env, user, 'update_candidate_status', 'candidate', String(params.id), {
      candidate_id: Number(params.id),
      candidate_name: existing.name,
      from: existing.status,
      to: body.status
    }, getClientIp(request))

    return getCandidate(request, env, corsHeaders, { id: params.id })
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

export const routes = [
  { method: 'GET', path: '/api/talent/candidates', handler: listCandidates },
  { method: 'GET', path: '/api/talent/candidates/filter-options', handler: getFilterOptions },
  { method: 'GET', path: '/api/talent/candidates/check-duplicate', handler: checkDuplicate },
  { method: 'GET', path: '/api/talent/candidates/:id', handler: getCandidate },
  { method: 'POST', path: '/api/talent/candidates', handler: createCandidate },
  { method: 'PUT', path: '/api/talent/candidates/:id', handler: updateCandidate },
  { method: 'PATCH', path: '/api/talent/candidates/:id/status', handler: updateStatus },
  { method: 'DELETE', path: '/api/talent/candidates/:id', handler: deleteCandidate },
]

async function createCandidateFromParse(env, aiResult, task, createdBy) {
  const skillsJson = Array.isArray(aiResult.skills) ? JSON.stringify(aiResult.skills) : null
  const insertResult = await env.DB.prepare(`
    INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'to_recommend', ?, ?, ?)
  `).bind(
    String(aiResult.name).trim(),
    aiResult.phone || null,
    aiResult.email || null,
    String(aiResult.position).trim(),
    skillsJson,
    aiResult.education || null,
    aiResult.experience_years || null,
    'AI批量解析',
    aiResult.summary || null,
    createdBy
  ).run()

  const candidateId = insertResult.meta.last_row_id

  if (Array.isArray(aiResult.experiences) && aiResult.experiences.length > 0) {
    const expStmts = aiResult.experiences
      .filter(exp => exp.company && exp.title)
      .map(exp => env.DB.prepare(
        `INSERT INTO talent_work_experiences (candidate_id, company, title, start_date, end_date, description)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(candidateId, exp.company, exp.title, exp.start_date || null, exp.end_date || null, exp.description || null))
    if (expStmts.length > 0) {
      await env.DB.batch(expStmts)
    }
  }

  await env.DB.prepare(
    `INSERT INTO talent_attachments (candidate_id, file_name, file_type, r2_key, file_size)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(candidateId, task.file_name, task.file_type, task.oss_key, task.file_size || 0).run()

  return { candidateId, parsedData: aiResult }
}

export { VALID_STATUSES, getMimeType, createCandidateFromParse, normalizeName, normalizePhone }