import { create } from 'zustand'
import * as reviewsApi from '@/api/reviews'
import { saveToLocalStorage, loadFromLocalStorage, migrateLegacyData } from '@/lib/storage'
import type { Review, ReviewContent } from '@/types/review'
import { useAuthStore } from './auth'

const DEBUG = import.meta.env.DEV || localStorage.getItem('DEBUG_MODE') === 'true'

function truncate(obj: unknown, maxLen = 200): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

function debugLog(_tag: string, ...args: unknown[]) {
  if (DEBUG) console.log(`[Reviews]`, ...args)
}

function debugError(_tag: string, ...args: unknown[]) {
  if (DEBUG) console.error(`[Reviews]`, ...args)
}

interface ReviewsState {
  reviews: Review[]
  isLoading: boolean

  getRecordByDate: (date: string) => Review | undefined
  getRecordsInRange: (start: string, end: string) => Review[]

  saveRecord: (date: string, content: ReviewContent, summary: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>

  loadFromCloud: () => Promise<void>
  syncLocalToCloud: () => Promise<void>
  loadFromLocalStorage: () => void
}

function mergeReviews(local: Review[], cloud: Review[]): Review[] {
  const map = new Map<string, Review>()

  local.forEach(r => map.set(r.id, r))

  cloud.forEach(cr => {
    const existing = map.get(cr.id)
    if (!existing) {
      map.set(cr.id, cr)
    } else {
      const localIsNewer = new Date(existing.updatedAt) > new Date(cr.updatedAt)
      if (!localIsNewer) map.set(cr.id, cr)
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  reviews: [],
  isLoading: true,

  getRecordByDate: (date) => get().reviews.find(r => r.date === date),
  getRecordsInRange: (start, end) => get().reviews.filter(r => r.date >= start && r.date <= end),

  saveRecord: async (date, content, summary) => {
    debugLog('saveRecord() called', { date, hasContent: !!content, hasSummary: !!summary })

    const { isAuthenticated } = useAuthStore.getState()
    debugLog('Auth status:', isAuthenticated ? 'authenticated' : 'not authenticated')

    const now = new Date().toISOString()
    const existing = get().reviews.find(r => r.date === date)
    let updated: Review

    if (existing) {
      debugLog('Found existing review, updating:', existing.id)
      updated = { ...existing, content, summary, updatedAt: now }
      set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
    } else {
      debugLog('Creating new review')
      updated = {
        id: crypto.randomUUID(),
        date,
        title: date,
        content,
        summary,
        createdAt: now,
        updatedAt: now,
      }
      set({ reviews: [updated, ...get().reviews] })
    }

    debugLog('Saving to localStorage')
    saveToLocalStorage(get().reviews)

    if (isAuthenticated) {
      debugLog('Calling cloud API...')
      try {
        if (existing) {
          debugLog('PUT /api/reviews/:id', existing.id)
          await reviewsApi.updateReview(existing.id, { date, content, summary })
          debugLog('Update success')
        } else {
          debugLog('POST /api/reviews', { id: updated.id, date })
          const result = await reviewsApi.createReview({ id: updated.id, date, content, summary })
          debugLog('Create success, returned:', truncate(result.data))
          if (result.data?.id && result.data.id !== updated.id) {
            debugLog('Server assigned different ID, updating local:', result.data.id)
            set({ reviews: get().reviews.map(r =>
              r.id === updated.id ? { ...r, id: result.data.id } : r
            )})
          }
        }
      } catch (err) {
        debugError('Cloud save failed:', err)
        console.warn('云端保存失败，数据已本地缓存:', err)
      }
    } else {
      debugLog('Not authenticated, skipping cloud save')
    }
  },

  deleteRecord: async (id) => {
    debugLog('deleteRecord() called', id)

    set({ reviews: get().reviews.filter(r => r.id !== id) })
    saveToLocalStorage(get().reviews)
    debugLog('Removed from localStorage')

    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      debugLog('Calling DELETE /api/reviews/:id', id)
      try {
        await reviewsApi.deleteReview(id)
        debugLog('Delete success')
      } catch (err) {
        debugError('Cloud delete failed:', err)
        console.warn('云端删除失败:', err)
      }
    }
  },

  loadFromCloud: async () => {
    debugLog('loadFromCloud() called')
    set({ isLoading: true })

    const { isAuthenticated } = useAuthStore.getState()
    debugLog('Auth status:', isAuthenticated ? 'authenticated' : 'not authenticated')

    if (!isAuthenticated) {
      debugLog('Not authenticated, skipping cloud load')
      set({ isLoading: false })
      return
    }

    try {
      const allReviews: Review[] = []
      let page = 1
      let hasMore = true

      debugLog('Fetching reviews from cloud...')
      while (hasMore) {
        debugLog('GET /api/reviews page:', page)
        const result = await reviewsApi.getReviews({ page, pageSize: 100 })
        debugLog('Page', page, 'returned', result.data.length, 'reviews, total:', result.pagination.total)
        allReviews.push(...result.data)
        hasMore = page < result.pagination.totalPages
        page++
      }

      const localReviews = get().reviews
      debugLog('Local reviews:', localReviews.length)
      const merged = mergeReviews(localReviews, allReviews)
      debugLog('Merged reviews:', merged.length)

      set({ reviews: merged, isLoading: false })
      saveToLocalStorage(merged)
    } catch (err) {
      debugError('loadFromCloud failed:', err)
      set({ isLoading: false })
    }
  },

  syncLocalToCloud: async () => {
    debugLog('syncLocalToCloud() called')

    const localReviews = loadFromLocalStorage()
    debugLog('Local reviews count:', localReviews?.length ?? 0)

    if (!localReviews || localReviews.length === 0) {
      debugLog('No local reviews to sync')
      return
    }

    try {
      debugLog('POST /api/reviews/sync with', localReviews.length, 'reviews')
      debugLog('First review sample:', truncate(localReviews[0]))
      const result = await reviewsApi.syncReviews(localReviews)
      debugLog('Sync result:', result.data.length, 'reviews, synced:', result.synced)
      set({ reviews: result.data })
      saveToLocalStorage(result.data)
    } catch (err) {
      debugError('syncLocalToCloud failed:', err)
    }
  },

  loadFromLocalStorage: () => {
    debugLog('loadFromLocalStorage() called')
    const migrated = migrateLegacyData()
    debugLog('Loaded', migrated?.length ?? 0, 'reviews from localStorage')
    set({ reviews: migrated || [], isLoading: false })
  },
}))

export { mergeReviews }
