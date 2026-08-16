export interface User {
  id: string
  username: string
  email: string
  phone?: string
  full_name: string
  avatar_url: string
  role_id: string
  user_type: string
  is_active: boolean
  password_hash?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description: string
  is_superadmin: boolean
  is_system: boolean
  permissions: Record<string, string>
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  username: string
  email: string
  full_name: string
  avatar_url: string
  role_id: string
  role_name: string
  user_type: string
  is_active: boolean
  is_superadmin: boolean
  permissions: Record<string, string>
  page_permissions?: string[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

export type AccessLevel = 'none' | 'dashboard' | 'read' | 'crud'

export interface Module {
  id: string
  key: string
  name: string
  pages: Page[]
}

export interface Page {
  id: string
  key: string
  label: string
  icon: string
  sort_order: number
}

export interface UserPagePermissions {
  user_id: string
  page_ids: string[]
}

export const MODULE_LABELS: Record<string, string> = {
  companyprofile: 'Company Profile',
  ppdb: 'PPDB',
}

export const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Tidak bisa mengakses module ini' },
  { value: 'dashboard', label: 'Dashboard', description: 'Hanya bisa melihat dashboard' },
  { value: 'read', label: 'Read Only', description: 'Bisa melihat semua data' },
  { value: 'crud', label: 'Full CRUD', description: 'Bisa membuat, melihat, mengubah, dan menghapus' },
]
