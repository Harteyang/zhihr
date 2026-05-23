import { useAuthStore } from '@/stores/auth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthModal() {
  const isOpen = useAuthStore(s => s.isAuthModalOpen)
  const tab = useAuthStore(s => s.authModalTab)
  const closeAuthModal = useAuthStore(s => s.closeAuthModal)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAuthModal() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            知HR · 复盘系统
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => openAuthModal(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
