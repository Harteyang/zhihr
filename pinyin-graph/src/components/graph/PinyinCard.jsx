/**
 * PinyinCard — 拼音详情浮层卡片
 * 在图谱中点击拼音节点后弹出
 */
import PlayButton from '../ui/PlayButton'

export default function PinyinCard({ node, onClose, onPlaySound, onStartPractice }) {
  if (!node) return null

  const { pinyin, hanzi, zuci, shengdiao, yunmu, shengmu } = node

  return (
    <div className="slide-up absolute bottom-4 right-4 z-20 w-72 md:w-80 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-xl p-5">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-blue-600">{pinyin}</span>
            <PlayButton
              onPlay={() => onPlaySound?.(pinyin)}
              size="sm"
            />
          </div>
          <span className="text-xs text-gray-400">
            {shengmu === '零声母' ? '' : `声母 ${shengmu}`}
            {yunmu ? ` · 韵母 ${yunmu}` : ''}
            {' · '}
            {shengdiao}声
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
        >
          ×
        </button>
      </div>

      {/* 汉字 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl font-bold text-gray-900">{hanzi}</span>
      </div>

      {/* 组词 */}
      {zuci && (
        <div className="mb-4">
          <span className="text-xs text-gray-400 mr-2">组词</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg">{zuci}</span>
            <PlayButton
              onPlay={() => onPlaySound?.(zuci)}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => onPlaySound?.(pinyin)}
          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition-colors"
        >
          🔊 听发音
        </button>
        <button
          onClick={() => onStartPractice?.('choice', { shengmu, yunmu })}
          className="flex-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
        >
          开始练习
        </button>
      </div>
    </div>
  )
}