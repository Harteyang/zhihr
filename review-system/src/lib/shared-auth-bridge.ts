import type { SharedAuthAPI, AuthModalAPI } from '@/types/auth'

declare global {
  var SharedAuth: SharedAuthAPI
  var AuthModal: AuthModalAPI
}

export function getSharedAuth(): SharedAuthAPI | null {
  return typeof SharedAuth !== 'undefined' ? SharedAuth : null
}

export function getAuthModal(): AuthModalAPI | null {
  return typeof AuthModal !== 'undefined' ? AuthModal : null
}

export function isSharedAuthAvailable(): boolean {
  return typeof SharedAuth !== 'undefined' && typeof SharedAuth.init === 'function'
}

export function getSharedAuthToken(): string | null {
  const auth = getSharedAuth()
  return auth ? auth.getToken() : null
}

export function isSharedAuthLoggedIn(): boolean {
  const auth = getSharedAuth()
  return auth ? auth.isAuthenticated() : false
}

export function getSharedAuthUser(): { userId: string; username: string; isAuthenticated: boolean } | null {
  const auth = getSharedAuth()
  return auth ? auth.getUser() : null
}

export function openAuthModal(tab: 'login' | 'register' = 'login'): void {
  const modal = getAuthModal()
  if (modal) {
    modal.open(tab)
  }
}

export function closeAuthModal(): void {
  const modal = getAuthModal()
  if (modal) {
    modal.close()
  }
}

export function initSharedAuth(): void {
  const auth = getSharedAuth()
  if (auth) {
    auth.init()
  }
  const modal = getAuthModal()
  if (modal) {
    modal.init()
  }
}

export function onAuthEvent(event: string, callback: (data?: any) => void): void {
  const auth = getSharedAuth()
  if (auth) {
    auth.on(event, callback)
  }
}

export function offAuthEvent(event: string, callback: (data?: any) => void): void {
  const auth = getSharedAuth()
  if (auth) {
    auth.off(event, callback)
  }
}

export function sharedAuthLogout(): void {
  const auth = getSharedAuth()
  if (auth) {
    auth.logout()
  }
}
