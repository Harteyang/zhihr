export interface AuthUser {
  userId: string
  username: string
  token: string
  refreshToken: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: AuthUser
}
