import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Review } from '@/types/review'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'

interface RecordItemProps {
  record: Review
  onDelete: (id: string) => void
}

export function RecordItem({ record, onDelete }: RecordItemProps) {
  const [expanded, setExpanded] = useState(false)

  const filledDimensions = DEFAULT_DIMENSIONS.filter(dim => {
    const val = record.content?.[dim.key as keyof typeof record.content]
    return val && val.trim().length > 0
  })

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{record.date}</CardTitle>
          <div className="flex items-center gap-2">
            {record.summary && <span className="text-xs text-muted-foreground max-w-[120px] sm:max-w-[200px] truncate">{record.summary}</span>}
            <span className="text-xs text-muted-foreground">{filledDimensions.length}项</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {filledDimensions.map(dim => (
            <div key={dim.key} className="mb-2">
              <span className="text-xs font-medium text-muted-foreground">{dim.name}：</span>
              <span className="text-sm">{record.content?.[dim.key as keyof typeof record.content]}</span>
            </div>
          ))}
          {record.summary && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground">总结：</span>
              <p className="text-sm mt-1">{record.summary}</p>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => onDelete(record.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
