/**
 * QuizChoice — 选择题练习组件
 *
 * 支持两种题型：
 *   1. 拼音→汉字：显示拼音，从 4 个汉字中选择
 *   2. 汉字→拼音：显示汉字，从 4 个拼音中选择
 */
import { useState, useCallback, useEffect } from 'react'
import PlayButton from '../ui/PlayButton'

export default function QuizChoice({
  question,
  onAnswer,
  onNext,
  onPlaySound,
  isLast,
}) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  // 切换题目时重置状态
  useEffect(() => {
    setSelected(null)
    setRevealed(false)
  }, [question])

  const handleSelect = useCallback((option) => {
    if (revealed) return // 已经回答过了
    setSelected(option)
    setRevealed(true)
    const correct = option === question.correctAnswer
    onAnswer?.(option)
    // 自动进入下一题（短暂的延迟以便用户看到反馈）
    if (!correct) return // 答错等待手动
    setTimeout(() => {
      if (!isLast) {
        onNext?.()
      }
    }, 800)
  }, [revealed, question, onAnswer, onNext, isLast])

  const handleNextClick = useCallback(() => {
    onNext?.()
  }, [onNext])

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
      {/* 题目 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          {question.type === 'pinyin-to-hanzi' ? (
            <span className="text-3xl font-bold text-blue-600">{question.question}</span>
          ) : (
            <span className="text-5xl font-bold text-gray-900">{question.question}</span>
          )}
          {question.type === 'hanzi-to-pinyin' && (
            <PlayButton
              onPlay={() => onPlaySound?.(question.question)}
              size="md"
            />
          )}
        </div>
        <p className="text-sm text-gray-400">
          {question.type === 'pinyin-to-hanzi' ? '请选择对应的汉字' : '请选择正确的拼音'}
        </p>
      </div>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            className={`
              py-3 px-4 rounded-xl border-2 text-center text-lg font-medium
              transition-all duration-150
              ${revealed ? 'cursor-default' : 'cursor-pointer'}
              ${getOptionStyle(opt)}
            `}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* 反馈 */}
      {revealed && !isCorrectOption(selected) && (
        <div className="text-center mb-3">
          <p className="text-red-500 text-sm mb-1">
            ❌ 不对哦，正确答案是：
          </p>
          <p className="text-green-600 text-xl font-bold">
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
    </div>
  )
}