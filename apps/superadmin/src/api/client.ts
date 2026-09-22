import type { AuthUser, LoginResponse, User, Role, Module, UserPagePermissions } from '../types'

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function fetchWithFallback(url: string, opts?: RequestInit): Promise<Response> {
  const options = { ...opts, credentials: 'include' as RequestCredentials }
  return fetch(url, options)
}

/**
 * Parse JSON dengan aman. Kalau server mengembalikan HTML (mis. index.html
 * karena URL API nyasar ke dev server / proxy salah), lempar error yang
 * jelas alih-alih `Unexpected token '<'`.
 */
async function parseJsonSafe<T>(res: Response, label: string): Promise<T> {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `${label} mengembalikan non-JSON (status ${res.status}). ` +
        `Kemungkinan URL API salah atau backend tidak jalan. Cuplikan: ${text.slice(0, 120)}`
    )
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`${label} gagal dibaca sebagai JSON (status ${res.status}).`)
  }
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

/**
 * Ekstrak pesan error dari body FastAPI. `detail` bisa berupa string (mis.
 * "Incorrect username or password") atau array validasi 422 (list of
 * {loc, msg, type}). Kalau array, gabungkan `msg` per elemen.
 */
function extractErrorMessage(body: any, fallbackText: string): string {
  if (!body) return fallbackText
  const { detail } = body
  if (typeof detail === 'string' && detail.trim() !== '') return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item: any) => (item && typeof item.msg === 'string' ? item.msg : ''))
      .filter((m: string) => m !== '')
    if (msgs.length > 0) return msgs.join('; ')
  }
  return fallbackText
}

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      // FIX: Pakai /auth/refresh (endpoint generik), bukan /companyprofile/auth/refresh
      // yang adalah endpoint CMS companyprofile dan bisa tidak ada / berbeda.
      const res = await fetchWithFallback(`${API_BASE}/auth/refresh`, {
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
    // Simpan detail dari respon pertama: untuk login 401 artinya kredensial
    // salah / user tidak ada — tetap tampilkan pesan backend, bukan "Unauthorized".
    const firstBody = await parseJsonSafe<any>(res, `API ${endpoint}`).catch(() => ({
      detail: res.statusText,
    }))
    const firstMsg = extractErrorMessage(firstBody, `API ${res.status}`)

    let refreshed = false
    if (endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/auth/logout') {
      refreshed = await tryRefresh()
      if (refreshed) {
        res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })
      }
    }

    if (res.status === 401 || endpoint === '/auth/login') {
      clearAuth()
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
      throw new Error(firstMsg || 'Unauthorized')
    }
  }

  if (!res.ok) {
    const body = await parseJsonSafe<any>(res, `API ${endpoint}`).catch(() => ({ detail: res.statusText }))
    throw new Error(extractErrorMessage(body, `API ${res.status}`))
  }

  if (res.status === 204) return undefined as T
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

// ── Auth ──────────────────────────────────────────────────
//
// Superadmin panel pakai endpoint /auth/* (generik, tanpa module-access check).
// Jangan pakai /companyprofile/auth/* — endpoint itu punya check has_module_access
// yang bisa menolak superadmin jika konfigurasi permission tidak sempurna,
// dan refresh-nya menggunakan cookie yang berbeda.

export async function login(username: string, password: string): Promise<AuthUser> {
  const data: LoginResponse = await apiFetch('/auth/login', {
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
  const user = await apiFetch<AuthUser>('/auth/me')
  setStoredUser(user)
  return user
}

export async function logout() {
  try {
    await fetchWithFallback(`${API_BASE}/auth/logout`, {
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
  return apiFetch('/auth/profile', {
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

export async function getDashboardStats(): Promise<any> {
  return apiFetch('/superadmin/dashboard')
}

export async function getAuditLogs(params?: any): Promise<any> {
  const query = params ? '?' + new URLSearchParams(params) : ''
  return await apiFetch(`/superadmin/audit-logs${query}`)
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

// ── WhatsApp Service (via FastAPI proxy) ──────────────────────────────────
//
// SECURITY: WA microservice TIDAK dipanggil langsung dari browser.
// Semua WA calls diproxy lewat FastAPI (/notifications/wa/*) sehingga
// WA_API_KEY tidak pernah di-expose ke client-side.
// Hapus VITE_WA_URL dan VITE_WA_API_KEY dari .env superadmin.

export interface WASessionInfo {
  status: 'initializing' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'destroyed'
  phone?: string
  pushName?: string
  qrCode?: string
  connectedAt?: string
  lastActivity?: string
}

export interface WAQueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface WALogEntry {
  id: string
  event_key: string
  recipient_name: string
  recipient_phone: string
  channel: string
  body_sent: string
  status: 'queued' | 'sent' | 'failed' | 'invalid_number'
  retry_count: number
  error_message?: string
  wa_message_id?: string
  created_at: string
  sent_at?: string
}

export async function waGetSession(): Promise<{ success: boolean; data: WASessionInfo }> {
  return apiFetch('/notifications/wa/session')
}

export async function waInitSession(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/notifications/wa/session/init', { method: 'POST' })
}

export async function waLogoutSession(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/notifications/wa/session/logout', { method: 'POST' })
}

export async function waDestroySession(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/notifications/wa/session', { method: 'DELETE' })
}

export async function waGetQrImage(): Promise<{ success: boolean; data: { qrCode: string } }> {
  return apiFetch('/notifications/wa/session/qr')
}

export async function waGetQueueStats(): Promise<{ success: boolean; data: WAQueueStats }> {
  return apiFetch('/notifications/wa/queue')
}

export async function waGetLogs(params?: {
  page?: number
  perPage?: number
  status?: string
}): Promise<{ success: boolean; data: WALogEntry[]; total: number; totalPages: number }> {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.perPage) q.set('perPage', String(params.perPage))
  if (params?.status) q.set('status', params.status)
  return apiFetch(`/notifications/wa/logs${q.toString() ? '?' + q : ''}`)
}

export async function waGetHealth(): Promise<any> {
  return apiFetch('/notifications/status')
}

/**
 * SSE stream untuk QR code realtime — pakai FastAPI sebagai proxy SSE.
 * Karena FastAPI belum ada endpoint SSE proxy untuk WA, gunakan polling
 * waGetQrImage() tiap 3 detik sampai status ready/disconnected.
 * @deprecated Gunakan polling waGetQrImage() + waGetSession() sebagai gantinya.
 */
export function waGetQrSseUrl(): string {
  // Tidak bisa proxy SSE via apiFetch (streaming). Gunakan polling instead.
  // Lihat WhatsAppPage.tsx untuk implementasi polling.
  return ''
}
