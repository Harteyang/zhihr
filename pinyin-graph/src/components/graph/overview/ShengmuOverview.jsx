/**
 * ShengmuOverview — 24 声母卡片总览
 * 统一卡片式网格布局，响应式设计
 */
import { OVERVIEW_ITEMS } from '../../../utils/shengmu-overview'
import ShengmuOverviewCard from './ShengmuOverviewCard'

export default function ShengmuOverview({ onSelect, getPinyinCount, pinyinData }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">声母总览</h2>
        <span className="text-xs text-gray-400">点击声母进入详细图谱</span>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {OVERVIEW_ITEMS.map((item) => (
            <ShengmuOverviewCard
              key={item.id}
              item={item}
              count={getPinyinCount(item.id) || 0}
              onSelect={onSelect}
              pinyinData={pinyinData}
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
