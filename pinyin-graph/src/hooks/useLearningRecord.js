import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'pinyin-graph-learning-record'

/**
 * useLearningRecord — 学习记录（localStorage）
 *
 * 记录每次练习的成绩，按日期存储
 */
export default function useLearningRecord() {
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const cancelledRef = useRef(false)

  // 持久化
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch { /* ignore */ }
    return () => {
      cancelledRef.current = true
    }
  }, [records])

  // 添加一条记录
  const addRecord = useCallback((record) => {
    setRecords(prev => [{
      ...record,
      id: Date.now(),
      date: new Date().toISOString(),
    }, ...prev].slice(0, 200)) // 最多保留 200 条
  }, [])

  // 获取今日记录
  const todayRecords = useCallback(() => {
    const today = new Date().toDateString()
    return records.filter(r => new Date(r.date).toDateString() === today)
  }, [records])

  // 获取总统计
  const stats = {
    totalPractices: records.length,
    totalQuestions: records.reduce((s, r) => s + r.total, 0),
    totalCorrect: records.reduce((s, r) => s + r.score, 0),
    averageAccuracy: records.length > 0
      ? Math.round(records.reduce((s, r) => s + (r.score / r.total * 100), 0) / records.length)
      : 0,
  }

  return { records, addRecord, todayRecords, stats }
}