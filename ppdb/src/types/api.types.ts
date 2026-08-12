export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiPaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiPaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: ApiPaginatedMeta
}

export interface ApiErrorResponse {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
}
