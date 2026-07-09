/**
 * ShengmuOverview — 24 声母卡片总览
 * 全平台统一网格布局：移动端 4 列，平板 6 列，PC 端 8 列
 */
import { OVERVIEW_ITEMS } from '../../../utils/shengmu-overview'
import ShengmuOverviewCard from './ShengmuOverviewCard'

export default function ShengmuOverview({ onSelect, onStartPractice, getPinyinCount }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-content-primary">声母总览</h1>
        <span className="text-caption text-content-tertiary">点击声母进入详细图谱</span>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-small text-content-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-divider bg-surface-card" />
            真实声母
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-dashed border-divider-strong bg-surface-card/60" />
            归入零声母
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => onStartPractice?.('choice', {})}
            className="btn-secondary"
          >
            选择题练习
          </button>
          <button
            onClick={() => onStartPractice?.('pinyin-to-hanzi', {})}
            className="btn-secondary"
          >
            拼音 → 汉字
          </button>
          <button
            onClick={() => onStartPractice?.('hanzi-to-pinyin', {})}
            className="btn-secondary"
          >
            汉字 → 拼音
          </button>
        </div>
      </div>
    </div>
  )
}
