import { jsonResponse, maskError, requireAuth, requireAdmin, logOperation, getClientIp } from '../../utils/router.js'
import { parseExcel, generateTemplateBuffer } from '../../modules/talent_parsers.js'

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
      if (!row.name || !row.name.trim()) {
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
          INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `).bind(
          row.name.trim(), row.phone || null, row.email || null, row.position || null,
          Array.isArray(skills) ? JSON.stringify(skills) : null,
          row.education || null, expYears, row.source || null, row.summary || null, user.userId
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

export const routes = [
  { method: 'POST', path: '/api/talent/candidates/import', handler: batchImport },
  { method: 'GET', path: '/api/talent/candidates/import/template', handler: downloadTemplate },
]