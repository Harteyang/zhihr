import { jsonResponse, maskError, requireAuth, getClientIp } from '../../utils/router.js'
import { OSSClient } from '../../utils/oss.js'
import { docxToHtml, docToHtml, txtToHtml } from '../../modules/talent_parsers.js'
import { checkPositionPermission } from './permissions.js'

function sanitizeHtml(html) {
  if (typeof html !== 'string') return ''
  // 使用 DOMPurify 风格的消毒，生产环境建议使用 DOMPurify 库
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src|action|background|formaction)\s*=\s*["']?\s*javascript:/gi, '$1="#"')
    .replace(/xlink:href\s*=\s*["']?\s*javascript:/gi, 'xlink:href="#"')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<math[\s\S]*?<\/math>/gi, '')
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

    const candidate = await env.DB.prepare('SELECT position, created_by FROM talent_candidates WHERE id = ?').bind(attachment.candidate_id).first()
    if (candidate && candidate.created_by !== user.userId && !(await checkPositionPermission(env, user, candidate.position, candidate.created_by))) {
      return jsonResponse({ success: false, message: '无权预览该附件' }, 403, corsHeaders)
    }

    const ossRes = await oss.get(attachment.r2_key)
    if (!ossRes) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const arrayBuffer = await ossRes.arrayBuffer()

    const MAX_PREVIEW_SIZE = 10 * 1024 * 1024
    if (arrayBuffer.byteLength > MAX_PREVIEW_SIZE) {
      return jsonResponse({ success: false, message: '文件过大，无法预览，请下载后查看' }, 400, corsHeaders)
    }

    const fileType = attachment.file_type?.toLowerCase()

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
      return new Response(arrayBuffer, { headers: pdfHeaders })
    } else if (fileType === 'txt') {
      const html = sanitizeHtml(txtToHtml(arrayBuffer))
      return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
    } else {
      return jsonResponse({ success: false, message: '该文件类型不支持在线预览，请下载后查看' }, 400, corsHeaders)
    }
  } catch (err) {
    return jsonResponse({ success: false, message: maskError(err) }, 500, corsHeaders)
  }
}

export const routes = [
  { method: 'GET', path: '/api/talent/attachments/:id/preview', handler: previewAttachment },
]