import api from './index.js'

// ===== 内部管理接口（需登录认证）=====
// 列出某候选人的所有简历分享链接
export const getResumeShareLinks = (candidateId) => api.get(`/talent/candidates/${candidateId}/resume-shares`)
// 创建简历分享链接（永久有效）
export const createResumeShareLink = (candidateId) => api.post(`/talent/candidates/${candidateId}/resume-shares`)
// 删除简历分享链接
export const deleteResumeShareLink = (candidateId, linkId) => api.delete(`/talent/candidates/${candidateId}/resume-shares/${linkId}`)

// ===== 公开访问接口（无需登录，面试官使用）=====
// 获取候选人信息 + 工作经历 + 附件列表 + 当前状态
export const getResumeShareInfo = (token) => api.get(`/talent/resume-share/${token}`)
// 获取附件下载直链
export const getResumeShareDownloadUrl = (token, attachId) => api.get(`/talent/resume-share/${token}/attachments/${attachId}/download-url`)
// Word/TXT 预览：返回 JSON { type: 'html', html }；PDF 预览请用 fetch 直接调用 previewResumeSharePdfUrl
export const previewResumeShareAttachment = (token, attachId) => api.get(`/talent/resume-share/${token}/attachments/${attachId}/preview`)
// PDF 预览直链（fetch 该 URL 拿 blob 后用 URL.createObjectURL 创建预览 src）
export const previewResumeSharePdfUrl = (token, attachId) => `${api.defaults.baseURL}/talent/resume-share/${token}/attachments/${attachId}/preview`
// 面试官操作：安排面试 / 筛选不通过
export const submitResumeShareAction = (token, data) => api.post(`/talent/resume-share/${token}/action`, data)
