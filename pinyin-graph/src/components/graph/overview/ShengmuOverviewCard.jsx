/**
 * ShengmuOverviewCard — 声母总览单个卡片
 * 真实声母：白底实线边框 + 音标注 + 拼音数量统计
 * 虚拟声母（y/w）：虚线边框 + 音标注 + "→ 零声母" 提示
 */
import { getLayerColor, getLayerTextColor } from '../../../utils/pinyin-utils'

export default function ShengmuOverviewCard({ item, count, onSelect, size = 'md' }) {
  const isVirtual = !!item.virtual
  const sizeClass =
    size === 'sm' ? 'w-14 h-16' : size === 'lg' ? 'w-[68px] h-[72px]' : 'w-16 h-18'
  const labelClass =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const groupClass = 'text-[9px]'
  const subClass = 'text-[10px]'

  const activeBg = getLayerColor('shengmu')
  const activeText = getLayerTextColor('shengmu')

  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`
        ${sizeClass} rounded-2xl flex flex-col items-center justify-center
        transition-all duration-150
        hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isVirtual
          ? 'border-2 border-dashed border-gray-300 bg-white/60 text-gray-500 hover:border-gray-400'
          : 'bg-white border border-gray-200 shadow-sm text-gray-800 hover:border-gray-300 hover:shadow-md'
        }
      `}
      style={!isVirtual ? { borderColor: undefined } : undefined}
      onMouseEnter={!isVirtual ? (e) => { e.currentTarget.style.backgroundColor = activeBg; e.currentTarget.style.color = activeText } : undefined}
      onMouseLeave={!isVirtual ? (e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '' } : undefined}
      aria-label={isVirtual
        ? `${item.label}（${item.group}，数据归在零声母下，点击查看零声母图谱）`
        : `声母 ${item.label}（${item.group}），含 ${count} 个拼音`}
    >
      <span className={`${groupClass} text-gray-400 mb-0.5`}>{item.group}</span>
      <span className={`${labelClass} font-bold`}>{item.label}</span>
      <span className={`${subClass} mt-0.5 ${isVirtual ? 'text-gray-400' : 'text-gray-500'}`}>
        {isVirtual ? '→ 零声母' : `${count} 音`}
      </span>
    </button>
  )
}
