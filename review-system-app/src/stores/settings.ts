import { create } from 'zustand'
import * as configApi from '@/api/config'
import { useAuthStore } from './auth'

type Theme = 'light' | 'dark' | 'auto'

interface UserConfig {
  theme: Theme
  reminderEnabled: boolean
  reminderTime: string
  dimensionConfigs?: Record<string, unknown>
}

interface SettingsState {
  theme: Theme
  reminderEnabled: boolean
  reminderTime: string

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setReminder: (enabled: boolean, time: string) => void
  loadFromCloud: () => Promise<void>
  loadFromStorage: () => void
}

const CONFIG_KEY = 'zhihr_user_config'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

function persistConfig(config: UserConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function loadConfigFromStorage(): Partial<UserConfig> | null {
  try {
    const data = localStorage.getItem(CONFIG_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'auto',
  reminderEnabled: false,
  reminderTime: '21:00',

  setTheme: (theme) => {
    set({ theme })
    applyTheme(theme)
    const config = { theme, reminderEnabled: get().reminderEnabled, reminderTime: get().reminderTime }
    persistConfig(config)

    if (useAuthStore.getState().isAuthenticated) {
      configApi.updateConfig(config).catch(() => {})
    }
  },

  toggleTheme: () => {
    const current = get().theme
    let next: Theme
    if (current === 'light') next = 'dark'
    else if (current === 'dark') next = 'light'
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      next = prefersDark ? 'light' : 'dark'
    }
    get().setTheme(next)
  },

  setReminder: (enabled, time) => {
    set({ reminderEnabled: enabled, reminderTime: time || get().reminderTime })
    const config = { theme: get().theme, reminderEnabled: enabled, reminderTime: time || get().reminderTime }
    persistConfig(config)

    if (useAuthStore.getState().isAuthenticated) {
      configApi.updateConfig(config).catch(() => {})
    }
  },

  loadFromCloud: async () => {
    if (!useAuthStore.getState().isAuthenticated) return
    try {
      const result = await configApi.getConfig()
      if (result.data?.config) {
        const config = typeof result.data.config === 'string'
          ? JSON.parse(result.data.config)
          : result.data.config
        if (config.theme) {
          set({ theme: config.theme, reminderEnabled: config.reminderEnabled ?? false, reminderTime: config.reminderTime ?? '21:00' })
          applyTheme(config.theme)
          persistConfig(config)
        }
      }
    } catch {
      // 云端配置加载失败，使用本地
    }
  },

  loadFromStorage: () => {
    const config = loadConfigFromStorage()
    if (config) {
      set({
        theme: config.theme || 'auto',
        reminderEnabled: config.reminderEnabled ?? false,
        reminderTime: config.reminderTime ?? '21:00',
      })
      applyTheme(config.theme || 'auto')
    }
  },
}))
