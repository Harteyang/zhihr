import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    const data = res.data.data
    token.value = data.token
    refreshToken.value = data.refreshToken
    user.value = {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      role: data.role
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function register(username, password) {
    const res = await api.post('/auth/register', { username, password })
    const data = res.data.data
    token.value = data.token
    refreshToken.value = data.refreshToken
    user.value = {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName || data.username,
      role: data.role
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function fetchCurrentUser() {
    try {
      const res = await api.get('/auth/me')
      user.value = res.data.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (e) {
      // 仅在 401（未授权）时登出，其他错误（如网络问题）保留登录状态
      if (e.response?.status === 401) {
        logout()
      }
    }
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  return { token, refreshToken, user, isLoggedIn, isAdmin, login, register, fetchCurrentUser, logout }
})
