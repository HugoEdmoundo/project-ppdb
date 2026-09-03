import type { AuthUser, LoginResponse, User, Role, Module, UserPagePermissions } from '../types'

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function fetchWithFallback(url: string, opts?: RequestInit): Promise<Response> {
  const options = { ...opts, credentials: 'include' as RequestCredentials }
  return fetch(url, options)
}

const USER_KEY = 'sa_user'

function clearAuth() {
  localStorage.removeItem(USER_KEY)
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const res = await fetchWithFallback(`${API_BASE}/companyprofile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) return false
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function apiFetch<T>(endpoint: string, opts: RequestInit = {}): Promise<T> {
  const isFormData = opts.body instanceof FormData
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  }
  if (!isFormData) headers['Content-Type'] = 'application/json'

  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })
    }
    if (res.status === 401) {
      clearAuth()
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
      throw new Error('Unauthorized')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `API ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthUser> {
  const data: LoginResponse = await apiFetch('/companyprofile/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  if (data.user && data.user.user_type !== 'superadmin' && !data.user.is_superadmin) {
    throw new Error('Akses ditolak. Hanya superadmin yang diizinkan.')
  }

  if (data.user) {
    setStoredUser(data.user)
    return data.user
  }
  throw new Error('Invalid login response')
}

export async function getMe(): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>('/companyprofile/auth/me')
  setStoredUser(user)
  return user
}

export async function logout() {
  try {
    await fetchWithFallback(`${API_BASE}/companyprofile/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({})
    })
  } catch { /* best effort */ }
  clearAuth()
}

export async function updateProfile(data: {
  username?: string
  email?: string
  full_name?: string
  avatar_url?: string
  old_password?: string
  new_password?: string
}): Promise<unknown> {
  return apiFetch('/companyprofile/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function uploadAvatar(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const data = await apiFetch<{ url: string }>('/companyprofile/upload', {
    method: 'POST',
    body: fd,
  })
  return data.url
}

// ── Users ─────────────────────────────────────────────────

export async function getUsers(params?: { search?: string; page?: number; per_page?: number }): Promise<User[] | { data: User[]; total: number }> {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.page) q.set('page', String(params.page))
  if (params?.per_page) q.set('per_page', String(params.per_page))
  const qs = q.toString()
  return apiFetch(`/users${qs ? '?' + qs : ''}`)
}

export async function getUser(id: string): Promise<User> {
  return apiFetch(`/users/${id}`)
}

export async function createUser(data: {
  username: string
  email?: string
  phone?: string
  full_name?: string
  password: string
  role_id?: string
  user_type?: string
}): Promise<User> {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: {
  username?: string
  email?: string
  phone?: string
  full_name?: string
  password?: string
  role_id?: string
  user_type?: string
  is_active?: boolean
}): Promise<User> {
  return apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/users/${id}`, { method: 'DELETE' })
}

// ── Roles ─────────────────────────────────────────────────

function parsePermissions(role: any): Role {
  if (role && typeof role.permissions === 'string') {
    try {
      role.permissions = JSON.parse(role.permissions)
    } catch {
      role.permissions = {}
    }
  }
  return role as Role
}

export async function getRoles(): Promise<Role[]> {
  const data = await apiFetch<any[]>('/roles')
  return data.map(parsePermissions)
}

export async function getRole(id: string): Promise<Role> {
  const data = await apiFetch<any>(`/roles/${id}`)
  return parsePermissions(data)
}

export async function createRole(data: {
  name: string
  description?: string
  permissions?: Record<string, string>
  is_superadmin?: boolean
}): Promise<Role> {
  return apiFetch('/roles', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateRole(id: string, data: {
  name?: string
  description?: string
  permissions?: Record<string, string>
  is_superadmin?: boolean
}): Promise<Role> {
  return apiFetch(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/roles/${id}`, { method: 'DELETE' })
}

export async function getDashboardStats(): Promise<{ total_users: number; total_roles: number }> {
  return apiFetch('/superadmin/dashboard')
}

// ── Settings ──────────────────────────────────────────────

export async function getSettings(): Promise<{ key: string; value: string }[]> {
  return apiFetch('/companyprofile/settings')
}

// ── Modules & Page Permissions ─────────────────────────────

export async function getModules(): Promise<Module[]> {
  return apiFetch('/modules')
}

export async function getUserPagePermissions(userId: string): Promise<UserPagePermissions> {
  return apiFetch(`/users/${userId}/page-permissions`)
}

export async function updateUserPagePermissions(id: string, page_ids: string[]) {
  return await apiFetch(`/users/${id}/page-permissions`, {
    method: 'PUT',
    body: JSON.stringify({ page_ids }),
  })
}

export async function getApplicants(params?: any): Promise<any> {
  const query = params ? '?' + new URLSearchParams(params) : ''
  return await apiFetch(`/ppdb/applicants${query}`)
}

// ── Notifications (custom send / logs) ─────────────────────

export async function resetApplicantPassword(id: string, password: string): Promise<any> {
  return await apiFetch(`/ppdb/applicants/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}

export async function sendCustomNotification(body: {
  recipient_user_ids: string[]
  channel: string
  subject: string
  body: string
}): Promise<any> {
  return await apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getNotificationLogs(params?: any): Promise<any> {
  const query = params ? '?' + new URLSearchParams(params) : ''
  return await apiFetch(`/notifications/logs${query}`)
}

// ── Helpers ───────────────────────────────────────────────

export { getStoredUser, clearAuth, apiFetch }
