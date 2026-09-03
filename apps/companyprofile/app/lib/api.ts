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
export const FALLBACK_API = 'http://localhost:8000'
export const API_BASE = PRIMARY_API
const TOKEN_KEY = 'admin_token'
const REFRESH_KEY = 'admin_refresh'
const USER_KEY = 'admin_user'

function isRetryableStatus(status: number): boolean {
  return status === 404 || status >= 500
}

async function fetchWithFallback(url: string, opts?: RequestInit): Promise<Response> {
  if (API_BASE === FALLBACK_API) return fetch(url, opts)

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
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    window.location.href = '/admin/login'
  }
}

let _pendingRefresh: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (_pendingRefresh) return _pendingRefresh
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null
  if (!refreshToken) return null
  _pendingRefresh = (async () => {
    try {
      const res = await fetchWithFallback(`${API_BASE}/companyprofile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return null
      const data = await res.json()
      localStorage.setItem(TOKEN_KEY, data.access_token)
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
      return data.access_token
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
  return res.json()
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
  })
  if (!res.ok) {
    const text = await res.text()
    let msg: string
    try { const j = JSON.parse(text); msg = j.detail || j.message || j.error || text } catch { msg = text }
    throw new Error(msg || 'Login failed')
  }
  const data = await res.json()
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  } else {
    try {
      const meRes = await fetchWithFallback(`${API_BASE}/companyprofile/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        localStorage.setItem(USER_KEY, JSON.stringify(me))
      }
    } catch {
      // Silent fail - user can still access with token
    }
  }
  return data as unknown as { access_token: string; refresh_token: string; token_type: string }
}

// ── Logout ────────────────────────────────────────────────────

export async function logout() {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  if (token) {
    try {
      await fetchWithFallback(`${API_BASE}/companyprofile/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Best-effort; proceed with local cleanup
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

// ── Mutations (protected) ───────────────────────────────────

async function fetchApiWithAuth<T>(endpoint: string, opts: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  let res = await fetchWithFallback(`${API_BASE}/companyprofile${endpoint}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string>),
    },
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}/companyprofile${endpoint}`, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(opts.headers as Record<string, string>),
        },
      })
      if (res.ok) {
        if (res.status === 204) return undefined as T
        return res.json()
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
  return res.json()
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
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers as Record<string, string>),
    },
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}${endpoint}`, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(opts?.headers as Record<string, string>),
        },
      })
      if (res.ok) {
        if (res.status === 204) return undefined as T
        return res.json()
      }
    }
    _redirectLogin()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.error || `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
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
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  const form = new FormData()
  form.append('file', file)
  let res = await fetchWithFallback(`${API_BASE}/companyprofile/upload`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      res = await fetchWithFallback(`${API_BASE}/companyprofile/upload`, {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${newToken}` },
      })
      if (res.ok) return (await res.json()).url as string
    }
    _redirectLogin(); throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  const data = await res.json()
  return data.url as string
}

export interface SiteSetting {
  key: string
  value: string
}

export async function getSettings(): Promise<SettingsItem[]> {
  return fetchApi<SettingsItem[]>('/settings')
}

export async function updateSetting(key: string, value: string) {
  return fetchApiWithAuth<SiteSetting>(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}
