import { useState, useCallback, useMemo, useRef } from 'react'
import { filterBy } from '../data/pinyin'
import { generateMixedQuestions, generatePinyinToHanziQuestions, generateHanziToPinyinQuestions } from '../utils/quiz-utils'

/**
 * usePinyinQuiz — 出题与答题状态管理
 *
 * @param {object} options
 * @param {Array} options.pool - 数据池
 * @param {string} options.mode - 'choice' | 'pinyin-to-hanzi' | 'hanzi-to-pinyin'
 * @param {number} options.questionCount - 题目数量
 * @param {object} options.filter - 筛选条件 { shengmu, shengdiao }
 */
export default function usePinyinQuiz(options = {}) {
  const {
    pool: defaultPool = [],
    mode: initialMode = 'choice',
    questionCount = 10,
    filter: initialFilter = {},
  } = options

  const [mode, setMode] = useState(initialMode)
  const [filter, setFilter] = useState(initialFilter)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [startTime] = useState(Date.now())
  const questionsRef = useRef(null)

  // 当前数据池（应用筛选后）
  const pool = useMemo(() => {
    if (Object.keys(filter).length === 0) return defaultPool
    return filterBy(filter)
  }, [defaultPool, filter])

  // 开始练习
  const start = useCallback((modeOverride, filterOverride) => {
    const m = modeOverride || mode
    const f = filterOverride || filter
    const activePool = Object.keys(f).length > 0 ? filterBy(f) : defaultPool

    if (activePool.length === 0) return

    let qs
    if (m === 'choice') {
      qs = generateMixedQuestions(activePool, questionCount)
    } else if (m === 'pinyin-to-hanzi') {
      qs = generatePinyinToHanziQuestions(activePool, questionCount)
    } else {
      qs = generateHanziToPinyinQuestions(activePool, questionCount)
    }

    questionsRef.current = qs
    setQuestions(qs)
    setCurrentIndex(0)
    setScore(0)
    setTotalAnswered(0)
    setIsFinished(false)
    setWrongAnswers([])
    if (m !== mode) setMode(m)
    if (JSON.stringify(f) !== JSON.stringify(filter)) setFilter(f)
  }, [defaultPool, mode, filter, questionCount])

  // 回答问题
  const answer = useCallback((selectedAnswer) => {
    if (isFinished) return { correct: false }
    const current = questionsRef.current?.[currentIndex]
    if (!current) return { correct: false }

    const correct = selectedAnswer === current.correctAnswer
    const newTotal = totalAnswered + 1
    const newScore = score + (correct ? 1 : 0)
    const newWrong = correct ? wrongAnswers : [...wrongAnswers, {
      question: current.question,
      correctAnswer: current.correctAnswer,
      userAnswer: selectedAnswer,
      data: current.data,
    }]

    setScore(newScore)
    setTotalAnswered(newTotal)
    setWrongAnswers(newWrong)

    const finished = newTotal >= questions.length
    if (finished) {
      setIsFinished(true)
    }

    return { correct, finished, nextIndex: currentIndex + 1 }
  }, [isFinished, currentIndex, totalAnswered, score, wrongAnswers, questions.length])

  // 下一题
  const next = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }, [currentIndex, questions.length])

  // 结果
  const result = useMemo(() => {
    if (!isFinished) return null
    return {
      score,
      total: questions.length,
      wrongAnswers,
      duration: Math.round((Date.now() - startTime) / 1000),
      percentage: Math.round((score / questions.length) * 100),
    }
  }, [isFinished, score, questions.length, wrongAnswers, startTime])

  // 当前题目
  const currentQuestion = questions[currentIndex] || null

  return {
    // 状态
    mode,
    filter,
    questions,
    currentIndex,
    currentQuestion,
    score,
    totalAnswered,
    isFinished,
    result,
    wrongAnswers,
    pool,
    // 操作方法
    start,
    answer,
    next,
    setMode,
    setFilter,
  }
}