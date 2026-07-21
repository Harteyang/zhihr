import { create } from 'zustand'
import type { AuthState, AuthUser } from '@/types/auth'
import {
  initSharedAuth,
  onAuthEvent,
  offAuthEvent,
  getSharedAuthToken,
  isSharedAuthLoggedIn,
  getSharedAuthUser,
  openAuthModal,
  closeAuthModal,
  sharedAuthLogout,
} from '@/lib/shared-auth-bridge'
import { useReviewsStore } from './reviews'

// 内存中的 refreshToken（不在 Zustand store 中持久化）
// 同时使用 sessionStorage 备份，以支持页面刷新
const REFRESH_TOKEN_KEY = 'zhihr_refresh_token'
let _refreshToken: string | null = null

export function getRefreshToken() {
  return _refreshToken
}

export function setRefreshToken(token: string | null) {
  _refreshToken = token
  if (token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  token: null,
  isAuthenticated: false,
  isModalOpen: false,
  modalTab: 'login',

  setAuth: (user: AuthUser) => {
    if (user.refreshToken) {
      setRefreshToken(user.refreshToken)
    }
    set({
      userId: user.userId,
      username: user.username,
      token: user.token,
      isAuthenticated: true,
    })
  },

  clearAuth: () => {
    setRefreshToken(null)
    set({
      userId: null,
      username: null,
      token: null,
      isAuthenticated: false,
    })
  },

  openModal: (tab = 'login') => {
    set({ isModalOpen: true, modalTab: tab })
    openAuthModal(tab)
  },

  closeModal: () => {
    set({ isModalOpen: false })
    closeAuthModal()
  },
}))

// 初始化：从 SharedAuth 同步状态
export function initAuthFromSharedAuth() {
  initSharedAuth()

  // 从 SharedAuth 读取当前状态
  if (isSharedAuthLoggedIn()) {
    const token = getSharedAuthToken()
    const user = getSharedAuthUser()
    if (token && user) {
      // 从 sessionStorage 恢复 refreshToken
      const savedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
      useAuthStore.getState().setAuth({
        userId: user.userId,
        username: user.username,
        token,
        refreshToken: savedRefreshToken || undefined,
      })
    }
  }

  // 监听 SharedAuth 事件
  onAuthEvent('auth:login', (data: any) => {
    if (data) {
      useAuthStore.getState().setAuth({
        userId: data.userId,
        username: data.username,
        token: data.token || getSharedAuthToken() || '',
        refreshToken: data.refreshToken || undefined,
      })
    }
  })

  onAuthEvent('auth:logout', () => {
    useAuthStore.getState().clearAuth()
  })

  // 监听 auth:change（跨标签页同步时由 storage 事件触发）
  onAuthEvent('auth:change', (state) => {
    if (state.isAuthenticated) {
      const token = getSharedAuthToken()
      const user = getSharedAuthUser()
      if (token && user) {
        const savedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
        useAuthStore.getState().setAuth({
          userId: user.userId,
          username: user.username,
          token,
          refreshToken: savedRefreshToken || undefined,
        })
      }
    } else {
      useAuthStore.getState().clearAuth()
    }
  })
}

export function logout() {
  const { clearSyncedReviews } = useReviewsStore.getState()
  clearSyncedReviews()
  sharedAuthLogout()
  useAuthStore.getState().clearAuth()
}