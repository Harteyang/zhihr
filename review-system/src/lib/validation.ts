export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码至少8位'
  if (password.length > 128) return '密码不能超过128位'
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母'
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母'
  if (!/[0-9]/.test(password)) return '密码必须包含数字'
  return null
}

export function validateUsername(username: string): string | null {
  if (!username || username.length < 2) return '用户名至少2位'
  if (username.length > 50) return '用户名不能超过50位'
  return null
}
