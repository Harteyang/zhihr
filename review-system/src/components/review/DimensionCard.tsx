import { useState } from 'react'
import type { DimensionConfig } from '@/lib/dimensions'
import type { ReviewContent } from '@/types/review'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface DimensionCardProps {
  config: DimensionConfig
  value: string
  onChange: (value: string) => void
  collapsed: boolean
  onToggle?: () => void
}

// 统一使用中性边框颜色，保持简洁
const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  emerald: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  blue: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  purple: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-purple-600 dark:text-purple-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
  pink: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-pink-600 dark:text-pink-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-pink-100 dark:bg-pink-900/40' },
  amber: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-amber-600 dark:text-amber-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  teal: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-teal-600 dark:text-teal-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
  indigo: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  orange: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-orange-600 dark:text-orange-400', border: 'border-slate-200 dark:border-slate-700', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
}

export function DimensionCard({ config, value, onChange, collapsed, onToggle }: DimensionCardProps) {
  const colors = colorMap[config.color] || colorMap.blue
  const IconComponent = (Icons as any)[config.icon] || Icons.FileText

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      colors.border,
      collapsed ? 'py-3 px-4' : 'p-4'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.iconBg)}>
            <IconComponent className={cn('w-4 h-4', colors.text)} />
          </div>
          <span className="font-medium text-slate-800 dark:text-slate-100">{config.name}</span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3">
          {config.type === 'structured' && config.structuredItems ? (
            <StructuredInput items={config.structuredItems} value={value} onChange={onChange} />
          ) : (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder={config.placeholder || `记录今天的${config.name.toLowerCase()}...`}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          )}
        </div>
      )}
    </div>
  )
}

function StructuredInput({ items, value, onChange }: {
  items: { label: string; placeholder: string }[]
  value: string
  onChange: (v: string) => void
}) {
  // 解析结构化数据
  let parsed: Record<string, string> = {}
  try {
    if (value) parsed = JSON.parse(value)
  } catch { /* ignore */ }

  const updateItem = (label: string, itemValue: string) => {
    parsed[label] = itemValue
    onChange(JSON.stringify(parsed))
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-12 shrink-0">{item.label}</span>
          <input
            type="text"
            value={parsed[item.label] || ''}
            onChange={(e) => updateItem(item.label, e.target.value)}
            placeholder={item.placeholder}
            className="flex-1 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ))}
    </div>
  )
}
