export interface ReviewContent {
  health: string
  work: string
  study: string
  social: string
  finance: string
  life: string
  spirit: string
  leisure: string
}

export interface Review {
  id: string
  date: string
  content: ReviewContent
  summary: string
  createdAt: string
  updatedAt: string
  _source?: 'local' | 'cloud'
}

export interface ReviewApiResponse {
  id: string
  date: string
  review_date?: string
  title: string
  content: string | ReviewContent | null
  summary?: string
  created_at: string
  updated_at: string
}

export interface ReviewsListResponse {
  success: boolean
  data: ReviewApiResponse[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ReviewCreateResponse {
  success: boolean
  message: string
  data: ReviewApiResponse
}

export type ReviewMode = 'auto' | 'new' | 'overwrite'
