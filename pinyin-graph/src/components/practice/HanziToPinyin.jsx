/**
 * HanziToPinyin — 汉字转拼音练习
 *
 * 显示汉字，用户需从多个拼音选项中选择正确的
 */
import { useState, useCallback, useEffect } from 'react'

export default function HanziToPinyin({ question, onAnswer, onNext, isLast }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setSelected(null)
    setRevealed(false)
  }, [question])

  const handleSelect = useCallback((pinyin) => {
    if (revealed) return
    setSelected(pinyin)
    setRevealed(true)
    const correct = pinyin === question.correctAnswer
    onAnswer?.(pinyin)
    if (correct) {
      setRevealed(true)
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
          <span className="text-green-600 text-xl font-bold">{question.correctAnswer}</span>
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