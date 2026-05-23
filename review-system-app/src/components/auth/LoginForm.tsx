import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { validateUsername } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('请输入账号和密码')
      return
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      return
    }

    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
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
          placeholder="输入账号"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">密码</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="输入密码"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        没有账号？
        <button
          type="button"
          onClick={() => openAuthModal('register')}
          className="text-primary hover:underline ml-1"
        >
          注册新账号
        </button>
      </p>
    </form>
  )
}
