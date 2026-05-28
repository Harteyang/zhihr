import { useState, useEffect } from 'react'
import type { DimensionConfig } from '@/lib/dimensions'
import type { ReviewContent, DimensionData } from '@/types/review'
import { parseDimensionValue, formatDimensionValue } from '@/types/review'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

interface DimensionCardProps {
  config: DimensionConfig
  value: string | DimensionData
  onChange: (value: string) => void
  collapsed: boolean
  onToggle?: () => void
}

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

  const parsedValue = parseDimensionValue(value)
  const [structuredData, setStructuredData] = useState<Record<string, string>>(parsedValue.structured)
  const [freeformData, setFreeformData] = useState(parsedValue.freeform)
  const [customItems, setCustomItems] = useState<{ id: string; label: string; placeholder: string }[]>([])
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    const parsed = parseDimensionValue(value)
    if (!isComposing) {
      setStructuredData(parsed.structured)
      setFreeformData(parsed.freeform)
      setLocalValues({})
    }
  }, [value, isComposing])

  const updateStructuredItem = (itemId: string, itemValue: string) => {
    setLocalValues(prev => ({ ...prev, [itemId]: itemValue }))
    if (!isComposing) {
      const newStructured = { ...structuredData, ...localValues, [itemId]: itemValue }
      emitChange(newStructured, freeformData)
    }
  }

  const removeStructuredItem = (itemId: string) => {
    const newStructured = { ...structuredData, ...localValues }
    delete newStructured[itemId]
    delete localValues[itemId]
    emitChange(newStructured, freeformData)
  }

  const addCustomItem = (label: string) => {
    const id = `custom_${Date.now()}`
    const newItem = { id, label, placeholder: label }
    setCustomItems([...customItems, newItem])
    emitChange({ ...structuredData, ...localValues }, freeformData)
  }

  const removeCustomItem = (itemId: string) => {
    setCustomItems(customItems.filter(item => item.id !== itemId))
    const newStructured = { ...structuredData, ...localValues }
    delete newStructured[itemId]
    emitChange(newStructured, freeformData)
  }

  const updateFreeform = (val: string) => {
    if (!isComposing) {
      setFreeformData(val)
      emitChange({ ...structuredData, ...localValues }, val)
    } else {
      setFreeformData(val)
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsComposing(false)
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const value = target.value
    if (target.tagName === 'TEXTAREA') {
      emitChange({ ...structuredData, ...localValues }, value)
    } else {
      const itemId = target.getAttribute('data-item-id')
      if (itemId) {
        const newStructured = { ...structuredData, ...localValues, [itemId]: value }
        emitChange(newStructured, freeformData)
      }
    }
  }

  const emitChange = (structured: Record<string, string>, freeform: string) => {
    const newData: DimensionData = { structured, freeform }
    onChange(formatDimensionValue(newData))
  }

  const allItems = [
    ...config.structuredItems.map(item => ({ ...item, isCustom: false })),
    ...customItems.map(item => ({ ...item, isCustom: true })),
  ]

  const hasAnyContent = Object.values(structuredData).some(v => v) || freeformData

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
          {hasAnyContent && !collapsed && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-4">
          {/* 结构化项目区域 */}
          {allItems.length > 0 && (
            <div className="space-y-2">
              {allItems.map(item => (
                <div key={item.id} className="flex items-center gap-1.5 group">
                  <button
                    onClick={() => item.isCustom ? removeCustomItem(item.id) : removeStructuredItem(item.id)}
                    className="px-0.5 py-0.5 text-slate-400 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-slate-600 dark:text-slate-400 w-14 shrink-0 truncate">{item.label}</span>
                  <input
                    type="text"
                    value={localValues[item.id] !== undefined ? localValues[item.id] : (structuredData[item.id] || '')}
                    onChange={(e) => updateStructuredItem(item.id, e.target.value)}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    data-item-id={item.id}
                    placeholder={item.placeholder}
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
              {/* 添加自定义项目 */}
              <AddItemButton onAdd={addCustomItem} />
            </div>
          )}

          {/* 自由填写区域 */}
          <div>
            <textarea
              value={freeformData}
              onChange={(e) => updateFreeform(e.target.value)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              rows={3}
              placeholder={`记录今天的${config.name.toLowerCase()}...`}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AddItemButton({ onAdd }: { onAdd: (label: string) => void }) {
  const [isAdding, setIsAdding] = useState(false)
  const [label, setLabel] = useState('')

  const handleAdd = () => {
    if (label.trim()) {
      onAdd(label.trim())
      setLabel('')
      setIsAdding(false)
    }
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="项目名称"
          className="flex-1 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
            if (e.key === 'Escape') setIsAdding(false)
          }}
        />
        <button
          onClick={handleAdd}
          className="p-1.5 text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsAdding(false)}
          className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer mt-1"
    >
      <Plus className="w-3 h-3" />
      添加项目
    </button>
  )
}
