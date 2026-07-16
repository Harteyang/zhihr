import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip/api'

const api = axios.create({ baseURL, timeout: 15000 })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      const loginUrl = import.meta.env.BASE_URL + 'login'
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginUrl
      }
    }
    return Promise.reject(error)
  }
)

// 认证
export const login = (username, password) => api.post('/auth/login', { username, password })
export const register = (username, password) => api.post('/auth/register', { username, password })
export const getMe = () => api.get('/auth/me')

// 候选人
export const getCandidates = (params) => api.get('/talent/candidates', { params })
export const getFilterOptions = () => api.get('/talent/candidates/filter-options')
export const getCandidate = (id) => api.get(`/talent/candidates/${id}`)
export const createCandidate = (data) => api.post('/talent/candidates', data)
export const checkCandidateDuplicate = (name, phone) => api.get('/talent/candidates/check-duplicate', { params: { name, phone } })
export const updateCandidate = (id, data) => api.put(`/talent/candidates/${id}`, data)
export const updateCandidateStatus = (id, status) => api.patch(`/talent/candidates/${id}/status`, { status })
export const deleteCandidate = (id) => api.delete(`/talent/candidates/${id}`)
export const aiParseResume = (formData) => api.post('/talent/candidates/ai-parse-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })

// 工作经历
export const getExperiences = (candidateId) => api.get(`/talent/candidates/${candidateId}/experiences`)
export const addExperience = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/experiences`, data)
export const updateExperience = (candidateId, expId, data) => api.put(`/talent/candidates/${candidateId}/experiences/${expId}`, data)
export const deleteExperience = (candidateId, expId) => api.delete(`/talent/candidates/${candidateId}/experiences/${expId}`)

// 附件
export const getAttachments = (candidateId) => api.get(`/talent/candidates/${candidateId}/attachments`)
export const deleteAttachment = (candidateId, attachId) => api.delete(`/talent/candidates/${candidateId}/attachments/${attachId}`)
export const getUploadUrl = (candidateId, params) => api.get(`/talent/candidates/${candidateId}/attachments/upload-url`, { params })
export const confirmUpload = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/attachments/confirm`, data)
export const getDownloadUrl = (attachId) => api.get(`/talent/attachments/${attachId}/download-url`)
export const downloadUrl = (attachId) => `${baseURL}/talent/attachments/${attachId}/download`
export const previewAttachment = (attachId) => api.get(`/talent/attachments/${attachId}/preview`)
export const getUploadQuota = () => api.get('/talent/upload-quota')

// 批量简历解析队列
export const getBatchUploadUrl = (data) => api.post('/talent/parse-tasks/batch-upload-url', data)
export const createBatchParseTasks = (data) => api.post('/talent/parse-tasks/batch', data)
export const getBatchStatus = (batchId) => api.get(`/talent/parse-tasks/batch/${batchId}`, { timeout: 120000 })
export const getParseTaskHistory = (params) => api.get('/talent/parse-tasks/history', { params })
export const retryParseTask = (taskId) => api.post(`/talent/parse-tasks/${taskId}/retry`)

// 用户管理
export const getUsers = () => api.get('/auth/users')
export const getUser = (id) => api.get(`/auth/users/${id}`)
export const createUser = (data) => api.post('/auth/users', data)
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/auth/users/${id}`)
export const updateUserStatus = (id, status) => api.patch(`/auth/users/${id}/status`, { status })
export const getUserPositions = (id) => api.get(`/auth/users/${id}/positions`)
export const setUserPositions = (id, positions) => api.put(`/auth/users/${id}/positions`, { positions })
export const getAvailablePositions = () => api.get('/talent/positions/available')
export const getOperationLogs = (params) => api.get('/auth/operation-logs', { params })

// 批量操作
export const batchUpdateUserStatus = (userIds, status) => api.patch('/auth/users/batch/status', { userIds, status })
export const batchDeleteUsers = (userIds) => api.post('/auth/users/batch/delete', { userIds })
export const batchSetPositions = (userIds, positions) => api.put('/auth/users/batch/positions', { userIds, positions })

export default api
