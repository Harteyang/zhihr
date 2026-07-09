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
    <div className="slide-up absolute bottom-4 right-4 z-20 w-72 md:w-80 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-xl p-5">
      {/* 拼音 + 关闭 */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl font-bold text-blue-600">{pinyin}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          aria-label="关闭"
        >
          ×
        </button>
      </div>

      {/* 汉字(词语) + 播放按钮 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl font-bold text-gray-900">
          {hanzi}
          {zuci && <span className="text-2xl font-medium text-gray-500">（{zuci}）</span>}
        </span>
        <PlayButton
          onPlay={() => onPlaySound?.(playText)}
          size="md"
        />
      </div>

      {/* 造句 */}
      {liju && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-[10px] font-medium text-amber-600">造句</div>
            <PlayButton
              onPlay={() => onPlaySound?.(liju)}
              size="sm"
            />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{liju}</p>
        </div>
      )}

      {/* 操作按钮 */}
      <button
        onClick={() => onStartPractice?.('choice', { shengmu, yunmu })}
        className="w-full px-3 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
      >
        开始练习
      </button>
    </div>
  )
}
