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
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← 返回图谱
        </button>
        <div className="flex items-center gap-3">
          <FeedbackToggle
            enabled={feedbackEnabled}
            onToggle={onToggleFeedback}
            volume={feedbackVolume}
            onVolumeChange={onVolumeChange}
          />
          <div className="text-sm text-gray-500">
            <span className="font-medium text-blue-600">{score}</span>
            <span className="text-gray-300 mx-1">/</span>
            <span>{total}</span>
            <span className="text-gray-300 mx-1">|</span>
            <span>第 {currentIndex + 1} 题</span>
          </div>
        </div>
      </div>
      {/* 进度条 */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
