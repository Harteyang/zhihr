import type { Review, ReviewContent } from '@/types/review'

const STORAGE_KEY = 'reviewData'
const MAX_SIZE = 4 * 1024 * 1024
const MAX_RECORDS = 500

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function validateReviews(data: unknown): Review[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((item): item is Review =>
      item != null && typeof item === 'object' && typeof item.date === 'string' && item.date.length > 0
    )
    .slice(0, MAX_RECORDS)
}

export function saveToLocalStorage(reviews: Review[]): void {
  try {
    const cleaned = validateReviews(reviews)
    const json = JSON.stringify(cleaned)

    if (json.length * 2 > MAX_SIZE) {
      const cutoff = daysAgo(30)
      const recent = cleaned.filter(r => r.date >= cutoff)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      emergencyClean()
    }
  }
}

function emergencyClean(): void {
  try {
    const data = loadFromLocalStorage()
    if (!data) return
    const cutoff = daysAgo(7)
    const recent = data.filter(r => r.date >= cutoff)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  } catch {
    // 无法恢复
  }
}

export function loadFromLocalStorage(): Review[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    const parsed = JSON.parse(data)
    return validateReviews(parsed)
  } catch {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    return null
  }
}

export function migrateLegacyData(): Review[] | null {
  const data = loadFromLocalStorage()
  if (!data) return null

  return data.map(r => ({
    ...r,
    summary: r.summary || r.title || '',
    content: (typeof r.content === 'string'
      ? (() => { try { return JSON.parse(r.content) } catch { return {} } })()
      : r.content) as ReviewContent,
  }))
}
