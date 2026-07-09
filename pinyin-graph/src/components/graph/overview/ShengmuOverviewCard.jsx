/**
 * ShengmuOverviewCard — 声母总览单个卡片
 * 真实声母：白底实线边框 + 拼音数量统计 + 发音示例 + 组词
 * 虚拟声母（y/w）：虚线边框 + "→ 零声母" 提示
 */
import { useMemo } from 'react'
import { getLayerColor, getLayerTextColor } from '../../../utils/pinyin-utils'

export default function ShengmuOverviewCard({ item, count, onSelect, pinyinData }) {
  const isVirtual = !!item.virtual
  const activeBg = getLayerColor('shengmu')
  const activeText = getLayerTextColor('shengmu')

  const examples = useMemo(() => {
    if (isVirtual || !pinyinData?.length) return []
    const targetShengmu = item.id === 'y' || item.id === 'w' ? '零声母' : item.id
    const filtered = pinyinData.filter(p => p.shengmu === targetShengmu)
    return filtered.slice(0, 3).map(p => ({
      pinyin: p.pinyin,
      hanzi: p.hanzi,
      zuci: p.zuci
    }))
  }, [item.id, isVirtual, pinyinData])

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`
        relative w-full p-3 rounded-2xl flex flex-col items-center
        transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isVirtual
          ? 'border-2 border-dashed border-gray-300 bg-white/60 text-gray-500 hover:border-gray-400'
          : 'bg-white border border-gray-200 shadow-sm text-gray-800 hover:border-blue-300'
        }
      `}
      aria-label={isVirtual
        ? `${item.label}（数据归在零声母下，点击查看零声母图谱）`
        : `声母 ${item.label}，含 ${count} 个拼音`}
    >
      <div className="flex flex-col items-center mb-2">
        <span className="text-2xl font-bold">{item.label}</span>
        <span className="text-[10px] mt-0.5 text-gray-500">
          {isVirtual ? '→ 零声母' : `${count} 音`}
        </span>
      </div>

      {!isVirtual && examples.length > 0 && (
        <div className="w-full space-y-1.5">
          {examples.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-blue-600 font-mono">{ex.pinyin}</span>
              <span className="text-gray-800 font-medium">{ex.hanzi}</span>
              <span className="text-gray-400 text-[10px]">{ex.zuci}</span>
            </div>
          ))}
        </div>
      )}

      {!isVirtual && (
        <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ backgroundColor: activeBg }}>
        </div>
      )}
    </button>
  )
}
