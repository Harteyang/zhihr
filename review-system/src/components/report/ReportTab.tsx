import { useReviewsStore } from '@/stores/reviews'
import { useAuthStore } from '@/stores/auth'
import { BarChart3, TrendingUp, Calendar, FileText } from 'lucide-react'
import { useEffect, useRef } from 'react'

// ECharts is loaded via CDN in index.html
declare global {
  interface Window {
    echarts: any
  }
}

const DIMENSION_LABELS: Record<string, string> = {
  health: '健康',
  work: '工作',
  study: '学习',
  social: '社交',
  finance: '财务',
  life: '生活',
  spirit: '精神',
  leisure: '休闲',
}

export function ReportTab() {
  const reviews = useReviewsStore(s => s.reviews)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // 基础统计
  const totalReviews = reviews.length
  const thisMonth = reviews.filter(r => {
    const now = new Date()
    const d = new Date(r.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // 连续天数
  const streak = calculateStreak(reviews.map(r => r.date))

  // 维度统计
  const dimensionStats = calculateDimensionStats(reviews)

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="总记录" value={totalReviews} color="blue" />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="本月记录" value={thisMonth} color="emerald" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="连续天数" value={streak} color="amber" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="同步状态" value={isAuthenticated ? '已同步' : '离线'} color={isAuthenticated ? 'green' : 'slate'} />
      </div>

      {/* 维度活跃度雷达图 */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">维度活跃度</h3>
        <RadarChart data={dimensionStats} />
      </div>

      {/* 最近7天日历 */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">最近7天</h3>
        <div className="grid grid-cols-7 gap-2">
          {getLast7Days().map(date => {
            const hasReview = reviews.some(r => r.date === date)
            return (
              <div key={date} className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs ${
                  hasReview
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}>
                  {new Date(date).getDate()}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RadarChart({ data }: { data: { key: string; count: number; percentage: number }[] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || !window.echarts) return

    const chart = window.echarts.init(chartRef.current)

    const indicator = data.map(({ key }) => ({
      name: DIMENSION_LABELS[key] || key,
      max: 100,
    }))

    const value = data.map(({ percentage }) => percentage)

    const option: any = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.componentSubType === 'radar') {
            return `${params.name}: ${params.value}%`
          }
          return `${params.name}: ${params.value}%`
        },
      },
      radar: {
        indicator,
        shape: 'circle',
        splitNumber: 5,
        axisName: {
          color: '#64748b',
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.3)',
          },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.3)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value,
              name: '维度活跃度',
              areaStyle: {
                color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.6)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
                ]),
              },
              lineStyle: {
                color: '#3b82f6',
                width: 2,
              },
              itemStyle: {
                color: '#3b82f6',
              },
              symbol: 'circle',
              symbolSize: 6,
            },
          ],
        },
      ],
    }

    chart.setOption(option)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [data])

  return <div ref={chartRef} className="w-full h-[300px]" />
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color] || colorClasses.blue}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let checkDate = today

  for (const date of sorted) {
    if (date === checkDate) {
      streak++
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().split('T')[0]
    } else if (date < checkDate) {
      break
    }
  }
  return streak
}

function calculateDimensionStats(reviews: any[]) {
  const keys = ['health', 'work', 'study', 'social', 'finance', 'life', 'spirit', 'leisure']
  const total = reviews.length || 1

  return keys.map(key => {
    const count = reviews.filter(r => r.content && r.content[key] && r.content[key].trim()).length
    return { key, count, percentage: Math.round((count / total) * 100) }
  }).sort((a, b) => b.count - a.count)
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}
