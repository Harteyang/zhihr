import { useState, useMemo } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { DateFilter } from './DateFilter'
import { RecordItem } from './RecordItem'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function HistoryTab() {
  const reviews = useReviewsStore(s => s.reviews)
  const deleteRecord = useReviewsStore(s => s.deleteRecord)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = reviews
    if (startDate) result = result.filter(r => r.date >= startDate)
    if (endDate) result = result.filter(r => r.date <= endDate)
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(r =>
        r.summary?.toLowerCase().includes(term) ||
        r.date.includes(term) ||
        Object.values(r.content || {}).some(v => typeof v === 'string' && v.toLowerCase().includes(term))
      )
    }
    return result
  }, [reviews, startDate, endDate, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索复盘记录..."
            className="pl-10"
          />
        </div>
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无复盘记录</div>
      ) : (
        filtered.map(record => (
          <RecordItem key={record.id} record={record} onDelete={deleteRecord} />
        ))
      )}
    </div>
  )
}
