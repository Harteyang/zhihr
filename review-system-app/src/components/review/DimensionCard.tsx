import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HealthInput } from './HealthInput'
import { FreeTextInput } from './FreeTextInput'
import type { DimensionConfig } from '@/lib/dimensions'
import * as LucideIcons from 'lucide-react'

interface HealthItem {
  label: string
  placeholder: string
  value: string
}

interface DimensionCardProps {
  config: DimensionConfig
  value: string
  onChange: (value: string) => void
}

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
  pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
}

const iconColorMap: Record<string, string> = {
  emerald: '#10B981', blue: '#3B82F6', amber: '#F59E0B', violet: '#8B5CF6',
  pink: '#EC4899', cyan: '#06B6D4', indigo: '#6366F1', rose: '#F43F5E',
}

function getIcon(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> | null {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>
  return icons[name] || null
}

export function DimensionCard({ config, value, onChange }: DimensionCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const Icon = getIcon(config.icon)

  const healthItems: HealthItem[] = config.type === 'structured' && config.structuredItems
    ? (() => {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : config.structuredItems.map(item => ({ ...item, value: '' }))
        } catch {
          return config.structuredItems.map(item => ({ ...item, value: '' }))
        }
      })()
    : []

  const handleHealthChange = (items: HealthItem[]) => {
    onChange(JSON.stringify(items))
  }

  return (
    <Card className={`${colorMap[config.color] || ''} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${iconColorMap[config.color]}20` }}><Icon className="w-5 h-5" style={{ color: iconColorMap[config.color] }} /></div>}
            <CardTitle className="text-base sm:text-lg font-semibold">{config.name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {config.type === 'structured' ? (
            <HealthInput items={healthItems} onChange={handleHealthChange} />
          ) : (
            <FreeTextInput value={value} onChange={onChange} placeholder={config.placeholder} />
          )}
        </CardContent>
      )}
    </Card>
  )
}
