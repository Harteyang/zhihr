/**
 * ShengmuOverview — 24 声母卡片总览
 * 全平台统一网格布局：移动端 4 列，平板 6 列，PC 端 8 列
 */
import { OVERVIEW_ITEMS } from '../../../utils/shengmu-overview'
import ShengmuOverviewCard from './ShengmuOverviewCard'

export default function ShengmuOverview({ onSelect, getPinyinCount }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">声母总览</h2>
        <span className="text-xs text-gray-400">点击声母进入详细图谱</span>
      </div>

      <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center">
          {OVERVIEW_ITEMS.map((item) => (
            <ShengmuOverviewCard
              key={item.id}
              item={item}
              count={getPinyinCount(item.id) || 0}
              onSelect={onSelect}
              size="md"
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-300 bg-white" />
          真实声母
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-dashed border-gray-300 bg-white/60" />
          归入零声母
        </span>
      </div>
    </div>
  )
}
