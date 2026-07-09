/**
 * GraphToolbar — 图谱辅助工具栏（统计信息 + 练习入口）
 * 位于知识图谱下方，避免抢占核心内容区域
 */
export default function GraphToolbar({
  shengmu,
  shengmuCount,
  pinyinCount,
  onStartPractice,
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 text-caption text-content-secondary">
        <span>
          声母 <strong className="text-content-primary">{shengmu}</strong>
        </span>
        <span className="w-px h-4 bg-divider" />
        <span>{shengmuCount} 个韵母</span>
        <span className="w-px h-4 bg-divider" />
        <span>{pinyinCount} 个拼音</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStartPractice?.('choice', { shengmu })}
          className="btn-secondary"
        >
          选择题练习
        </button>
        <button
          onClick={() => onStartPractice?.('pinyin-to-hanzi', { shengmu })}
          className="btn-secondary"
        >
          拼音 → 汉字
        </button>
        <button
          onClick={() => onStartPractice?.('hanzi-to-pinyin', { shengmu })}
          className="btn-secondary"
        >
          汉字 → 拼音
        </button>
      </div>
    </div>
  )
}
