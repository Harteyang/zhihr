import { jsonResponse, maskError, requireAuth, logOperation, getClientIp } from '../../utils/router.js'
import { checkPositionPermission } from './permissions.js'

// talent_intake_profiles 可编辑字段（排除 id/candidate_id/created_at/updated_at）
const INTAKE_PROFILE_FIELDS = [
  'gender', 'birth_month', 'ethnicity', 'marital_status', 'hometown', 'household_type',
  'address', 'health_status', 'height', 'political_status',
  'id_number', 'id_expiry_start', 'id_expiry_end', 'wechat',
  'current_salary', 'expected_salary_min', 'expected_salary_max',
  'onboard_time', 'has_referral', 'referral_text',
  'school', 'major', 'graduation_start', 'graduation_end', 'is_unified', 'certificates',
  'non_compete', 'non_compete_note', 'arbitration_record',
  'bank_card', 'bank_name',
  'truth_confirmed', 'filled_date'
]

// 简历解析可回填的字段
const PARSED_INTAKE_FIELDS = [
  'gender', 'birth_month', 'ethnicity', 'marital_status', 'hometown',
  'address', 'health_status', 'height', 'political_status',
  'school', 'major', 'graduation_start', 'graduation_end'
]

const CONTACT_FIELDS = ['name', 'relation', 'gender', 'birth_month', 'phone']

async function loadCandidateWithPermission(env, user, id) {
  const candidate = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
  if (!candidate) return { error: { success: false, message: '候选人不存在', status: 404 } }
  if (candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
    return { error: { success: false, message: '无权操作该候选人', status: 403 } }
  }
  return { candidate }
}

async function getIntake(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const { error: permError } = await loadCandidateWithPermission(env, user, params.id)
    if (permError) return jsonResponse(permError, permError.status, corsHeaders)

    const profile = await env.DB.prepare(
      'SELECT * FROM talent_intake_profiles WHERE candidate_id = ?'
    ).bind(params.id).first()

    const contacts = await env.DB.prepare(
      'SELECT * FROM talent_intake_contacts WHERE candidate_id = ? ORDER BY contact_type, id'
    ).bind(params.id).all()

    return jsonResponse({
      success: true,
      data: { profile: profile || null, contacts: contacts.results }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateIntake(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const { candidate, error: permError } = await loadCandidateWithPermission(env, user, params.id)
    if (permError) return jsonResponse(permError, permError.status, corsHeaders)

    const body = await request.json()
    const candidateId = candidate.id

    const statements = []

    // upsert 主表
    const profileFields = INTAKE_PROFILE_FIELDS.filter(f => body[f] !== undefined)
    if (profileFields.length > 0) {
      const columns = ['candidate_id', ...profileFields]
      const placeholders = columns.map(() => '?').join(', ')
      const updates = profileFields.map(f => `${f} = excluded.${f}`).join(', ')
      const values = [candidateId, ...profileFields.map(f => {
        let v = body[f]
        if (f === 'truth_confirmed') v = v ? 1 : 0
        return v === '' ? null : v
      })]
      statements.push(env.DB.prepare(
        `INSERT INTO talent_intake_profiles (${columns.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT(candidate_id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP`
      ).bind(...values))
    }

    // 联系人整体替换
    if (Array.isArray(body.contacts)) {
      statements.push(env.DB.prepare('DELETE FROM talent_intake_contacts WHERE candidate_id = ?').bind(candidateId))
      for (const c of body.contacts) {
        const type = c.contact_type === 'emergency' ? 'emergency' : 'family'
        if (!c.name && !c.phone && !c.relation) continue
        const values = [candidateId, type]
        const columns = ['candidate_id', 'contact_type']
        for (const f of CONTACT_FIELDS) {
          columns.push(f)
          values.push(c[f] || null)
        }
        statements.push(env.DB.prepare(
          `INSERT INTO talent_intake_contacts (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
        ).bind(...values))
      }
    }

    if (statements.length > 0) {
      await env.DB.batch(statements)
    }

    await logOperation(env, user, 'update_candidate_intake', 'candidate', String(candidateId), {
      candidate_id: candidateId,
      candidate_name: candidate.name,
      fields: profileFields
    }, getClientIp(request))

    return getIntake(request, env, corsHeaders, params)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

// 创建候选人时，根据 AI 解析结果生成登记信息写入语句（供 candidates.js 调用）
function buildIntakeProfileInsert(env, candidateId, parsed) {
  if (!parsed) return null
  const fields = PARSED_INTAKE_FIELDS.filter(f => parsed[f] !== undefined && parsed[f] !== null && parsed[f] !== '')
  if (fields.length === 0) return null
  const columns = ['candidate_id', ...fields]
  const values = [candidateId, ...fields.map(f => String(parsed[f]))]
  return env.DB.prepare(
    `INSERT INTO talent_intake_profiles (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  ).bind(...values)
}

export const routes = [
  { method: 'GET', path: '/api/talent/candidates/:id/intake', handler: getIntake },
  { method: 'PUT', path: '/api/talent/candidates/:id/intake', handler: updateIntake },
]

export { buildIntakeProfileInsert, INTAKE_PROFILE_FIELDS }
