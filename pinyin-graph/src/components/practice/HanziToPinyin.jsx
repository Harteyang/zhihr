/**
 * HanziToPinyin — 汉字转拼音练习
 *
 * 显示汉字，用户需从多个拼音选项中选择正确的
 */
import { useState, useCallback, useEffect } from 'react'
import PlayButton from '../ui/PlayButton'
import SuccessFeedback from '../ui/SuccessFeedback'

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

  const getOptionStyle = (opt) => {
    if (!revealed && isSelectedOption(opt)) return 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200'
    if (!revealed) return 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
    if (isCorrectOption(opt)) return 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200'
    if (isSelectedOption(opt)) return 'bg-red-50 border-red-400 text-red-600 ring-2 ring-red-200'
    return 'bg-white border-gray-200 opacity-50'
  }

  return (
    <div className="card fade-in">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-5xl font-bold text-gray-900">{question.question}</span>
        </div>
        <p className="text-sm text-gray-400">请选择正确的拼音</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`py-3 px-4 rounded-xl border-2 text-center text-lg font-mono font-medium transition-all duration-150 ${getOptionStyle(opt)}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-3">
          <p className="text-red-500 text-sm mb-1">❌ 正确答案是：</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-xl font-bold">{question.correctAnswer}</span>
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
