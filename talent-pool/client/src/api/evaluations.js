import api from './index.js'

// 面试评价（内部）
export const getEvaluations = (candidateId) => api.get(`/talent/candidates/${candidateId}/evaluations`)
export const createEvaluation = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/evaluations`, data)
export const updateEvaluation = (candidateId, evalId, data) => api.put(`/talent/candidates/${candidateId}/evaluations/${evalId}`, data)
export const deleteEvaluation = (candidateId, evalId) => api.delete(`/talent/candidates/${candidateId}/evaluations/${evalId}`)

// 分享链接管理（内部）
export const getShareLinks = (candidateId) => api.get(`/talent/candidates/${candidateId}/share-links`)
export const createShareLink = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/share-links`, data)
export const deleteShareLink = (candidateId, linkId) => api.delete(`/talent/candidates/${candidateId}/share-links/${linkId}`)

// 跟进记录
export const getFollowRecords = (candidateId) => api.get(`/talent/candidates/${candidateId}/follow-records`)
