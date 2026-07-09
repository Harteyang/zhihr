/**
 * PracticeResult — 练习结果页
 */
import { useEffect, useState } from 'react'
import PlayButton from '../ui/PlayButton'
import FullScoreCelebration from '../ui/FullScoreCelebration'

function getGrade(percentage) {
  if (percentage >= 100) return { label: '完美！', emoji: '🏆', color: 'text-brand-500' }
  if (percentage >= 80) return { label: '很棒！', emoji: '🌟', color: 'text-state-success' }
  if (percentage >= 60) return { label: '继续加油！', emoji: '💪', color: 'text-state-warning' }
  return { label: '多练练哦', emoji: '📚', color: 'text-state-error' }
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export default function PracticeResult({ result, onPlaySound, onRestart, onBack, playVictorySound, stopVictorySound }) {
  if (!result) return null

  const [showCelebration, setShowCelebration] = useState(result.percentage === 100)
  const grade = getGrade(result.percentage)

  useEffect(() => {
    if (result.percentage === 100) {
      playVictorySound?.()
    }
    return () => {
      stopVictorySound?.()
    }
  }, [result.percentage, playVictorySound, stopVictorySound])

  return (
    <>
      {showCelebration && (
        <FullScoreCelebration duration={4500} onComplete={() => setShowCelebration(false)} />
      )}
      <div className="card fade-in text-center max-w-md mx-auto">
        {/* 等级 */}
        <div className={`text-5xl mb-2 ${grade.color}`}>{grade.emoji}</div>
        <h2 className={`text-h2 font-bold mb-1 ${grade.color}`}>{grade.label}</h2>
        <p className="text-caption text-content-tertiary mb-6">练习完成</p>

        {/* 成绩 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 text-center">
            <div className="text-h1 font-bold text-content-primary">{result.score}</div>
            <div className="text-small text-content-tertiary mt-0.5">答对</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-h1 font-bold text-content-primary">{result.total}</div>
            <div className="text-small text-content-tertiary mt-0.5">总题</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-h1 font-bold text-brand-500">{result.percentage}%</div>
            <div className="text-small text-content-tertiary mt-0.5">正确率</div>
          </div>
        </div>

        <p className="text-caption text-content-tertiary mb-4">用时 {formatDuration(result.duration)}</p>

        {/* 错题列表 */}
        {result.wrongAnswers.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-caption font-semibold text-content-secondary mb-2">错题回顾</h3>
            <div className="space-y-2">
              {result.wrongAnswers.map((wa, i) => (
                <div key={i} className="bg-state-error/10 rounded-md p-3 flex items-center justify-between">
                  <div>
                    <span className="text-caption font-medium text-content-secondary">{wa.question}</span>
                    <span className="text-small text-content-tertiary mx-1">→</span>
                    <span className="text-caption font-bold text-state-success">{wa.correctAnswer}</span>
                    <div className="text-small text-state-error mt-0.5">
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
