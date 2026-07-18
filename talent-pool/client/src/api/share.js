import api from './index.js'

// 公开分享页接口（不需要 Authorization token，但 axios 实例会自动带上 localStorage 中的 token，
// 后端 share-public 路由不依赖 token，所以兼容）
export const getShareInfo = (token) => api.get(`/talent/share/${token}`)
export const getShareDownloadUrl = (token, attachId) => api.get(`/talent/share/${token}/attachments/${attachId}/download-url`)
export const submitShareEvaluation = (token, data) => api.post(`/talent/share/${token}/evaluations`, data)
export const updateShareEvaluation = (token, data) => api.put(`/talent/share/${token}/evaluations`, data)
