/**
 * PinyinToHanzi — 拼音转汉字练习
 *
 * 显示拼音，用户需从候选字中选出正确的汉字
 */
import { useState, useCallback, useEffect } from 'react'
import PlayButton from '../ui/PlayButton'

export default function PinyinToHanzi({ question, onAnswer, onNext, onPlaySound, isLast, currentIndex }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setSelected(null)
    setRevealed(false)
  }, [currentIndex])

  const handleSelect = useCallback((hanzi) => {
    if (revealed) return
    setSelected(hanzi)
    setRevealed(true)
    const correct = hanzi === question.correctAnswer
    onAnswer?.(hanzi)
    if (correct) {
      setTimeout(() => {
        if (!isLast) onNext?.()
      }, 800)
    }
  }, [revealed, question, onAnswer, onNext, isLast])

  const isCorrectOption = (opt) => opt === question.correctAnswer
  const isSelectedOption = (opt) => opt === selected

  const getOptionStyle = (opt) => {
    if (!revealed) return 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
    if (isCorrectOption(opt)) return 'bg-green-50 border-green-300 text-green-700'
    if (isSelectedOption(opt)) return 'bg-red-50 border-red-300 text-red-600'
    return 'bg-white border-gray-200 opacity-50'
  }

  return (
    <div className="card fade-in">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl font-bold text-blue-600">{question.question}</span>
          <PlayButton onPlay={() => onPlaySound?.(question.question)} size="md" />
        </div>
        <p className="text-sm text-gray-400">请选择对应的汉字</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`py-3 px-4 rounded-xl border-2 text-center text-3xl font-bold transition-all duration-150 ${getOptionStyle(opt)}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-3">
          <p className="text-red-500 text-sm mb-1">❌ 正确答案是：</p>
          <p className="text-green-600 text-3xl font-bold">{question.correctAnswer}</p>
        </div>
      )}

      {revealed && (
        <div className="text-center">
          <button onClick={isLast ? onNext : onNext} className="btn-primary px-8">
            {isLast ? '查看结果' : '下一题 →'}
          </button>
        </div>
      )}
    </div>
  )
}