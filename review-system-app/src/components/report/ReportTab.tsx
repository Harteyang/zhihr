import { useReviewsStore } from '@/stores/reviews'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'

export function ReportTab() {
  const reviews = useReviewsStore(s => s.reviews)

  const totalReviews = reviews.length
  const dimensionStats = DEFAULT_DIMENSIONS.map(dim => {
    const filled = reviews.filter(r => {
      const val = r.content?.[dim.key as keyof typeof r.content]
      return val && (typeof val === 'string' ? val.trim().length > 0 : true)
    }).length
    return { ...dim, filled, rate: totalReviews > 0 ? Math.round((filled / totalReviews) * 100) : 0 }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">复盘概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalReviews}</div>
              <div className="text-sm text-muted-foreground">总复盘数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {reviews.length > 0 ? Math.round(dimensionStats.reduce((sum, d) => sum + d.rate, 0) / dimensionStats.length) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">平均填写率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">维度填写率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dimensionStats.map((stat, index) => (
              <div key={stat.key} className="flex items-center gap-3">
                <span className="w-16 text-sm text-muted-foreground">{stat.name}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stat.rate}%`, backgroundColor: `var(--color-chart-${(index % 5) + 1})` }}
                  />
                </div>
                <span className="w-12 text-sm text-right">{stat.rate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
