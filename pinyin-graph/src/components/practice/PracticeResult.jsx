/**
 * PracticeResult — 练习结果页
 */
import { useState } from 'react'
import PlayButton from '../ui/PlayButton'
import CelebrationAnimation from '../ui/CelebrationAnimation'

function getGrade(percentage) {
  if (percentage >= 100) return { label: '完美！', emoji: '🏆', color: 'text-yellow-500' }
  if (percentage >= 80) return { label: '很棒！', emoji: '🌟', color: 'text-blue-500' }
  if (percentage >= 60) return { label: '继续加油！', emoji: '💪', color: 'text-green-500' }
  return { label: '多练练哦', emoji: '📚', color: 'text-orange-500' }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export default function PracticeResult({ result, onPlaySound, onRestart, onBack }) {
  if (!result) return null

  const [showCelebration, setShowCelebration] = useState(result.percentage === 100)
  const grade = getGrade(result.percentage)

  return (
    <>
      {showCelebration && (
        <CelebrationAnimation duration={4000} onComplete={() => setShowCelebration(false)} />
      )}
      <div className="card fade-in text-center max-w-md mx-auto">
      {/* 等级 */}
      <div className={`text-5xl mb-2 ${grade.color}`}>{grade.emoji}</div>
      <h2 className={`text-2xl font-bold mb-1 ${grade.color}`}>{grade.label}</h2>
      <p className="text-gray-400 text-sm mb-6">练习完成</p>

      {/* 成绩 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-2xl font-bold text-gray-800">{result.score}</div>
          <div className="text-xs text-gray-400 mt-0.5">答对</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-2xl font-bold text-gray-800">{result.total}</div>
          <div className="text-xs text-gray-400 mt-0.5">总题</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-2xl font-bold text-blue-600">{result.percentage}%</div>
          <div className="text-xs text-gray-400 mt-0.5">正确率</div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">用时 {formatDuration(result.duration)}</p>

      {/* 错题列表 */}
      {result.wrongAnswers.length > 0 && (
        <div className="mb-6 text-left">
          <h3 className="text-sm font-medium text-gray-700 mb-2">错题回顾</h3>
          <div className="space-y-2">
            {result.wrongAnswers.map((wa, i) => (
              <div key={i} className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{wa.question}</span>
                  <span className="text-xs text-gray-400 mx-1">→</span>
                  <span className="text-sm font-bold text-green-600">{wa.correctAnswer}</span>
                  <div className="text-xs text-red-400 mt-0.5">
                    你的回答：{wa.userAnswer}
                  </div>
                </div>
                <PlayButton
                  onPlay={() => onPlaySound?.(wa.data?.pinyin || wa.question)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 justify-center">
        <button onClick={onRestart} className="btn-primary px-6">
          再来一次
        </button>
        <button onClick={onBack} className="btn-secondary px-6">
          返回图谱
        </button>
      </div>
    </div>
    </>
  )
}