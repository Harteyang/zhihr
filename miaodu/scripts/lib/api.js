/**
 * API 客户端模块
 * 封装所有与后端 API 的交互
 */
import { config } from './config.js'

class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request(method, path, body = null) {
  const url = `${config.apiBaseUrl}${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(
      data?.message || `API 请求失败: ${res.status}`,
      res.status,
      data
    )
  }

  return data
}

/**
 * 获取待处理的提交队列
 */
export async function getQueuedSubmissions() {
  const data = await request('GET', '/api/submissions?status=queued')
  return data.submissions || []
}

/**
 * 更新提交状态
 */
export async function updateSubmissionStatus(id, status, errorMessage = null) {
  return request('PUT', `/api/submission/${id}`, { status, error_message: errorMessage })
}

/**
 * 回写拆解结果
 */
export async function addBook(bookData) {
  return request('POST', '/api/admin/books', bookData)
}

/**
 * 获取所有提交（可选按状态过滤）
 */
export async function getAllSubmissions(status = '') {
  const path = status ? `/api/submissions?status=${status}` : '/api/submissions'
  const data = await request('GET', path)
  return data.submissions || []
}