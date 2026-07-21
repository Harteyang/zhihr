import { create } from 'zustand'
import type { ToastMessage, ToastType } from '@/components/ui/Toast'

interface ToastState {
  messages: ToastMessage[]
  add: (type: ToastType, message: string) => void
  remove: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  messages: [],

  add: (type, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set({ messages: [...get().messages, { id, type, message }] })
  },

  remove: (id) => {
    set({ messages: get().messages.filter(m => m.id !== id) })
  },

  success: (message) => get().add('success', message),
  error: (message) => get().add('error', message),
  info: (message) => get().add('info', message),
}))
