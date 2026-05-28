import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastProps {
  message: ToastMessage
  onClose: (id: string) => void
}

function Toast({ message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(message.id), 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [message.id, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700/50',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700/50',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${bgColors[message.type]} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {icons[message.type]}
      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{message.message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onClose(message.id), 300)
        }}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  messages: ToastMessage[]
  onClose: (id: string) => void
}

export function ToastContainer({ messages, onClose }: ToastContainerProps) {
  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[500] space-y-2 max-w-sm">
      {messages.map(msg => (
        <Toast key={msg.id} message={msg} onClose={onClose} />
      ))}
    </div>
  )
}
