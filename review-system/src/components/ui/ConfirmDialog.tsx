import { useState } from 'react'
import { X } from 'lucide-react'
import type { ReviewMode } from '@/types/review'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: (mode: ReviewMode) => void
  onCancel: () => void
  showModeOptions?: boolean
  defaultMode?: ReviewMode
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  showModeOptions = false,
  defaultMode = 'overwrite',
}: ConfirmDialogProps) {
  const [selectedMode, setSelectedMode] = useState<ReviewMode>(defaultMode)

  if (!isOpen) return null

  const modeOptions: { value: ReviewMode; label: string; color: string; bg: string }[] = [
    { value: 'overwrite', label: '覆盖', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-600 hover:bg-amber-700' },
    { value: 'new', label: '新建', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-600 hover:bg-green-700' },
    { value: 'merge', label: '合并', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-600 hover:bg-blue-700' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
          {showModeOptions && (
            <div className="mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">选择保存方式：</p>
              <div className="flex gap-2">
                {modeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedMode(option.value)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                      selectedMode === option.value
                        ? option.bg + ' text-white'
                        : 'bg-white dark:bg-slate-700 ' + option.color + ' hover:bg-slate-100 dark:hover:bg-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-700/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors cursor-pointer border border-slate-200 dark:border-slate-500"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onConfirm(selectedMode)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
