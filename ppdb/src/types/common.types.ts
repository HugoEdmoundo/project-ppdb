export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: string
  direction: SortDirection
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

export interface TableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type AlertType = 'info' | 'success' | 'warning' | 'error'
