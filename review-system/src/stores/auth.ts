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
    // 同步到 localStorage
    localStorage.setItem('zhihr_access_token', user.token)
    if (user.refreshToken) {
      localStorage.setItem('zhihr_refresh_token', user.refreshToken)
    }
    localStorage.setItem('zhihr_user_id', user.userId)
    localStorage.setItem('zhihr_username', user.username)
  },

  clearAuth: () => {
    set({
      userId: null,
      username: null,
      token: null,
      isAuthenticated: false,
    })
    localStorage.removeItem('zhihr_access_token')
    localStorage.removeItem('zhihr_refresh_token')
    localStorage.removeItem('zhihr_user_id')
    localStorage.removeItem('zhihr_username')
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
}

export function logout() {
  sharedAuthLogout()
  useAuthStore.getState().clearAuth()
}
