import { Button } from '@/components/ui/button'
import { Save, RotateCcw } from 'lucide-react'

interface ActionBarProps {
  onSave: () => void
  onReset: () => void
  saving?: boolean
}

export function ActionBar({ onSave, onReset, saving }: ActionBarProps) {
  return (
    <div className="flex gap-3 mb-6">
      <Button onClick={onSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? '保存中...' : '保存'}
      </Button>
      <Button variant="outline" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        重置
      </Button>
    </div>
  )
}
