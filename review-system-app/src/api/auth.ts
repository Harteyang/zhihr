import { apiRequest } from './client'
import type { AuthResponse } from '@/types/auth'

export async function login(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}

export async function getMe(): Promise<{ success: boolean; data: { userId: string; username: string } }> {
  return apiRequest('/api/auth/me')
}
