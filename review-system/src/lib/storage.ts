import type { Review, ReviewContent } from '@/types/review'
import { parseDimensionValue } from '@/types/review'

export function hasContentChanged(newContent: ReviewContent, existingContent: ReviewContent, newSummary?: string, existingSummary?: string): boolean {
  const keys = ['health', 'work', 'study', 'social', 'finance', 'life', 'spirit', 'leisure'] as const
  
  for (const key of keys) {
    const newParsed = parseDimensionValue(newContent[key])
    const existingParsed = parseDimensionValue(existingContent[key])
    
    const newVal = JSON.stringify(newParsed)
    const existingVal = JSON.stringify(existingParsed)
    
    if (newVal !== existingVal) {
      return true
    }
  }
  
  if (newSummary !== undefined && existingSummary !== undefined) {
    if ((newSummary || '').trim() !== (existingSummary || '').trim()) {
      return true
    }
  }
  
  return false
}

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

function areContentsEqual(a: Review['content'], b: Review['content']): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function areReviewsEqual(a: Review, b: Review): boolean {
  if (a.summary !== b.summary) return false
  if (a.date !== b.date) return false
  return areContentsEqual(a.content, b.content)
}

export function deduplicateReviews(reviews: Review[]): Review[] {
  const idMap = new Map<string, Review>()

  for (const r of reviews) {
    const existing = idMap.get(r.id)
    if (!existing) {
      idMap.set(r.id, r)
    } else {
      const existingTime = new Date(existing.updatedAt).getTime()
      const currentTime = new Date(r.updatedAt).getTime()
      if (currentTime > existingTime) {
        idMap.set(r.id, r)
      }
    }
  }

  return Array.from(idMap.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function mergeReviews(local: Review[], cloud: Review[]): Review[] {
  const idMap = new Map<string, Review>()

  const allReviews = [...local, ...cloud]
  
  for (const r of allReviews) {
    const existing = idMap.get(r.id)

    if (!existing) {
      idMap.set(r.id, r)
    } else {
      const existingTime = new Date(existing.updatedAt).getTime()
      const currentTime = new Date(r.updatedAt).getTime()
      
      if (currentTime > existingTime) {
        idMap.set(r.id, r)
      }
    }
  }

  const cloudIds = new Set(cloud.map(c => c.id))
  const result = Array.from(idMap.values()).map(r => ({
    ...r,
    _source: (cloudIds.has(r.id) ? 'cloud' : 'local') as 'cloud' | 'local'
  }))

  return result.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
