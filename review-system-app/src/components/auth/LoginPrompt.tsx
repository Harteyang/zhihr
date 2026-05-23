import { useAuthStore } from '@/stores/auth'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface LoginPromptProps {
  open: boolean
  onClose: () => void
}

export function LoginPrompt({ open, onClose }: LoginPromptProps) {
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleLogin = () => {
    onClose()
    openAuthModal('login')
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>数据已本地保存</AlertDialogTitle>
          <AlertDialogDescription>
            登录后可将数据同步到云端，在多设备间访问。不登录数据仅保存在本地。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>继续离线使用</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogin}>登录同步</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
