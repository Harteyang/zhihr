/**
 * HanziToPinyin — 汉字转拼音练习
 *
 * 显示汉字，用户需从多个拼音选项中选择正确的
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

export default function HanziToPinyin({ question, onAnswer, onNext, onPlaySound, playCorrectSound, isLast, currentIndex }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    setSelected(null)
    setRevealed(false)
    setShowSuccess(false)
  }, [currentIndex, question])

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false)
    onNext?.()
  }, [onNext])

  const handleSelect = useCallback((pinyin) => {
    if (revealed) return
    setSelected(pinyin)
    const correct = pinyin === question.correctAnswer
    onAnswer?.(pinyin)
    setTimeout(() => {
      setRevealed(true)
      if (correct && !isLast) {
        playCorrectSound?.()
        setShowSuccess(true)
      }
    }, 300)
  }, [revealed, question, onAnswer, isLast, playCorrectSound])

  const isCorrectOption = (opt) => opt === question.correctAnswer
  const isSelectedOption = (opt) => opt === selected

  return (
    <div className="card fade-in">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-display font-bold text-content-primary">{question.question}</span>
        </div>
        <p className="text-caption text-content-tertiary">请选择正确的拼音</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`${getOptionStyle(opt, revealed, isSelectedOption, isCorrectOption)} text-lg font-mono ${revealed ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-3">
          <p className="text-state-error text-caption mb-1">❌ 正确答案是：</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-state-success text-h1 font-bold">{question.correctAnswer}</span>
            <PlayButton onPlay={() => onPlaySound?.(question.correctAnswer)} size="sm" />
          </div>
        </div>
      )}

      {revealed && (
        <div className="text-center">
          <button onClick={onNext} className="btn-primary px-8">
            {isLast ? '查看结果' : '下一题 →'}
          </button>
        </div>
      )}

      {showSuccess && <SuccessFeedback duration={1200} onComplete={handleSuccessComplete} />}
    </div>
  )
}
