import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'

interface DateFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

export function DateFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} className="pl-10" />
      </div>
      <span className="text-muted-foreground">至</span>
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} className="pl-10" />
      </div>
    </div>
  )
}
