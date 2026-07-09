/**
 * ShengmuOverviewCard — 声母总览单个卡片
 * 使用 Design Token 的卡片、字体层级与交互态
 */
export default function ShengmuOverviewCard({ item, count, onSelect, size = 'md' }) {
  const labelClass = size === 'sm' ? 'text-h3' : size === 'lg' ? 'text-display' : 'text-h2'
  const groupClass = 'text-tiny uppercase tracking-wider'
  const subClass = 'text-small'

  return (
    <button
      onClick={() => onSelect?.(item.id)}
      className="card-interactive flex flex-col items-center justify-center w-full aspect-square p-2"
      aria-label={`声母 ${item.label}`}
    >
      <span className={`${groupClass} text-content-tertiary mb-0.5`}>{item.group}</span>
      <span className={`${labelClass} font-bold text-content-primary`}>{item.label}</span>
      <span className={`${subClass} mt-0.5 text-content-secondary`}>
        {count} 音
      </span>
    </button>
  )
}
