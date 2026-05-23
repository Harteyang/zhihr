import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SummarySectionProps {
  value: string
  onChange: (value: string) => void
}

export function SummarySection({ value, onChange }: SummarySectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">今日总结与反思</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
          placeholder="记录今天的收获、不足和改进计划..."
          className="resize-none"
        />
      </CardContent>
    </Card>
  )
}
