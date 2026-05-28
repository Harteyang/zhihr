import { Save, RotateCcw, Loader2, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ActionBarProps {
  onSave: () => void
  onReset: () => void
  isSaving: boolean
}

export function ActionBar({ onSave, onReset, isSaving }: ActionBarProps) {
  const [showResetToast, setShowResetToast] = useState(false)

  const handleReset = () => {
    onReset()
    setShowResetToast(true)
  }

  useEffect(() => {
    if (showResetToast) {
      const timer = setTimeout(() => {
        setShowResetToast(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showResetToast])

  return (
    <div className="relative">
      {showResetToast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg shadow-lg animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">已重置</span>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
