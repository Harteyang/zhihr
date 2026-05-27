import { useSettingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { FileText, History, BarChart3 } from 'lucide-react'

const tabs = [
  { key: 'record' as const, label: '记录', icon: FileText },
  { key: 'history' as const, label: '历史', icon: History },
  { key: 'report' as const, label: '报告', icon: BarChart3 },
]

export function TabBar() {
  const { activeTab, setActiveTab } = useSettingsStore()

  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
            activeTab === key
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
