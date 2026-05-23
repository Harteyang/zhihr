import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PenLine, History, BarChart2 } from 'lucide-react'

interface TabBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { key: 'record', label: '记录', icon: PenLine },
  { key: 'history', label: '历史', icon: History },
  { key: 'report', label: '报告', icon: BarChart2 },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full grid grid-cols-3">
          {tabs.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
