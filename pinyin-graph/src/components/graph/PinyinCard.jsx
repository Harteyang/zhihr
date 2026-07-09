/**
 * PinyinCard — 拼音详情浮层卡片
 * 在图谱中点击拼音节点后弹出
 *
 * 布局：拼音 + 汉字(词语) + 造句 + 练习入口
 */
import PlayButton from '../ui/PlayButton'

export default function PinyinCard({ node, onClose, onPlaySound, onStartPractice }) {
  if (!node) return null

  const { pinyin, hanzi, zuci, liju, shengmu, yunmu } = node

  // 汉字与词语连贯朗读
  const playText = zuci ? `${hanzi}，${zuci}` : hanzi

  return (
    <div className="slide-up absolute bottom-4 right-4 z-20 w-72 md:w-80 bg-surface-elevated border border-divider rounded-xl shadow-lg p-5">
      {/* 拼音 + 关闭 */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-h2 font-bold text-brand-500">{pinyin}</span>
        <button
          onClick={onClose}
          className="btn-ghost text-content-tertiary hover:text-content-primary"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {/* 汉字(词语) + 播放按钮 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-display font-bold text-content-primary">
          {hanzi}
          {zuci && <span className="text-h3 font-medium text-content-secondary">（{zuci}）</span>}
        </span>
        <PlayButton
          onPlay={() => onPlaySound?.(playText)}
          size="md"
        />
      </div>

      {/* 造句 */}
      {liju && (
        <div className="mb-4 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30 rounded-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="text-tiny font-semibold text-brand-700 dark:text-brand-300 shrink-0">造句</div>
              <p className="text-caption text-content-secondary leading-relaxed">{liju}</p>
            </div>
            <PlayButton
              onPlay={() => onPlaySound?.(liju)}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <button
        onClick={() => onStartPractice?.('choice', { shengmu, yunmu })}
        className="w-full btn-primary"
      >
        开始练习
      </button>
    </div>
  )
}
