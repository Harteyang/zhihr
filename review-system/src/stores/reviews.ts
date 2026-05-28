import { create } from 'zustand'
import type { Review, ReviewContent, ReviewMode } from '@/types/review'
import { saveReview, getReviews, fromApiResponse, deleteReview } from '@/api/reviews'
import { saveToLocalStorage, loadFromLocalStorage, mergeReviews, migrateLegacyData, deduplicateReviews, hasContentChanged } from '@/lib/storage'
import { useAuthStore } from './auth'
import { useToastStore } from './toast'
import { generateId, getToday } from '@/lib/utils'

interface ReviewsState {
  reviews: Review[]
  isLoading: boolean

  getRecordByDate: (date: string) => Review | undefined
  getRecordsInRange: (start: string, end: string) => Review[]

  saveRecord: (date: string, content: ReviewContent, summary: string, mode?: ReviewMode) => Promise<void>
  deleteRecord: (id: string) => Promise<void>

  loadFromCloud: () => Promise<void>
  syncLocalToCloud: () => Promise<void>
  loadFromLocalStorage: () => void
  clearSyncedReviews: () => void
  getLocalOnlyReviews: () => Review[]
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  reviews: [],
  isLoading: false,

  getRecordByDate: (date: string) => {
    return get().reviews.find(r => r.date === date)
  },

  getRecordsInRange: (start: string, end: string) => {
    return get().reviews.filter(r => r.date >= start && r.date <= end)
  },

  saveRecord: async (date, content, summary, mode: ReviewMode = 'auto') => {
    const { isAuthenticated } = useAuthStore.getState()
    const toast = useToastStore.getState()
    const now = new Date().toISOString()
    const today = getToday()
    const summaryVal = summary || date || today

    const DAILY_LIMIT = 10

    // 1. 查找当天最新记录
    const sameDateRecords = get().reviews.filter(r => r.date === date)
    const existing = sameDateRecords.length > 0
      ? sameDateRecords.reduce((latest, r) =>
          new Date(r.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? r : latest
        )
      : undefined

    // 检查内容是否有修改
    const contentChanged = existing ? hasContentChanged(content, existing.content, summary, existing.summary) : true

    // 2. 检查次数限制和内容修改
    if (existing) {
      // 当天有记录时：覆盖、合并、新建都需要检查内容是否有修改
      if (!contentChanged) {
        toast.info('内容没有修改，无需保存')
        return
      }
      // 检查次数限制
      if (mode === 'new' && sameDateRecords.length >= DAILY_LIMIT) {
        toast.error(`当天新建次数已达上限（${DAILY_LIMIT}次），请明天再试或使用覆盖/合并模式`)
        return
      }
      if (mode === 'merge' && sameDateRecords.length >= DAILY_LIMIT) {
        toast.error(`当天提交次数已达上限（${DAILY_LIMIT}次），请明天再试`)
        return
      }
    } else {
      // 当天无记录时：新建不需要检查内容修改
      if (mode === 'new' && sameDateRecords.length >= DAILY_LIMIT) {
        toast.error(`当天新建次数已达上限（${DAILY_LIMIT}次），请明天再试`)
        return
      }
    }

    let updated: Review
    let actionType: '覆盖' | '新建' | '合并'

    if (existing && mode === 'merge') {
      // 合并模式：合并到最新记录
      const mergedContent = { ...existing.content }
      for (const key of Object.keys(content) as (keyof ReviewContent)[]) {
        const newVal = content[key]?.trim()
        const existingVal = existing.content[key]?.trim()
        if (newVal) {
          if (existingVal && !existingVal.includes(newVal)) {
            mergedContent[key] = `${existingVal}\n${newVal}`
          } else if (!existingVal) {
            mergedContent[key] = newVal
          }
        }
      }
      const mergedSummary = summary ? (existing.summary ? `${existing.summary} ${summary}` : summary) : existing.summary
      updated = { ...existing, content: mergedContent, summary: mergedSummary || summaryVal, updatedAt: now, _source: 'local' }
      set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
      actionType = '合并'
    } else if (existing && mode !== 'new') {
      // 覆盖模式
      updated = { ...existing, content, summary: summaryVal, updatedAt: now, _source: 'local' }
      set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
      actionType = '覆盖'
    } else {
      // 新建模式
      updated = {
        id: generateId(),
        date: date || today,
        content,
        summary: summaryVal,
        createdAt: now,
        updatedAt: now,
        _source: 'local',
      }
      set({ reviews: [updated, ...get().reviews] })
      actionType = '新建'
    }
    // 保存到本地
    saveToLocalStorage(get().reviews)
    toast.success(`记录${actionType}成功`)

    // 2. 已登录 → 异步写云端
    if (isAuthenticated) {
      try {
        const result = await saveReview({
          id: updated.id,
          date: updated.date,
          content,
          summary: summaryVal,
        }, mode)

        // 更新云端返回的 ID
        if (result.data && result.data.id && result.data.id !== updated.id) {
          set({
            reviews: get().reviews.map(r =>
              r.id === updated.id ? { ...r, id: result.data.id, _source: 'cloud' as const } : r
            ),
          })
        } else {
          set({
            reviews: get().reviews.map(r =>
              r.id === updated.id ? { ...r, _source: 'cloud' as const } : r
            ),
          })
        }
        saveToLocalStorage(get().reviews)
        toast.success('数据已同步到云端')
      } catch (err) {
        console.warn('云端保存失败，数据已本地缓存:', err)
        toast.info('数据已保存，将在下次登录时同步')
      }
    } else {
      toast.info('数据已本地保存，登录后将自动同步')
    }
  },

  deleteRecord: async (id: string) => {
    const { isAuthenticated } = useAuthStore.getState()

    // 乐观删除
    set({ reviews: get().reviews.filter(r => r.id !== id) })
    saveToLocalStorage(get().reviews)

    if (isAuthenticated) {
      try {
        await deleteReview(id)
      } catch (err) {
        console.warn('云端删除失败:', err)
      }
    }
  },

  updateRecord: async (id: string, content: ReviewContent, summary: string) => {
    const { isAuthenticated } = useAuthStore.getState()
    const toast = useToastStore.getState()
    const now = new Date().toISOString()

    const existing = get().reviews.find(r => r.id === id)
    if (!existing) {
      toast.error('记录不存在')
      return
    }

    // 检查内容是否有修改
    const contentChanged = hasContentChanged(content, existing.content, summary, existing.summary)
    if (!contentChanged) {
      toast.info('内容没有修改，无需保存')
      return
    }

    // 乐观更新
    const updated: Review = {
      ...existing,
      content,
      summary: summary || existing.summary,
      updatedAt: now,
      _source: 'local',
    }
    set({ reviews: get().reviews.map(r => r.id === id ? updated : r) })
    saveToLocalStorage(get().reviews)
    toast.success('记录更新成功')

    // 同步到云端
    if (isAuthenticated) {
      try {
        await saveReview({
          id: updated.id,
          date: updated.date,
          content,
          summary: summary || existing.summary,
        })
        set({ reviews: get().reviews.map(r => r.id === id ? { ...r, _source: 'cloud' as const } : r) })
        saveToLocalStorage(get().reviews)
        toast.success('数据已同步到云端')
      } catch (err) {
        console.warn('云端更新失败:', err)
        toast.info('数据已保存，将在下次登录时同步')
      }
    }
  },

  loadFromCloud: async () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) return

    set({ isLoading: true })
    try {
      const result = await getReviews({ pageSize: 100 })
      if (result.success && result.data) {
        const cloudReviews = result.data.map(fromApiResponse)
        const localReviews = get().reviews
        const merged = mergeReviews(localReviews, cloudReviews)
        set({ reviews: merged, isLoading: false })
        saveToLocalStorage(merged)
      } else {
        set({ isLoading: false })
      }
    } catch (err) {
      console.warn('云端数据拉取失败，使用本地缓存:', err)
      set({ isLoading: false })
    }
  },

  syncLocalToCloud: async () => {
    const { isAuthenticated } = useAuthStore.getState()
    const toast = useToastStore.getState()
    if (!isAuthenticated) return

    const localOnly = get().reviews.filter(r => r._source === 'local')
    if (localOnly.length === 0) {
      console.log('[syncLocalToCloud] 无本地未同步数据')
      return
    }

    console.log('[syncLocalToCloud] 开始同步', localOnly.length, '条本地数据到云端...')
    let successCount = 0
    let failCount = 0

    for (const rec of localOnly) {
      try {
        const today = getToday()
        const result = await saveReview({
          date: rec.date || today,
          content: rec.content,
          summary: rec.summary || rec.date || today,
        }, 'new')

        if (result.success && result.data) {
          const cloudId = result.data.id
          if (cloudId) {
            set({
              reviews: get().reviews.map(r =>
                r.id === rec.id ? { ...r, id: cloudId, _source: 'cloud' as const } : r
              ),
            })
            saveToLocalStorage(get().reviews)
          }
        }
        console.log('[syncLocalToCloud] 同步成功:', rec.id, '→', result.data?.id || rec.id)
        successCount++
      } catch (err) {
        console.warn('[syncLocalToCloud] 同步失败:', rec.id, err)
        failCount++
      }
    }

    // 同步完成后重新从云端拉取（确保数据一致）
    await get().loadFromCloud()
    console.log('[syncLocalToCloud] 同步完成')

    if (successCount > 0) {
      toast.success(`${successCount} 条记录同步成功`)
    }
    if (failCount > 0) {
      toast.error(`${failCount} 条记录同步失败，请稍后重试`)
    }
  },

  loadFromLocalStorage: () => {
    const data = loadFromLocalStorage()
    if (data) {
      const migrated = migrateLegacyData(data)
      set({ reviews: migrated })
    }
  },

  clearSyncedReviews: () => {
    const localOnly = get().reviews.filter(r => r._source === 'local')
    set({ reviews: localOnly })
    saveToLocalStorage(localOnly)
    console.log('[clearSyncedReviews] 已清除已同步数据，保留', localOnly.length, '条本地数据')
  },

  getLocalOnlyReviews: () => {
    return get().reviews.filter(r => r._source === 'local')
  },
}))
