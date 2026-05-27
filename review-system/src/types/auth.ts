export interface AuthUser {
  userId: string
  username: string
  token: string
  refreshToken?: string
}

export interface AuthState {
  userId: string | null
  username: string | null
  token: string | null
  isAuthenticated: boolean
  isModalOpen: boolean
  modalTab: 'login' | 'register'

  setAuth: (user: AuthUser) => void
  clearAuth: () => void
  openModal: (tab?: 'login' | 'register') => void
  closeModal: () => void
}

// 真实的 SharedAuth API（与 shared-auth.js 一致）
export interface SharedAuthAPI {
  init: () => any
  on: (event: string, callback: (data?: any) => void) => void
  off: (event: string, callback: (data?: any) => void) => void
  login: (username: string, password: string) => Promise<any>
  register: (username: string, password: string) => Promise<any>
  logout: () => void
  getToken: () => string | null
  isAuthenticated: () => boolean
  getUser: () => { userId: string; username: string; isAuthenticated: boolean }
  refreshToken: () => Promise<any>
}

// 真实的 AuthModal API（与 shared-auth-modal.js 一致）
export interface AuthModalAPI {
  init: () => void
  open: (mode?: string) => void
  close: () => void
  toggleMode: () => void
  refreshCaptcha: () => void
  handleLogin: () => void
  handleRegister: () => void
  getConfig: () => any
}
