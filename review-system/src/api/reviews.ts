import { apiRequest } from './client'
import type { Review, ReviewContent, ReviewApiResponse, ReviewsListResponse, ReviewCreateResponse, ReviewMode } from '@/types/review'

function toApiPayload(review: { id?: string; date: string; content: ReviewContent; summary: string }) {
  return {
    id: review.id,
    review_date: review.date,
    content: review.content,
    title: review.summary || review.date,
  }
}

function fromApiResponse(data: ReviewApiResponse): Review {
  let content: ReviewContent
  if (typeof data.content === 'string') {
    try {
      content = JSON.parse(data.content)
    } catch {
      content = { health: '', work: '', study: '', social: '', finance: '', life: '', spirit: '', leisure: '' }
    }
  } else if (data.content && typeof data.content === 'object') {
    content = data.content as ReviewContent
  } else {
    content = { health: '', work: '', study: '', social: '', finance: '', life: '', spirit: '', leisure: '' }
  }

  return {
    id: data.id,
    date: data.review_date || data.date || '',
    content,
    summary: data.title || data.summary || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    _source: 'cloud' as const,
  }
}

export async function getReviews(params?: { page?: number; pageSize?: number; startDate?: string; endDate?: string }): Promise<ReviewsListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  if (params?.startDate) query.set('startDate', params.startDate)
  if (params?.endDate) query.set('endDate', params.endDate)

  const qs = query.toString()
  return apiRequest<ReviewsListResponse>(`/api/reviews${qs ? '?' + qs : ''}`)
}

export async function createReview(review: { id?: string; date: string; content: ReviewContent; summary: string }): Promise<ReviewCreateResponse> {
  return apiRequest<ReviewCreateResponse>('/api/reviews', {
    method: 'POST',
    body: toApiPayload(review),
  })
}

export async function updateReview(id: string, review: { date: string; content: ReviewContent; summary: string }): Promise<ReviewCreateResponse> {
  return apiRequest<ReviewCreateResponse>(`/api/reviews/${id}`, {
    method: 'PUT',
    body: toApiPayload(review),
  })
}

export async function deleteReview(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/reviews/${id}`, { method: 'DELETE' })
}

export async function saveReview(review: { id?: string; date: string; content: ReviewContent; summary: string }, mode: ReviewMode = 'auto'): Promise<ReviewCreateResponse> {
  // 统一使用 POST，后端根据 id 和 date 判断创建还是更新
  return apiRequest<ReviewCreateResponse>('/api/reviews', {
    method: 'POST',
    body: toApiPayload(review),
  })
}

export { fromApiResponse }
