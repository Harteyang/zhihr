import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { validateUsername, validatePassword } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    const usernameError = validateUsername(username)
    if (usernameError) { setError(usernameError); return }

    const passwordError = validatePassword(password)
    if (passwordError) { setError(passwordError); return }

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)
    try {
      await register(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">账号</label>
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="设置账号（至少3个字符）"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">密码</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="设置密码（至少8位，含大小写字母和数字）"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">确认密码</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="再次输入密码"
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '注册中...' : '注册'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        已有账号？
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="text-primary hover:underline ml-1"
        >
          登录
        </button>
      </p>
    </form>
  )
}
