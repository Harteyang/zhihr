const API_BASE = import.meta.env.VITE_API_BASE || 'https://api2.zhihr.vip'

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  return res.json()
}

export function searchBooks(query) {
  return request(`/api/books/search?q=${encodeURIComponent(query)}`)
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
