/**
 * PracticeHeader — 练习头部（进度+得分+音效开关）
 */
import FeedbackToggle from '../ui/FeedbackToggle'

export default function PracticeHeader({
  currentIndex,
  total,
  score,
  onBack,
  feedbackEnabled,
  onToggleFeedback,
  feedbackVolume,
  onVolumeChange,
}) {
  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-ghost text-caption flex items-center gap-1">
          ← 返回图谱
        </button>

        <div className="flex items-center gap-3">
          <FeedbackToggle
            enabled={feedbackEnabled}
            onToggle={onToggleFeedback}
            volume={feedbackVolume}
            onVolumeChange={onVolumeChange}
          />
          <div className="flex items-center gap-3 text-caption text-content-secondary">
            <span className="font-semibold text-brand-500">{score}</span>
            <span>/</span>
            <span>{total}</span>
            <span className="text-divider">|</span>
            <span>第 {currentIndex + 1} 题</span>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full h-2 bg-divider rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
