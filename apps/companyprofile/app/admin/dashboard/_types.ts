import type { LucideIcon } from 'lucide-react'

export interface TabDef {
  key: string
  label: string
  endpoint: string
  fetch: () => Promise<unknown>
  icon: LucideIcon
}

export interface RowContent {
  title?: string
  name?: string
  [key: string]: unknown
}

export interface RowRecord {
  id?: string
  key?: string
  slug?: string
  category?: string
  date?: string
  role?: string
  year?: number
  name?: string
  child?: string
  order?: number
  label?: string
  href?: string
  path?: string
  phone_primary?: string
  phone_secondary?: string
  whatsapp?: string
  email_primary?: string
  email_admission?: string
  address?: string
  office_hours?: string
  icon?: string
  image?: string
  gallery?: unknown
  content?: RowContent | null
  [key: string]: unknown
}

export interface FormState {
  image?: string
  gallery?: string[]
  [key: string]: unknown
}

export interface AdminUser {
  id?: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  role_name?: string
  user_type?: string
  is_superadmin?: boolean
  permissions?: Record<string, string>
  page_permissions?: string[]
}

export function errorMessage(e: unknown, fallback = 'Terjadi kesalahan'): string {
  return e instanceof Error ? e.message : fallback
}
