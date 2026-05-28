export interface StructuredData {
  [itemId: string]: string
}

export interface DimensionData {
  structured: StructuredData
  freeform: string
}

export interface ReviewContent {
  health: string | DimensionData
  work: string | DimensionData
  study: string | DimensionData
  social: string | DimensionData
  finance: string | DimensionData
  life: string | DimensionData
  spirit: string | DimensionData
  leisure: string | DimensionData
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

export type ReviewMode = 'auto' | 'new' | 'overwrite' | 'merge'

export function isDimensionData(value: string | DimensionData | undefined): value is DimensionData {
  if (!value) return false
  if (typeof value === 'string') return false
  return 'structured' in value && 'freeform' in value
}

export function parseDimensionValue(value: string | DimensionData | undefined): DimensionData {
  if (!value) {
    return { structured: {}, freeform: '' }
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && 'structured' in parsed && 'freeform' in parsed) {
        return parsed as DimensionData
      }
    } catch {
      return { structured: {}, freeform: value }
    }
  }
  return value as DimensionData
}

export function formatDimensionValue(data: DimensionData): string {
  return JSON.stringify(data)
}

export function getEmptyDimensionData(): DimensionData {
  return { structured: {}, freeform: '' }
}
