import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Sun, Moon, RefreshCw, LogIn } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const openAuthModal = useAuthStore(s => s.openAuthModal)
  const toggleTheme = useSettingsStore(s => s.toggleTheme)
  const [lastSync, setLastSync] = useState('--')

  const handleSync = async () => {
    const { useReviewsStore } = await import('@/stores/reviews')
    await useReviewsStore.getState().loadFromCloud()
    setLastSync(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <nav className="h-16 bg-card border-b border-border px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => window.open('https://www.zhihr.vip', '_blank')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <circle cx="12" cy="5" r="1" />
          <path d="m9 20 3-6 3 6" />
          <path d="m6 8 6 2 6-2" />
          <path d="M12 10v4" />
        </svg>
        <div>
          <h1 className="text-lg font-semibold text-foreground">知HR-复盘系统</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Vibe Coding，为HR制作效率工具</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isAuthenticated && (
          <Button variant="outline" size="sm" onClick={() => openAuthModal('login')} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">登录</span>
          </Button>
        )}
        {isAuthenticated && <UserMenu />}
        <Button variant="ghost" size="icon" onClick={handleSync} title="云端同步">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <span className="text-xs text-muted-foreground hidden sm:block">上次同步: {lastSync}</span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
          <Sun className="h-5 w-5 hidden dark:block" />
          <Moon className="h-5 w-5 block dark:hidden" />
        </Button>
      </div>
    </nav>
  )
}
