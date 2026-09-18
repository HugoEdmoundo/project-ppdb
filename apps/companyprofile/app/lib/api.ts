import { cache } from 'react'

import type {
  Achievement,
  ContactInfo,
  Facility,
  GalleryItem,
  NewsArticle,
  Program,
  SettingsItem,
  SocialLink,
  Staff,
  Testimonial,
} from './types'

export const PRIMARY_API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
// Fallback API opsional (mis. darurat ke server kedua). Kosongkan untuk
// menonaktifkan mekanisme fallback; JANGAN fallback ke localhost di produksi.
export const FALLBACK_API = (process.env.NEXT_PUBLIC_FALLBACK_API_URL || '').replace(/\/+$/, '')
export const API_BASE = PRIMARY_API
const USER_KEY = 'admin_user'

function isRetryableStatus(status: number): boolean {
  // Hanya 5xx yang boleh fallback. 404 berarti "tidak ada" — fallback ke
  // server lain hanya menyia-nyiakan request dan menutupi error asli.
  return status >= 500
}

async function fetchWithFallback(url: string, opts?: RequestInit): Promise<Response> {
  if (!FALLBACK_API || API_BASE === FALLBACK_API) return fetch(url, opts)

  const fallbackUrl = url.replace(PRIMARY_API, FALLBACK_API)

  let res: Response
  try {
    const signal = opts?.body ? undefined : AbortSignal.timeout(3000)
    res = await fetch(url, signal ? { ...opts, signal } : opts)
  } catch {
    // API lokal tidak terjangkau atau timeout -> coba API produksi
    return fetch(fallbackUrl, opts)
  }

  if (isRetryableStatus(res.status)) {
    try {
      return await fetch(fallbackUrl, opts)
    } catch {
      return res
    }
  }
  return res
}

function _redirectLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY)
    window.location.href = '/auth/login'
  }
}

/**
 * Parse JSON dengan aman. Kalau server mengembalikan HTML (mis. halaman
 * error Next / URL API salah), lempar error yang jelas alih-alih
 * `Unexpected token '<'`.
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

let _pendingRefresh: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (_pendingRefresh) return _pendingRefresh
  _pendingRefresh = (async () => {
    try {
      const res = await fetchWithFallback(`${API_BASE}/companyprofile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include' as RequestCredentials,
      })
      if (!res.ok) return null
      const data = await parseJsonSafe<{ access_token: string }>(res, 'Auth refresh')
      return data.access_token as string
    } catch {
      return null
    } finally {
      _pendingRefresh = null
    }
  })()
  return _pendingRefresh
}

async function fetchApi<T>(endpoint: string, opts?: RequestInit): Promise<T> {
  const res = await fetchWithFallback(`${API_BASE}/companyprofile${endpoint}`, {
    cache: 'no-store',
    ...opts,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

export async function safeFetch<T>(endpoint: string, fallback?: T): Promise<T> {
  try { return await fetchApi<T>('/' + endpoint) }
  catch { return (fallback ?? []) as T }
}

type JsonValue = Record<string, unknown>

function mapContent(data: JsonValue | null): JsonValue | null {
  if (!data) return data
  let content = data.content
  if (typeof content === 'string') {
    try { content = JSON.parse(content) } catch { content = null }
  }
  let gallery = data.gallery
  if (typeof gallery === 'string') {
    try { gallery = JSON.parse(gallery) } catch { gallery = null }
  }
  return { ...data, content: content ?? null, gallery: gallery ?? null }
}

export async function getNews(): Promise<NewsArticle[]> {
  const items = await fetchApi<JsonValue[]>('/news')
  return items.map((item) => mapContent(item) as unknown as NewsArticle)
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle> {
  const item = await fetchApi<JsonValue>(`/news/${slug}`)
  return mapContent(item) as unknown as NewsArticle
}

export async function getPrograms(): Promise<Program[]> {
  const items = await fetchApi<JsonValue[]>('/programs')
  return items.map((item) => mapContent(item) as unknown as Program)
}

// Dedupe fetch dalam satu alur render (React `cache`): `generateMetadata` dan
// page memanggil getNews/getPrograms → tanpa wrapper ini terjadi double-fetch.
export const getNewsCached = cache(getNews)
export const getProgramsCached = cache(getPrograms)

export async function getProgramBySlug(slug: string): Promise<Program> {
  const item = await fetchApi<JsonValue>(`/programs/${slug}`)
  return mapContent(item) as unknown as Program
}

export async function getFacilities(): Promise<Facility[]> {
  const items = await fetchApi<JsonValue[]>('/facilities')
  return items.map((item) => mapContent(item) as unknown as Facility)
}

export async function getStaff(): Promise<Staff[]> {
  const items = await fetchApi<JsonValue[]>('/staff')
  return items.map((item) => mapContent(item) as unknown as Staff)
}

// ── Auth ────────────────────────────────────────────────────

export async function login(username: string, password: string) {
  const res = await fetchWithFallback(`${API_BASE}/companyprofile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include' as RequestCredentials,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg: string
    try { const j = JSON.parse(text); msg = j.detail || j.message || j.error || text } catch { msg = text }
    throw new Error(msg || 'Login failed')
  }
  const data = await parseJsonSafe<{ user?: unknown }>(res, 'Login')
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }
  return data as unknown as { access_token: string; refresh_token: string; token_type: string }
}

// ── Logout ────────────────────────────────────────────────────

export async function logout() {
  try {
    await fetchWithFallback(`${API_BASE}/companyprofile/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({}),
      credentials: 'include' as RequestCredentials,
    })
  } catch {
    // Best-effort; proceed with local cleanup
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY)
  }
}

// ── Mutations (protected) ───────────────────────────────────

async function fetchApiWithAuth<T>(endpoint: string, opts: RequestInit): Promise<T> {
  let res = await fetchWithFallback(`${API_BASE}/companyprofile${endpoint}`, {
    ...opts,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string>),
    },
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}/companyprofile${endpoint}`, {
        ...opts,
        credentials: 'include' as RequestCredentials,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.headers as Record<string, string>),
        },
      })
      if (res.ok) {
        if (res.status === 204) return undefined as T
        return parseJsonSafe<T>(res, `API ${endpoint}`)
      }
    }
    _redirectLogin()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text()
    let msg: string
    try { const j = JSON.parse(body); msg = j.detail || j.message || j.error || body } catch { msg = body }
    throw new Error(msg || `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

export async function createItem(endpoint: string, data: JsonValue) {
  return fetchApiWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateItem(endpoint: string, data: JsonValue) {
  return fetchApiWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteItem(endpoint: string) {
  return fetchApiWithAuth(endpoint, { method: 'DELETE' })
}

export async function getAchievements(): Promise<Achievement[]> {
  const items = await fetchApi<JsonValue[]>('/achievements')
  return items.map((item) => mapContent(item) as unknown as Achievement)
}

export async function getGallery(): Promise<GalleryItem[]> {
  const items = await fetchApi<JsonValue[]>('/gallery')
  return items.map((item) => mapContent(item) as unknown as GalleryItem)
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const items = await fetchApi<JsonValue[]>('/testimonials')
  return items.map((item) => mapContent(item) as unknown as Testimonial)
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  return fetchApi<JsonValue[]>('/social-links').then(
    (items) => items as unknown as SocialLink[]
  )
}

// Paginated variant used by the admin dashboard list views. Each page holds up
// to `perPage` rows; the backend applies the same `mapContent` normalization.
const ADMIN_PAGE_SIZE = 25

export async function getEntityPage(
  endpoint: string,
  page: number,
  perPage: number = ADMIN_PAGE_SIZE
): Promise<JsonValue[]> {
  const skip = (page - 1) * perPage
  const clean = endpoint.replace(/^\/+/, '')
  const items = await fetchApi<JsonValue[]>(
    `/${clean}?skip=${skip}&limit=${perPage}`
  )
  return items.map((item) => mapContent(item) as JsonValue)
}

export async function getContactInfo(): Promise<ContactInfo | null> {
  const item = await fetchApi<JsonValue | null>('/contact-info')
  return (item ?? null) as unknown as ContactInfo | null
}

export async function updateContactInfo(data: JsonValue) {
  return fetchApiWithAuth<JsonValue>('/contact-info', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

async function fetchAuthApi<T>(endpoint: string, opts?: RequestInit): Promise<T> {
  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, {
    ...opts,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers as Record<string, string>),
    },
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}${endpoint}`, {
        ...opts,
        credentials: 'include' as RequestCredentials,
        headers: {
          'Content-Type': 'application/json',
          ...(opts?.headers as Record<string, string>),
        },
      })
      if (res.ok) {
        if (res.status === 204) return undefined as T
        return parseJsonSafe<T>(res, `API ${endpoint}`)
      }
    }
    _redirectLogin()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = `API ${res.status}`
    try {
      const body = JSON.parse(text)
      msg = body.detail || body.error || msg
    } catch { if (text) msg = text.slice(0, 200) }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

export async function getMe() {
  return fetchAuthApi<{
    id: string; username: string; email: string; full_name: string
    avatar_url: string; user_type: string; is_active: boolean
    role_id: string; role_name: string; is_superadmin: boolean
    permissions: Record<string, string>
    page_permissions: string[]
  }>('/companyprofile/auth/me')
}

export async function updateProfile(data: {
  username?: string; email?: string; full_name?: string; avatar_url?: string
  old_password?: string; new_password?: string
}) {
  return fetchAuthApi<JsonValue>('/companyprofile/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
}

export async function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  let res = await fetchWithFallback(`${API_BASE}/companyprofile/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include' as RequestCredentials,
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}/companyprofile/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include' as RequestCredentials,
      })
      if (res.ok) return (await parseJsonSafe<{ url: string }>(res, 'Upload')).url as string
    }
    _redirectLogin(); throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const data = await parseJsonSafe<{ url: string }>(res, 'Upload')
  return data.url as string
}

export interface SiteSetting {
  key: string
  value: string
}

export async function getSettings(): Promise<SettingsItem[]> {
  return fetchApi<SettingsItem[]>('/settings')
}

export async function getAdminSettings(): Promise<SettingsItem[]> {
  return fetchApiWithAuth<SettingsItem[]>('/settings-admin', { method: 'GET' })
}

export async function updateSetting(key: string, value: string) {
  return fetchApiWithAuth<SiteSetting>(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}
