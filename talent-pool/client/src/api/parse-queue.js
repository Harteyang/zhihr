import api from './index.js'

export const getBatchUploadUrl = (data) => api.post('/talent/parse-tasks/batch-upload-url', data)
export const createBatchParseTasks = (data) => api.post('/talent/parse-tasks/batch', data)
export const getBatchStatus = (batchId) => api.get(`/talent/parse-tasks/batch/${batchId}`, { timeout: 120000 })
export const getParseTaskHistory = (params) => api.get('/talent/parse-tasks/history', { params })
export const retryParseTask = (taskId) => api.post(`/talent/parse-tasks/${taskId}/retry`)