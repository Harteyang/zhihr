import type { Review } from '@/types/review'

const STORAGE_KEY = 'reviewData'
const AUTOSAVE_KEY = 'reviewAutosave'
const MAX_SIZE = 4 * 1024 * 1024
const MAX_RECORDS = 500

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function saveToLocalStorage(reviews: Review[]): void {
  try {
    const cleaned = reviews.filter(r => r && r.date).slice(0, MAX_RECORDS)
    const json = JSON.stringify(cleaned)

    if (json.length * 2 > MAX_SIZE) {
      const cutoff = daysAgo(30)
      const recent = cleaned.filter(r => r.date >= cutoff)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      emergencyClean()
    }
  }
}

export function loadFromLocalStorage(): Review[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    return JSON.parse(data)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveAutosave(data: { date: string; content: any; summary: string }): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function loadAutosave(): { date: string; content: any; summary: string } | null {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY)
    if (!data) return null
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
}

function emergencyClean(): void {
  try {
    const data = loadFromLocalStorage()
    if (data) {
      const recent = data.filter(r => r.date >= daysAgo(7))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function migrateLegacyData(data: any[]): Review[] {
  return data.map(r => ({
    ...r,
    summary: r.summary || r.title || '',
    content: typeof r.content === 'string'
      ? (() => { try { return JSON.parse(r.content) } catch { return { health: '', work: '', study: '', social: '', finance: '', life: '', spirit: '', leisure: '' } } })()
      : r.content || { health: '', work: '', study: '', social: '', finance: '', life: '', spirit: '', leisure: '' },
  }))
}

export function mergeReviews(local: Review[], cloud: Review[]): Review[] {
  const map = new Map<string, Review>()

  local.forEach(r => map.set(r.id, r))

  cloud.forEach(cr => {
    const existing = map.get(cr.id)
    if (!existing) {
      map.set(cr.id, cr)
    } else {
      const localIsNewer = new Date(existing.updatedAt).getTime() > new Date(cr.updatedAt).getTime()
      if (!localIsNewer) map.set(cr.id, cr)
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
