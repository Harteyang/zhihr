import api from './index.js'

export const getCandidates = (params) => api.get('/talent/candidates', { params })
export const getFilterOptions = () => api.get('/talent/candidates/filter-options')
export const getCandidate = (id) => api.get(`/talent/candidates/${id}`)
export const createCandidate = (data) => api.post('/talent/candidates', data)
export const checkCandidateDuplicate = (name, phone) => api.get('/talent/candidates/check-duplicate', { params: { name, phone } })
export const updateCandidate = (id, data) => api.put(`/talent/candidates/${id}`, data)
export const updateCandidateStatus = (id, status) => api.patch(`/talent/candidates/${id}/status`, { status })
export const deleteCandidate = (id) => api.delete(`/talent/candidates/${id}`)
export const aiParseResume = (formData) => api.post('/talent/candidates/ai-parse-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })

export const getExperiences = (candidateId) => api.get(`/talent/candidates/${candidateId}/experiences`)
export const addExperience = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/experiences`, data)
export const updateExperience = (candidateId, expId, data) => api.put(`/talent/candidates/${candidateId}/experiences/${expId}`, data)
export const deleteExperience = (candidateId, expId) => api.delete(`/talent/candidates/${candidateId}/experiences/${expId}`)