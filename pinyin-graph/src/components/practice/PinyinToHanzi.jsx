/**
 * PinyinToHanzi — 拼音转汉字练习
 *
 * 显示拼音，用户需从候选字中选出正确的汉字
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

export default function PinyinToHanzi({ question, onAnswer, onNext, onPlaySound, playCorrectSound, isLast, currentIndex }) {
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

  const handleSelect = useCallback((hanzi) => {
    if (revealed) return
    setSelected(hanzi)
    const correct = hanzi === question.correctAnswer
    onAnswer?.(hanzi)
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
    <div className="card fade-in p-5 sm:p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-h1 font-bold text-brand-500">{question.question}</span>
          <PlayButton onPlay={() => onPlaySound?.(question.question)} size="md" />
        </div>
        <p className="text-caption text-content-tertiary">请选择对应的汉字</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`${getOptionStyle(opt, revealed, isSelectedOption, isCorrectOption)} text-h1 ${revealed ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-5">
          <p className="text-state-error text-caption mb-1">❌ 正确答案是：</p>
          <p className="text-state-success text-display font-bold">{question.correctAnswer}</p>
        </div>
      )}

      {revealed && (
        <div className="text-center mt-2">
          <button onClick={onNext} className="btn-primary px-8">
            {isLast ? '查看结果' : '下一题 →'}
          </button>
        </div>
      )}

      {showSuccess && <SuccessFeedback duration={1200} onComplete={handleSuccessComplete} />}
    </div>
  )
}
