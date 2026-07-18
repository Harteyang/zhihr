import api from './index.js'

export const login = (username, password) => api.post('/auth/login', { username, password })
export const register = (username, password) => api.post('/auth/register', { username, password })
export const getMe = () => api.get('/auth/me')