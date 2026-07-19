import api from './index.js'

// 公开分享页接口（不需要 Authorization token，但 axios 实例会自动带上 localStorage 中的 token，
// 后端 share-public 路由不依赖 token，所以兼容）
export const getShareInfo = (token) => api.get(`/talent/share/${token}`)
export const getShareDownloadUrl = (token, attachId) => api.get(`/talent/share/${token}/attachments/${attachId}/download-url`)
// Word/TXT 预览：返回 JSON { type: 'html', html }；PDF 预览请用 fetch 直接调用 previewSharePdfUrl
export const previewShareAttachment = (token, attachId) => api.get(`/talent/share/${token}/attachments/${attachId}/preview`)
// PDF 预览直链（fetch 该 URL 拿 blob 后用 URL.createObjectURL 创建预览 src）
export const previewSharePdfUrl = (token, attachId) => `${api.defaults.baseURL}/talent/share/${token}/attachments/${attachId}/preview`
export const submitShareEvaluation = (token, data) => api.post(`/talent/share/${token}/evaluations`, data)
export const updateShareEvaluation = (token, data) => api.put(`/talent/share/${token}/evaluations`, data)
