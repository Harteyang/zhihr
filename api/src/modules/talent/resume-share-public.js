import { jsonResponse, maskError, logOperation, getClientIp, checkRateLimit } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { docxToHtml, docToHtml, txtToHtml } from '../../modules/talent_parsers.js'

// 简历分享操作允许的源状态白名单：仅"待推荐"和"简历筛选通过"状态可触发面试官操作
// 一旦进入 interview_scheduled 及之后的状态（面试通过/offer沟通/拒绝offer/已录用/筛选不通过），
// 均视为终态，不允许通过分享链接回退状态
const ALLOWED_FROM_STATUSES = new Set(['to_recommend', 'resume_passed'])

// 公开操作接口速率限制：每分钟最多 10 次，防止日志刷爆与状态频繁切换
const RATE_LIMIT_MAX_RESUME_ACTION = 10

/**
 * 对 HTML 内容做基本清洗，防止 XSS（针对 .doc 伪装成 HTML 的场景）
 * 与 share-public.js 中的 sanitizeHtml 保持一致
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
 * 简历分享链接公开访问接口（无需登录认证）
 * - GET  /api/talent/resume-share/:token  获取候选人基本信息 + 附件列表
 * - GET  /api/talent/resume-share/:token/attachments/:attachId/preview  公开预览附件
 * - GET  /api/talent/resume-share/:token/attachments/:attachId/download-url  获取附件下载直链
 * - POST /api/talent/resume-share/:token/action  面试官操作（安排面试/筛选不通过）
 */

async function getResumeShareInfo(request, env, corsHeaders, params) {
  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id, created_at FROM talent_resume_shares WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效或已失效' }, 404, corsHeaders)
    }

    const candidate = await env.DB.prepare(
      `SELECT id, name, position, education, experience_years, skills, source, summary, status, created_at
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

    // 解析 skills JSON
    let skills = []
    if (candidate.skills) {
      try { skills = JSON.parse(candidate.skills) } catch { skills = [] }
    }

    return jsonResponse({
      success: true,
      data: {
        share_link_id: link.id,
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
          status: candidate.status,
          created_at: candidate.created_at
        },
        experiences: experiences.results || [],
        attachments: attachments.results
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

async function previewResumeShareAttachment(request, env, corsHeaders, params) {
  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id FROM talent_resume_shares WHERE token = ?'
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

    const MAX_PREVIEW_SIZE = 10 * 1024 * 1024
    if (attachment.file_size && Number(attachment.file_size) > MAX_PREVIEW_SIZE) {
      return jsonResponse({ success: false, message: '文件过大，无法预览，请下载后查看' }, 400, corsHeaders)
    }

    const ossRes = await oss.get(attachment.r2_key)
    if (!ossRes) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const arrayBuffer = await ossRes.arrayBuffer()
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
    console.error('previewResumeShareAttachment error:', err)
    return jsonResponse({ success: false, message: '预览失败，请稍后重试或下载后查看' }, 500, corsHeaders)
  }
}

async function getResumeShareDownloadUrl(request, env, corsHeaders, params) {
  const oss = new OSSClient(env)
  if (!oss.isConfigured()) {
    return jsonResponse({ success: false, message: '文件存储服务未配置（OSS）' }, 503, corsHeaders)
  }

  try {
    const link = await env.DB.prepare(
      'SELECT id, candidate_id FROM talent_resume_shares WHERE token = ?'
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

/**
 * 面试官在简历分享页点击操作按钮
 * action: 'resume_passed'     → 状态更新为 resume_passed（简历筛选通过）
 * action: 'screening_failed'  → 状态更新为 screening_failed（筛选不通过）
 */
async function submitResumeShareAction(request, env, corsHeaders, params) {
  try {
    // Issue 6: 公开接口速率限制，基于 IP + token 维度，每分钟最多 10 次
    const clientIp = getClientIp(request)
    const rateLimitKey = `resume-share-action:${clientIp}:${params.token}`
    if (!await checkRateLimit(env, rateLimitKey, RATE_LIMIT_MAX_RESUME_ACTION)) {
      return jsonResponse({ success: false, message: '操作过于频繁，请稍后再试' }, 429, corsHeaders)
    }

    const link = await env.DB.prepare(
      'SELECT id, candidate_id FROM talent_resume_shares WHERE token = ?'
    ).bind(params.token).first()
    if (!link) {
      return jsonResponse({ success: false, message: '分享链接无效' }, 404, corsHeaders)
    }

    const body = await request.json()
    const action = String(body.action || '').trim()
    const ACTION_MAP = {
      resume_passed: {
        newStatus: 'resume_passed',
        logAction: 'resume_share_pass'
      },
      screening_failed: {
        newStatus: 'screening_failed',
        logAction: 'resume_share_screening_failed'
      }
    }
    const actionConfig = ACTION_MAP[action]
    if (!actionConfig) {
      return jsonResponse({ success: false, message: '无效的操作类型' }, 400, corsHeaders)
    }

    const candidate = await env.DB.prepare(
      'SELECT id, name, status FROM talent_candidates WHERE id = ?'
    ).bind(link.candidate_id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const fromStatus = candidate.status
    const toStatus = actionConfig.newStatus

    // Issue 1: 状态流转合法性校验 —— 仅允许从 to_recommend/resume_passed 流转到终态
    // 拒绝已进入面试流程及之后阶段的回退操作（如 hired → screening_failed）
    if (!ALLOWED_FROM_STATUSES.has(fromStatus)) {
      return jsonResponse({
        success: false,
        message: `候选人当前状态不允许此操作（当前状态：${fromStatus}）`
      }, 409, corsHeaders)
    }

    // Issue 3: 状态未变化时直接返回成功，不写日志（与 candidates.js updateStatus 对齐）
    if (fromStatus === toStatus) {
      return jsonResponse({
        success: true,
        data: {
          candidate_id: link.candidate_id,
          previous_status: fromStatus,
          current_status: toStatus,
          action,
          noop: true
        }
      }, 200, corsHeaders)
    }

    await env.DB.prepare(
      'UPDATE talent_candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(toStatus, link.candidate_id).run()

    await logOperation(env, null, actionConfig.logAction, 'resume_share', String(link.id), {
      candidate_id: link.candidate_id,
      candidate_name: candidate.name,
      share_link_id: link.id,
      from: fromStatus,
      to: toStatus
    }, clientIp)

    return jsonResponse({
      success: true,
      data: {
        candidate_id: link.candidate_id,
        previous_status: fromStatus,
        current_status: toStatus,
        action
      }
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/resume-share/:token', handler: getResumeShareInfo },
  { method: 'GET', path: '/api/talent/resume-share/:token/attachments/:attachId/preview', handler: previewResumeShareAttachment },
  { method: 'GET', path: '/api/talent/resume-share/:token/attachments/:attachId/download-url', handler: getResumeShareDownloadUrl },
  { method: 'POST', path: '/api/talent/resume-share/:token/action', handler: submitResumeShareAction }
]
