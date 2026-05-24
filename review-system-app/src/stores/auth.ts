import { create } from 'zustand'
import * as authApi from '@/api/auth'
import { clearAuthStorage } from '@/api/client'
import { loadFromLocalStorage } from '@/lib/storage'

const KEYS = {
  TOKEN: 'zhihr_access_token',
  REFRESH_TOKEN: 'zhihr_refresh_token',
  USER_ID: 'zhihr_user_id',
  USERNAME: 'zhihr_username',
} as const

interface AuthState {
  userId: string | null
  username: string | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isAuthModalOpen: boolean
  authModalTab: 'login' | 'register'

  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => void
  openAuthModal: (tab?: 'login' | 'register') => void
  closeAuthModal: () => void
  setTokens: (token: string, refreshToken: string) => void
}

function persistAuth(data: { userId: string; username: string; token: string; refreshToken: string }) {
  localStorage.setItem(KEYS.TOKEN, data.token)
  localStorage.setItem(KEYS.REFRESH_TOKEN, data.refreshToken)
  localStorage.setItem(KEYS.USER_ID, data.userId)
  localStorage.setItem(KEYS.USERNAME, data.username)
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  authModalTab: 'login',

  login: async (username, password) => {
    const result = await authApi.login(username, password)
    const { userId, username: name, token, refreshToken } = result.data

    set({
      userId,
      username: name,
      token,
      refreshToken,
      isAuthenticated: true,
      isAuthModalOpen: false,
    })
    persistAuth({ userId, username: name, token, refreshToken })

    console.log('[Auth] Login success, syncing local data to cloud...')
    const localReviews = loadFromLocalStorage()
    console.log('[Auth] Local reviews count:', localReviews?.length ?? 0)

    if (localReviews && localReviews.length > 0) {
      try {
        const reviewsStore = await import('./reviews')
        console.log('[Auth] Calling syncLocalToCloud...')
        await reviewsStore.useReviewsStore.getState().syncLocalToCloud()
        console.log('[Auth] syncLocalToCloud completed')
      } catch (err) {
        console.error('[Auth] syncLocalToCloud failed:', err)
      }
    }

    try {
      const reviewsStore2 = await import('./reviews')
      console.log('[Auth] Calling loadFromCloud...')
      await reviewsStore2.useReviewsStore.getState().loadFromCloud()
      console.log('[Auth] loadFromCloud completed')
    } catch (err) {
      console.error('[Auth] loadFromCloud failed:', err)
    }
  },

  register: async (username, password) => {
    const result = await authApi.register(username, password)
    const { userId, username: name, token, refreshToken } = result.data

    set({
      userId,
      username: name,
      token,
      refreshToken,
      isAuthenticated: true,
      isAuthModalOpen: false,
    })
    persistAuth({ userId, username: name, token, refreshToken })

    const localReviews = loadFromLocalStorage()
    if (localReviews && localReviews.length > 0) {
      try {
        const reviewsStore = await import('./reviews')
        await reviewsStore.useReviewsStore.getState().syncLocalToCloud()
      } catch (err) {
        console.error('[Auth] syncLocalToCloud failed:', err)
      }
    }

    try {
      const reviewsStore2 = await import('./reviews')
      await reviewsStore2.useReviewsStore.getState().loadFromCloud()
    } catch (err) {
      console.error('[Auth] loadFromCloud failed:', err)
    }
  },

  logout: () => {
    set({
      userId: null,
      username: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    clearAuthStorage()
  },

  loadFromStorage: () => {
    const token = localStorage.getItem(KEYS.TOKEN)
    const refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN)
    const userId = localStorage.getItem(KEYS.USER_ID)
    const username = localStorage.getItem(KEYS.USERNAME)

    if (token && userId && username) {
      set({ userId, username, token, refreshToken, isAuthenticated: true })
    }
  },

  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  setTokens: (token, refreshToken) => {
    set({ token, refreshToken })
    localStorage.setItem(KEYS.TOKEN, token)
    localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken)
  },
}))
