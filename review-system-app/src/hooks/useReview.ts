import { useState, useEffect } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { getTodayString } from '@/lib/dimensions'
import type { ReviewContent } from '@/types/review'

const EMPTY_CONTENT: ReviewContent = {
  health: '',
  work: '',
  study: '',
  social: '',
  finance: '',
  life: '',
  spirit: '',
  leisure: '',
}

export function useReview() {
  const today = getTodayString()
  const reviews = useReviewsStore(s => s.reviews)
  const saveRecord = useReviewsStore(s => s.saveRecord)
  const todayRecord = reviews.find(r => r.date === today)

  const [content, setContent] = useState<ReviewContent>(EMPTY_CONTENT)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (todayRecord) {
      setContent(todayRecord.content || EMPTY_CONTENT)
      setSummary(todayRecord.summary || '')
    } else {
      setContent(EMPTY_CONTENT)
      setSummary('')
    }
  }, [todayRecord?.id])

  const save = async () => {
    await saveRecord(today, content, summary)
  }

  const reset = () => {
    setContent(EMPTY_CONTENT)
    setSummary('')
  }

  return { today, content, setContent, summary, setSummary, save, reset, todayRecord }
}
