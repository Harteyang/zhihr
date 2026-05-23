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
  title: string
  content: ReviewContent
  summary: string
  createdAt: string
  updatedAt: string
}

export interface ReviewApiResponse {
  id: string
  date: string
  title: string
  content: ReviewContent | null
  createdAt: string
  updatedAt: string
}
