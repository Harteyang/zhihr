import { Save, RotateCcw, Loader2 } from 'lucide-react'

interface ActionBarProps {
  onSave: () => void
  onReset: () => void
  isSaving: boolean
}

export function ActionBar({ onSave, onReset, isSaving }: ActionBarProps) {
  return (
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
        onClick={onReset}
        className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  )
}
