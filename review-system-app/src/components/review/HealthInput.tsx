import { Input } from '@/components/ui/input'

interface HealthItem {
  label: string
  placeholder: string
  value: string
}

interface HealthInputProps {
  items: HealthItem[]
  onChange: (items: HealthItem[]) => void
}

export function HealthInput({ items, onChange }: HealthInputProps) {
  const handleChange = (index: number, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], value }
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={e => {
              const updated = [...items]
              updated[index] = { ...updated[index], label: e.target.value }
              onChange(updated)
            }}
            className="w-20 text-sm bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
          />
          <span className="text-emerald-500 flex-shrink-0">:</span>
          <Input
            value={item.value}
            onChange={e => handleChange(index, e.target.value)}
            placeholder={item.placeholder}
            className="flex-1 text-sm bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
          />
        </div>
      ))}
    </div>
  )
}
