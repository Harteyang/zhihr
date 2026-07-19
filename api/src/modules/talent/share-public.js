import { jsonResponse, maskError, getClientIp, logOperation } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { docxToHtml, docToHtml, txtToHtml } from '../../modules/talent_parsers.js'

/**
 * 对 HTML 内容做基本清洗，防止 XSS（针对 .doc 伪装成 HTML 的场景）
 * - 移除 <script> / <iframe> / <object> / <embed> / <style> 块
 * - 移除 on* 事件处理器
 * - 移除 javascript: 协议
 * 注意：这是基本防护，不是完整的 sanitizer。生产环境建议用 DOMPurify。
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="#"')
}

/**
 * 分享链接公开访问接口（无需登录认证）
 * - GET /api/talent/share/:token  获取候选人基本信息（含个人简介、工作经历） + 附件列表 + 锁定的评价人姓名 + 已有评价
 * - GET /api/talent/share/:token/attachments/:attachId/download-url  获取附件下载直链
 * - GET /api/talent/share/:token/attachments/:attachId/preview  公开预览附件（PDF 二进制流 / Word&TXT 转 HTML）
 * - POST /api/talent/share/:token/evaluations  提交评价（评价人姓名使用链接锁定的值）
 * - PUT  /api/talent/share/:token/evaluations  修改评价（仅能修改当前 token 关联的评价）
 */

async function getShareInfo(request, env, corsHeaders, params) {
  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id, evaluator_name, created_at FROM talent_share_links WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效或已失效' }, 404, corsHeaders)
    }

    const candidate = await env.DB.prepare(
      `SELECT id, name, position, education, experience_years, skills, source, summary, created_at
       FROM talent_candidates WHERE id = ?`
    ).bind(link.candidate_id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const attachments = await env.DB.prepare(
      `SELECT id, file_name, file_type, file_size, created_at
       FROM talent_attachments WHERE candidate_id = ? ORDER BY created_at DESC`
    ).bind(link.candidate_id).all()

    const experiences = await env.DB.prepare(
      `SELECT id, company, title, start_date, end_date, description
       FROM talent_work_experiences WHERE candidate_id = ? ORDER BY start_date DESC`
    ).bind(link.candidate_id).all()

    const evaluation = await env.DB.prepare(
      `SELECT id, evaluator_name, content, created_at, updated_at
       FROM talent_interview_evaluations WHERE share_link_id = ? LIMIT 1`
    ).bind(link.id).first()

    // 解析 skills JSON
    let skills = []
    if (candidate.skills) {
      try { skills = JSON.parse(candidate.skills) } catch { skills = [] }
    }

    return jsonResponse({
      success: true,
      data: {
        share_link_id: link.id,
        evaluator_name: link.evaluator_name,
        share_created_at: link.created_at,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          position: candidate.position,
          education: candidate.education,
          experience_years: candidate.experience_years,
          skills,
          source: candidate.source,
          summary: candidate.summary || '',
          created_at: candidate.created_at
        },
        experiences: experiences.results || [],
        attachments: attachments.results,
        evaluation: evaluation || null
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function previewShareAttachment(request, env, corsHeaders, params) {
  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id FROM talent_share_links WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效' }, 404, corsHeaders)
    }

    const attachment = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, r2_key FROM talent_attachments WHERE id = ?'
    ).bind(params.attachId).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }
    if (attachment.candidate_id !== link.candidate_id) {
      return jsonResponse({ success: false, message: '无权预览该附件' }, 403, corsHeaders)
    }

    // 文件大小前置检查：利用 DB 中记录的 file_size 提前拒绝超大文件，避免无谓下载
    const MAX_PREVIEW_SIZE = 10 * 1024 * 1024
    if (attachment.file_size && Number(attachment.file_size) > MAX_PREVIEW_SIZE) {
      return jsonResponse({ success: false, message: '文件过大，无法预览，请下载后查看' }, 400, corsHeaders)
    }

    const ossRes = await oss.get(attachment.r2_key)
    if (!ossRes) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const arrayBuffer = await ossRes.arrayBuffer()

    // 实际大小兜底检查（防止 DB 中 file_size 缺失或与 OSS 实际大小不一致）
    if (arrayBuffer.byteLength > MAX_PREVIEW_SIZE) {
      return jsonResponse({ success: false, message: '文件过大，无法预览，请下载后查看' }, 400, corsHeaders)
    }

    const fileType = (attachment.file_type || '').toLowerCase()

    if (fileType === 'docx') {
      const html = sanitizeHtml(docxToHtml(arrayBuffer))
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else if (fileType === 'doc') {
      const html = sanitizeHtml(docToHtml(arrayBuffer))
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else if (fileType === 'pdf') {
      const pdfHeaders = new Headers(corsHeaders)
      pdfHeaders.set('Content-Type', 'application/pdf')
      pdfHeaders.set('Content-Disposition', 'inline')
      pdfHeaders.set('Content-Length', String(arrayBuffer.byteLength))
      return new Response(arrayBuffer, { headers: pdfHeaders })
    } else if (fileType === 'txt') {
      const html = sanitizeHtml(txtToHtml(arrayBuffer))
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else {
      return jsonResponse({ success: false, message: '该文件类型不支持在线预览，请下载后查看' }, 400, corsHeaders)
    }
  } catch (err) {
    // 公开接口错误脱敏：记录详情，对客户端返回通用提示，避免泄露内部错误
    console.error('previewShareAttachment error:', err)
    return jsonResponse({ success: false, message: '预览失败，请稍后重试或下载后查看' }, 500, corsHeaders)
  }
}

async function getShareDownloadUrl(request, env, corsHeaders, params) {
  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id FROM talent_share_links WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效' }, 404, corsHeaders)
    }

    const attachment = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, r2_key FROM talent_attachments WHERE id = ?'
    ).bind(params.attachId).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }
    if (attachment.candidate_id !== link.candidate_id) {
      return jsonResponse({ success: false, message: '无权下载该附件' }, 403, corsHeaders)
    }

    const signedUrl = await oss.getSignedUrl('GET', attachment.r2_key, 300)
    return jsonResponse({
      success: true,
      data: { url: signedUrl, fileName: attachment.file_name }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function submitShareEvaluation(request, env, corsHeaders, params) {
  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id, evaluator_name FROM talent_share_links WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效' }, 404, corsHeaders)
    }

    // 同一分享链接只能提交一次评价，已存在则引导调用 PUT 修改
    const existing = await env.DB.prepare(
      'SELECT id FROM talent_interview_evaluations WHERE share_link_id = ? LIMIT 1'
    ).bind(link.id).first()
    if (existing) {
      return jsonResponse({
        success: false,
        message: '您已提交过评价，请使用修改功能更新内容',
        code: 'EVALUATION_EXISTS',
        data: { evaluation_id: existing.id }
      }, 409, corsHeaders)
    }

    const body = await request.json()
    const content = String(body.content || '').trim()
    if (!content) {
      return jsonResponse({ success: false, message: '评价内容为必填' }, 400, corsHeaders)
    }
    if (content.length > 5000) {
      return jsonResponse({ success: false, message: '评价内容不能超过 5000 字' }, 400, corsHeaders)
    }

    // 评价人姓名写死为分享链接创建时锁定的值
    const result = await env.DB.prepare(
      `INSERT INTO talent_interview_evaluations (candidate_id, evaluator_name, content, source, share_link_id)
       VALUES (?, ?, ?, 'share', ?)`
    ).bind(link.candidate_id, link.evaluator_name, content, link.id).run()

    const evalRow = await env.DB.prepare(
      'SELECT id, evaluator_name, content, created_at, updated_at FROM talent_interview_evaluations WHERE id = ?'
    ).bind(result.meta.last_row_id).first()

    await logOperation(env, null, 'submit_share_evaluation', 'evaluation', String(evalRow.id), {
      candidate_id: link.candidate_id,
      share_link_id: link.id,
      evaluator_name: link.evaluator_name
    }, getClientIp(request))

    return jsonResponse({ success: true, data: evalRow }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function updateShareEvaluation(request, env, corsHeaders, params) {
  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id, evaluator_name FROM talent_share_links WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效' }, 404, corsHeaders)
    }

    const existing = await env.DB.prepare(
      'SELECT id, content FROM talent_interview_evaluations WHERE share_link_id = ? LIMIT 1'
    ).bind(link.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '尚未提交评价，无法修改' }, 404, corsHeaders)
    }

    const body = await request.json()
    const content = String(body.content || '').trim()
    if (!content) {
      return jsonResponse({ success: false, message: '评价内容为必填' }, 400, corsHeaders)
    }
    if (content.length > 5000) {
      return jsonResponse({ success: false, message: '评价内容不能超过 5000 字' }, 400, corsHeaders)
    }

    await env.DB.prepare(
      `UPDATE talent_interview_evaluations SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(content, existing.id).run()

    const updated = await env.DB.prepare(
      'SELECT id, evaluator_name, content, created_at, updated_at FROM talent_interview_evaluations WHERE id = ?'
    ).bind(existing.id).first()

    await logOperation(env, null, 'update_share_evaluation', 'evaluation', String(existing.id), {
      candidate_id: link.candidate_id,
      share_link_id: link.id,
      evaluator_name: link.evaluator_name
    }, getClientIp(request))

    return jsonResponse({ success: true, data: updated }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/share/:token', handler: getShareInfo },
  { method: 'GET', path: '/api/talent/share/:token/attachments/:attachId/preview', handler: previewShareAttachment },
  { method: 'GET', path: '/api/talent/share/:token/attachments/:attachId/download-url', handler: getShareDownloadUrl },
  { method: 'POST', path: '/api/talent/share/:token/evaluations', handler: submitShareEvaluation },
  { method: 'PUT', path: '/api/talent/share/:token/evaluations', handler: updateShareEvaluation }
]
