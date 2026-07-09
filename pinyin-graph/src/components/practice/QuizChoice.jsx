/**
 * QuizChoice — 选择题练习组件
 *
 * 支持两种题型：
 *   1. 拼音→汉字：显示拼音，从 4 个汉字中选择
 *   2. 汉字→拼音：显示汉字，从 4 个拼音中选择
 */
import { useState, useCallback, useEffect } from 'react'
import PlayButton from '../ui/PlayButton'
import SuccessFeedback from '../ui/SuccessFeedback'

function getOptionStyle(opt, revealed, isSelectedOption, isCorrectOption) {
  const base = 'py-3 px-4 rounded-md border-2 text-center font-semibold transition-all duration-150 '
  if (!revealed && isSelectedOption(opt)) {
    return base + 'border-state-info bg-state-info/10 text-state-info'
  }
  if (!revealed) {
    return base + 'border-divider bg-surface-card text-content-primary hover:border-state-info hover:bg-state-info/5'
  }
  if (isCorrectOption(opt)) {
    return base + 'border-state-success bg-state-success/10 text-state-success'
  }
  if (isSelectedOption(opt)) {
    return base + 'border-state-error bg-state-error/10 text-state-error'
  }
  return base + 'border-divider bg-surface-card text-content-tertiary opacity-60'
}

export default function QuizChoice({
  question,
  onAnswer,
  onNext,
  onPlaySound,
  playCorrectSound,
  isLast,
  currentIndex,
}) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // 切换题目时重置状态
  useEffect(() => {
    setSelected(null)
    setRevealed(false)
    setShowSuccess(false)
  }, [currentIndex, question])

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false)
    onNext?.()
  }, [onNext])

  const handleSelect = useCallback((option) => {
    if (revealed) return
    setSelected(option)
    const correct = option === question.correctAnswer
    onAnswer?.(option)
    setTimeout(() => {
      setRevealed(true)
      if (correct && !isLast) {
        playCorrectSound?.()
        setShowSuccess(true)
      }
    }, 300)
  }, [revealed, question, onAnswer, isLast, playCorrectSound])

  const handleNextClick = useCallback(() => {
    onNext?.()
  }, [onNext])

  const isCorrectOption = (opt) => opt === question.correctAnswer
  const isSelectedOption = (opt) => opt === selected

  return (
    <div className="card fade-in">
      {/* 题目 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          {question.type === 'pinyin-to-hanzi' ? (
            <span className="text-h1 font-bold text-brand-500">{question.question}</span>
          ) : (
            <span className="text-display font-bold text-content-primary">{question.question}</span>
          )}
          <PlayButton
            onPlay={() => onPlaySound?.(question.type === 'pinyin-to-hanzi' ? question.question : question.data?.pinyin)}
            size="md"
          />
        </div>
        <p className="text-caption text-content-tertiary">
          {question.type === 'pinyin-to-hanzi' ? '请选择对应的汉字' : '请选择正确的拼音'}
        </p>
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`${getOptionStyle(opt, revealed, isSelectedOption, isCorrectOption)} text-lg ${revealed ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* 反馈 */}
      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-3">
          <p className="text-state-error text-caption mb-1">
            ❌ 不对哦，正确答案是：
          </p>
          <p className="text-state-success text-h1 font-bold">
            {question.correctAnswer}
          </p>
        </div>
      )}

      {/* 下一题按钮（答错或手动） */}
      {revealed && (
        <div className="text-center">
          {isLast ? (
            <button
              onClick={handleNextClick}
              className="btn-primary px-8"
            >
              查看结果
            </button>
          ) : (
            <button
              onClick={handleNextClick}
              className="btn-primary px-8"
            >
              下一题 →
            </button>
          )}
        </div>
      )}

      {showSuccess && <SuccessFeedback duration={1200} onComplete={handleSuccessComplete} />}
    </div>
  )
}
