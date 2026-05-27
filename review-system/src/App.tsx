import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useReviewsStore } from '@/stores/reviews'
import { Navbar } from '@/components/layout/Navbar'
import { TabBar } from '@/components/layout/TabBar'
import { RecordTab } from '@/components/review/RecordTab'
import { HistoryTab } from '@/components/history/HistoryTab'
import { ReportTab } from '@/components/report/ReportTab'
import { LoginPrompt } from '@/components/auth/LoginPrompt'

export default function App() {
  const activeTab = useSettingsStore(s => s.activeTab)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const loadFromCloud = useReviewsStore(s => s.loadFromCloud)
  const syncLocalToCloud = useReviewsStore(s => s.syncLocalToCloud)

  // 登录后自动同步
  useEffect(() => {
    if (isAuthenticated) {
      loadFromCloud().then(() => {
        syncLocalToCloud()
      })
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
    </div>
  )
}
