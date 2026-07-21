import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useReviewsStore } from '@/stores/reviews'
import { useToastStore } from '@/stores/toast'
import { Navbar } from '@/components/layout/Navbar'
import { TabBar } from '@/components/layout/TabBar'
import { RecordTab } from '@/components/review/RecordTab'
import { HistoryTab } from '@/components/history/HistoryTab'
import { ReportTab } from '@/components/report/ReportTab'
import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { ToastContainer } from '@/components/ui/Toast'

export default function App() {
  const activeTab = useSettingsStore(s => s.activeTab)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const loadFromCloud = useReviewsStore(s => s.loadFromCloud)
  const syncLocalToCloud = useReviewsStore(s => s.syncLocalToCloud)
  const toastMessages = useToastStore(s => s.messages)
  const removeToast = useToastStore(s => s.remove)

  // 登录后自动同步：先同步本地数据到云端，再拉取云端数据合并
  const syncingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !syncingRef.current) {
      syncingRef.current = true
      syncLocalToCloud()
        .then(() => {
          if (mountedRef.current) loadFromCloud()
        })
        .catch(console.error)
        .finally(() => { if (mountedRef.current) syncingRef.current = false })
    }
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <TabBar />
        <div className="mt-6">
          {activeTab === 'record' && <RecordTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'report' && <ReportTab />}
        </div>
      </main>
      <LoginPrompt />
      <ToastContainer messages={toastMessages} onClose={removeToast} />
    </div>
  )
}
