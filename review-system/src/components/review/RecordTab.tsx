import { useState, useEffect, useCallback } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { useAuthStore } from '@/stores/auth'
import { saveAutosave, loadAutosave, clearAutosave } from '@/lib/storage'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'
import type { ReviewContent } from '@/types/review'
import { getToday } from '@/lib/utils'
import { DimensionCard } from './DimensionCard'
import { SummarySection } from './SummarySection'
import { ActionBar } from './ActionBar'
import { Save, RotateCcw } from 'lucide-react'

const emptyContent: ReviewContent = {
  health: '', work: '', study: '', social: '', finance: '', life: '', spirit: '', leisure: '',
}

export function RecordTab() {
  const todayRecord = useReviewsStore(s => s.reviews.find(r => r.date === getToday()))
  const saveRecord = useReviewsStore(s => s.saveRecord)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const [content, setContent] = useState<ReviewContent>(emptyContent)
  const [summary, setSummary] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 加载今日记录
  useEffect(() => {
    if (todayRecord) {
      setContent(todayRecord.content)
      setSummary(todayRecord.summary)
    }
  }, [todayRecord])

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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveRecord(getToday(), content, summary)
      clearAutosave()
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
    </div>
  )
}
