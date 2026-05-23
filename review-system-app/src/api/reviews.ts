import { apiRequest } from './client'
import type { Review, ReviewContent } from '@/types/review'

interface GetReviewsParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}

interface ReviewsListResponse {
  success: boolean
  data: Review[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

interface ReviewResponse {
  success: boolean
  message: string
  data: Review
}

function toApiPayload(review: Partial<Review>) {
  return {
    id: review.id,
    review_date: review.date,
    title: review.summary || review.date,
    content: review.content,
  }
}

function fromApiResponse(data: Record<string, unknown>): Review {
  return {
    id: data.id as string,
    date: (data.review_date || data.date) as string,
    title: (data.title || '') as string,
    content: typeof data.content === 'string'
      ? JSON.parse(data.content)
      : (data.content as ReviewContent) || {} as ReviewContent,
    summary: (data.title || '') as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function getReviews(params?: GetReviewsParams): Promise<ReviewsListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)

  const query = searchParams.toString()
  const endpoint = `/api/reviews${query ? `?${query}` : ''}`

  const raw = await apiRequest<{ success: boolean; data: Record<string, unknown>[]; pagination: ReviewsListResponse['pagination'] }>(endpoint)
  return {
    ...raw,
    data: raw.data.map(fromApiResponse),
  }
}

export async function createReview(review: Partial<Review>): Promise<ReviewResponse> {
  const raw = await apiRequest<ReviewResponse>('/api/reviews', {
    method: 'POST',
    body: toApiPayload(review),
  })
  return { ...raw, data: fromApiResponse(raw.data as unknown as Record<string, unknown>) }
}

export async function updateReview(id: string, review: Partial<Review>): Promise<ReviewResponse> {
  const raw = await apiRequest<ReviewResponse>(`/api/reviews/${id}`, {
    method: 'PUT',
    body: toApiPayload(review),
  })
  return { ...raw, data: fromApiResponse(raw.data as unknown as Record<string, unknown>) }
}

export async function deleteReview(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/reviews/${id}`, { method: 'DELETE' })
}

export async function syncReviews(reviews: Review[]): Promise<ReviewsListResponse> {
  const raw = await apiRequest<{ success: boolean; data: Record<string, unknown>[]; synced: number }>('/api/reviews/sync', {
    method: 'POST',
    body: { reviews: reviews.map(r => toApiPayload(r)) },
  })
  return {
    success: raw.success,
    data: raw.data.map(fromApiResponse),
    pagination: { page: 1, pageSize: raw.data.length, total: raw.data.length, totalPages: 1 },
  }
}
