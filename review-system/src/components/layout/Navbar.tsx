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
    <>
      <header className="h-16 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        {/* 左侧：Logo + 工具名称 */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.open('https://www.zhihr.vip', '_blank')}
        >
          {/* Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
            <circle cx="12" cy="5" r="1"/>
            <path d="m9 20 3-6 3 6"/>
            <path d="m6 8 6 2 6-2"/>
            <path d="M12 10v4"/>
          </svg>

          {/* 工具名称 */}
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">知HR-复盘系统</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vibe Coding，为HR制作效率工具</p>
          </div>
        </div>

        {/* 右侧：功能按钮 */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-600"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-sm">{username}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <span>{username}</span>
                  </div>
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
              className="px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">登录</span>
            </button>
          )}

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors duration-200 cursor-pointer"
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
            aria-label="切换主题"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

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
    </>
  )
}