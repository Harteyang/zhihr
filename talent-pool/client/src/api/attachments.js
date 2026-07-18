import api from './index.js'

export const getAttachments = (candidateId) => api.get(`/talent/candidates/${candidateId}/attachments`)
export const deleteAttachment = (candidateId, attachId) => api.delete(`/talent/candidates/${candidateId}/attachments/${attachId}`)
export const getUploadUrl = (candidateId, params) => api.get(`/talent/candidates/${candidateId}/attachments/upload-url`, { params })
export const confirmUpload = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/attachments/confirm`, data)
export const getDownloadUrl = (attachId) => api.get(`/talent/attachments/${attachId}/download-url`)
export const downloadUrl = (attachId) => `${api.defaults.baseURL}/talent/attachments/${attachId}/download`
export const previewAttachment = (attachId) => api.get(`/talent/attachments/${attachId}/preview`)
export const previewPdfAttachment = (attachId) => api.get(`/talent/attachments/${attachId}/preview`, { responseType: 'blob' })
export const getUploadQuota = () => api.get('/talent/upload-quota')