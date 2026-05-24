import { create } from 'zustand'
import * as reviewsApi from '@/api/reviews'
import { saveToLocalStorage, loadFromLocalStorage, migrateLegacyData } from '@/lib/storage'
import type { Review, ReviewContent } from '@/types/review'
import { useAuthStore } from './auth'

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
    const { isAuthenticated } = useAuthStore.getState()
    const now = new Date().toISOString()
    const existing = get().reviews.find(r => r.date === date)
    let updated: Review

    if (existing) {
      updated = { ...existing, content, summary, updatedAt: now }
      set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
    } else {
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
    saveToLocalStorage(get().reviews)

    if (isAuthenticated) {
      try {
        if (existing) {
          await reviewsApi.updateReview(existing.id, { date, content, summary })
        } else {
          const result = await reviewsApi.createReview({ id: updated.id, date, content, summary })
          if (result.data?.id && result.data.id !== updated.id) {
            set({ reviews: get().reviews.map(r =>
              r.id === updated.id ? { ...r, id: result.data.id } : r
            )})
          }
        }
      } catch (err) {
        console.warn('云端保存失败，数据已本地缓存:', err)
      }
    }
  },

  deleteRecord: async (id) => {
    set({ reviews: get().reviews.filter(r => r.id !== id) })
    saveToLocalStorage(get().reviews)

    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      try {
        await reviewsApi.deleteReview(id)
      } catch (err) {
        console.warn('云端删除失败:', err)
      }
    }
  },

  loadFromCloud: async () => {
    set({ isLoading: true })
    try {
      const allReviews: Review[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const result = await reviewsApi.getReviews({ page, pageSize: 100 })
        allReviews.push(...result.data)
        hasMore = page < result.pagination.totalPages
        page++
      }

      const localReviews = get().reviews
      const merged = mergeReviews(localReviews, allReviews)

      set({ reviews: merged, isLoading: false })
      saveToLocalStorage(merged)
    } catch {
      set({ isLoading: false })
    }
  },

  syncLocalToCloud: async () => {
    const localReviews = loadFromLocalStorage()
    console.log('[Reviews] syncLocalToCloud - local reviews:', localReviews?.length ?? 0)
    if (!localReviews || localReviews.length === 0) return

    try {
      console.log('[Reviews] Calling syncReviews API with', localReviews.length, 'reviews')
      console.log('[Reviews] Sample review:', JSON.stringify(localReviews[0]).substring(0, 200))
      const result = await reviewsApi.syncReviews(localReviews)
      console.log('[Reviews] syncReviews result:', result.data.length, 'reviews returned, success:', result.success)
      set({ reviews: result.data })
      saveToLocalStorage(result.data)
    } catch (err) {
      console.error('[Reviews] syncLocalToCloud failed:', err)
    }
  },

  loadFromLocalStorage: () => {
    const migrated = migrateLegacyData()
    set({ reviews: migrated || [], isLoading: false })
  },
}))

export { mergeReviews }
