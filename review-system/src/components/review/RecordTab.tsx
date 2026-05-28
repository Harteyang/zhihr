import { useState, useEffect, useCallback } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { useAuthStore } from '@/stores/auth'
import { saveAutosave, loadAutosave, clearAutosave } from '@/lib/storage'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'
import type { ReviewContent, ReviewMode } from '@/types/review'
import { getEmptyDimensionData, formatDimensionValue } from '@/types/review'
import { getToday } from '@/lib/utils'
import { DimensionCard } from './DimensionCard'
import { SummarySection } from './SummarySection'
import { ActionBar } from './ActionBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const emptyContent: ReviewContent = Object.fromEntries(
  DEFAULT_DIMENSIONS.map(dim => [dim.key, formatDimensionValue(getEmptyDimensionData())])
) as unknown as ReviewContent

export function RecordTab() {
  const allReviews = useReviewsStore(s => s.reviews)
  const saveRecord = useReviewsStore(s => s.saveRecord)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const todayRecord = isAuthenticated
    ? allReviews.find(r => r.date === getToday())
    : allReviews.filter(r => r._source === 'local').find(r => r.date === getToday())

  const [content, setContent] = useState<ReviewContent>(emptyContent)
  const [summary, setSummary] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  // 默认桌面端展开，移动端折叠
  const getInitialCollapsed = (): Record<string, boolean> => {
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobileDevice) {
      return {
        health: true,
        work: true,
        study: true,
        social: true,
        finance: true,
        life: true,
        spirit: true,
        leisure: true,
        summary: true,
      }
    }
    return {}
  }
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed())
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // 加载今日记录 - 只在今日记录的 ID 变化时触发，避免不必要的内容填充
  useEffect(() => {
    if (todayRecord) {
      setContent(todayRecord.content)
      setSummary(todayRecord.summary)
    }
  }, [todayRecord?.id])

  // 自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAutosave({ date: getToday(), content, summary })
    }, 1500)
    return () => clearTimeout(timer)
  }, [content, summary])

  // 加载自动保存
  useEffect(() => {
    if (!todayRecord) {
      const autosaved = loadAutosave()
      if (autosaved && autosaved.date === getToday()) {
        const hasContent = Object.values(autosaved.content || {}).some(v => v)
        if (hasContent || autosaved.summary) {
          setContent(autosaved.content)
          setSummary(autosaved.summary)
        }
      }
    }
  }, [])

  // 响应式
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const updateField = useCallback((key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleSave = () => {
    setShowConfirm(true)
  }

  const confirmSave = async (selectedMode: ReviewMode) => {
    setShowConfirm(false)
    setIsSaving(true)
    try {
      await saveRecord(getToday(), content, summary, selectedMode)
      // 保存成功后重置数据
      setContent(emptyContent)
      setSummary('')
      clearAutosave()
    } catch (err) {
      // 保存失败，保持数据不变，保留自动保存
      console.warn('保存失败，保留数据:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setContent(emptyContent)
    setSummary('')
    clearAutosave()
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {DEFAULT_DIMENSIONS.map(dim => (
          <DimensionCard
            key={dim.key}
            config={dim}
            value={content[dim.key as keyof ReviewContent]}
            onChange={(v) => updateField(dim.key, v)}
            collapsed={!!collapsed[dim.key]}
            onToggle={isMobile ? () => toggleCollapse(dim.key) : undefined}
          />
        ))}
      </div>

      <SummarySection
        value={summary}
        onChange={setSummary}
        collapsed={!!collapsed.summary}
        onToggle={isMobile ? () => toggleCollapse('summary') : undefined}
      />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        title="确认保存"
        message={todayRecord ? '今日已有记录，请选择保存方式：' : '确认要保存今日记录吗？'}
        confirmText="确认保存"
        cancelText="取消"
        onConfirm={confirmSave}
        onCancel={() => setShowConfirm(false)}
        showModeOptions={!!todayRecord}
        defaultMode="overwrite"
      />
    </div>
  )
}
