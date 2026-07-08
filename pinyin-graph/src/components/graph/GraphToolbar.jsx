/**
 * GraphToolbar — 图谱工具栏（独立工具栏，用于图谱上方的控制区）
 */
export default function GraphToolbar({
  shengmu,
  shengmuCount,
  pinyinCount,
  onStartPractice,
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          声母 <strong className="text-gray-700">{shengmu}</strong>
        </span>
        <span className="w-px h-4 bg-gray-200" />
        <span>{shengmuCount} 个韵母</span>
        <span className="w-px h-4 bg-gray-200" />
        <span>{pinyinCount} 个拼音</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onStartPractice?.('choice', { shengmu })}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl
            hover:bg-primary-dark active:scale-95 transition-all duration-150 shadow-sm"
        >
          选择题练习
        </button>
        <button
          onClick={() => onStartPractice?.('pinyin-to-hanzi', { shengmu })}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl
            border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all duration-150"
        >
          拼音 → 汉字
        </button>
        <button
          onClick={() => onStartPractice?.('hanzi-to-pinyin', { shengmu })}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-xl
            border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all duration-150"
        >
          汉字 → 拼音
        </button>
      </div>
    </div>
  )
}