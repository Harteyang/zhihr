import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { TabBar } from '@/components/layout/TabBar'
import { AuthModal } from '@/components/auth/AuthModal'
import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { DimensionGrid } from '@/components/review/DimensionGrid'
import { SummarySection } from '@/components/review/SummarySection'
import { ActionBar } from '@/components/review/ActionBar'
import { HistoryTab } from '@/components/history/HistoryTab'
import { ReportTab } from '@/components/report/ReportTab'
import { useAuthStore } from '@/stores/auth'
import { useReviewsStore } from '@/stores/reviews'
import { useSettingsStore } from '@/stores/settings'
import { useReview } from '@/hooks/useReview'
import { Toaster, toast } from 'sonner'

function RecordTab() {
  const { content, setContent, summary, setSummary, save, reset } = useReview()
  const [saving, setSaving] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const handleSave = async () => {
    setSaving(true)
    try {
      await save()
      toast.success('保存成功')
      if (!isAuthenticated) {
        setShowLoginPrompt(true)
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    reset()
    toast.info('已重置')
  }

  return (
    <div>
      <DimensionGrid content={content} onContentChange={setContent} />
      <SummarySection value={summary} onChange={setSummary} />
      <ActionBar onSave={handleSave} onReset={handleReset} saving={saving} />
      <LoginPrompt open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('record')
  const loadFromStorage = useAuthStore(s => s.loadFromStorage)
  const loadReviewsFromStorage = useReviewsStore(s => s.loadFromLocalStorage)
  const loadSettingsFromStorage = useSettingsStore(s => s.loadFromStorage)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const loadFromCloud = useReviewsStore(s => s.loadFromCloud)
  const loadConfigFromCloud = useSettingsStore(s => s.loadFromCloud)

  useEffect(() => {
    loadFromStorage()
    loadReviewsFromStorage()
    loadSettingsFromStorage()

    if (isAuthenticated) {
      loadFromCloud()
      loadConfigFromCloud()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'record' && <RecordTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'report' && <ReportTab />}
      </main>
      <AuthModal />
      <Toaster />
    </div>
  )
}
