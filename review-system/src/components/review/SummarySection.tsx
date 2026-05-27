import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

interface SummarySectionProps {
  value: string
  onChange: (value: string) => void
  collapsed: boolean
  onToggle?: () => void
}

export function SummarySection({ value, onChange, collapsed, onToggle }: SummarySectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-100">今日总结</span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="总结今天的表现和感悟..."
          className="w-full mt-3 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
        />
      )}
    </div>
  )
}
