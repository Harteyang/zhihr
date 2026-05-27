import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { openAuthModal } from '@/lib/shared-auth-bridge'
import { X, LogIn } from 'lucide-react'

export function LoginPrompt() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setVisible(false)
      return
    }

    const handler = () => {
      const lastTime = localStorage.getItem('reviewLoginPromptTime')
      const now = Date.now()
      if (lastTime && now - parseInt(lastTime) < 30 * 60 * 1000) return
      setVisible(true)
      localStorage.setItem('reviewLoginPromptTime', now.toString())
    }

    window.addEventListener('review:need-login', handler)
    return () => window.removeEventListener('review:need-login', handler)
  }, [isAuthenticated])

  if (!visible) return null

  return (
    <div className="fixed top-5 right-5 z-[200] max-w-sm bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg shadow-lg p-4 transition-opacity">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">数据已本地保存</p>
      <p className="text-slate-600 dark:text-slate-400 text-xs mb-3">
        登录后可将数据同步到云端，在多设备间访问。不登录数据仅保存在本地。
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => { setVisible(false); openAuthModal('login') }}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 cursor-pointer"
        >
          <LogIn className="w-3 h-3" />
          登录同步
        </button>
        <button
          onClick={() => setVisible(false)}
          className="px-3 py-1.5 text-xs text-slate-500 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          继续离线使用
        </button>
      </div>
    </div>
  )
}
