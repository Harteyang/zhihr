const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  try {
    return await res.json()
  } catch {
    throw new Error('服务器响应异常，请稍后重试')
  }
}

export function searchBooks(query) {
  return request(`/api/books/search?q=${encodeURIComponent(query)}`)
}

export function fetchBookList(page = 1, pageSize = 100) {
  return request(`/api/books/list?page=${page}&pageSize=${pageSize}`)
}

export function searchKnowledge(query) {
  return request(`/api/knowledge/search?q=${encodeURIComponent(query)}`)
}

export function searchMlook(query) {
  return request(`/api/mlook/search?q=${encodeURIComponent(query)}`)
}

export function submitDeconstruct(data) {
  return request('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getSubmissionStatus(id) {
  return request(`/api/submission/${id}`)
}
