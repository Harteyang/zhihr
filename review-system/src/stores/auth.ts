import { create } from 'zustand'
import type { AuthState } from '@/types/auth'
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

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  username: null,
  token: null,
  isAuthenticated: false,
  isModalOpen: false,
  modalTab: 'login',

  setAuth: (user) => {
    set({
      userId: user.userId,
      username: user.username,
      token: user.token,
      isAuthenticated: true,
    })
  },

  clearAuth: () => {
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
      useAuthStore.getState().setAuth({
        userId: user.userId,
        username: user.username,
        token,
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
        useAuthStore.getState().setAuth({
          userId: user.userId,
          username: user.username,
          token,
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
