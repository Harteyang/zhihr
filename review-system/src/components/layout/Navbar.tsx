import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { logout } from '@/stores/auth'
import { Moon, Sun, LogOut, User, LogIn } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { isAuthenticated, username, openModal } = useAuthStore()
  const { theme, toggleTheme } = useSettingsStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    logout()
    setShowLogoutConfirm(false)
    setShowUserMenu(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100">复盘系统</span>
          <span className="text-xs text-slate-400">知HR</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{username}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              登录
            </button>
          )}
        </div>
      </div>

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <LogOut className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">退出登录</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">确定要退出登录吗？</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  退出
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
