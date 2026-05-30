import { create } from 'zustand'

interface SettingsState {
  theme: 'light' | 'dark'
  activeTab: 'record' | 'history' | 'report'

  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setActiveTab: (tab: 'record' | 'history' | 'report') => void
}

function updateThemeColor(theme: 'light' | 'dark') {
  const meta = document.getElementById('theme-color')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#1e293b' : '#ffffff')
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  activeTab: 'record',

  setTheme: (theme) => {
    set({ theme })
    localStorage.setItem('theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    updateThemeColor(theme)
  },

  toggleTheme: () => {
    const current = get().theme
    get().setTheme(current === 'dark' ? 'light' : 'dark')
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },
}))

// 初始化主题
export function initTheme() {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = saved || (prefersDark ? 'dark' : 'light')
  useSettingsStore.getState().setTheme(theme)

  // 监听系统主题变化（仅在用户没有手动设置过主题时自动切换）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const savedTheme = localStorage.getItem('theme')
    if (!savedTheme) {
      useSettingsStore.getState().setTheme(e.matches ? 'dark' : 'light')
    }
  })
}
