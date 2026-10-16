const USER_KEY = 'ppdb_user'

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

// ── Dummy auth (dev-only) ────────────────────────────────────
// Aktifkan lewat VITE_MOCK_AUTH=true di .env lokal saat backend/DB belum bisa
// dipakai. Login tidak menghubungi server: sesi `ppdb_user` diisi user dummy.
// Username yang mengandung "pendaftar"/"applicant"/"siswa" memberi user
// bertipe applicant (agar portal pendaftar bisa dibuka); selain itu admin.
// Wajib `false` di produksi (default mati).
export const MOCK_AUTH = (import.meta.env.VITE_MOCK_AUTH || '').trim().toLowerCase() === 'true'

const APPLICANT_HINT = /pendaftar|applicant|siswa|murid/i

export function buildMockUser(username = 'admin') {
  if (APPLICANT_HINT.test(username)) {
    return {
      id: 'mock-applicant-0001',
      username: username || 'pendaftar',
      email: 'pendaftar@localhost',
      full_name: 'Pendaftar (Dummy)',
      role_id: 'mock-role-applicant',
      role_name: 'Pendaftar',
      user_type: 'applicant',
      is_active: true,
      avatar_url: '',
      permissions: { ppdb: 'read' },
      is_superadmin: false,
      page_permissions: [] as string[],
      payment_status: 'paid',
      payment_deadline: '',
    }
  }
  return {
    id: 'mock-admin-0001',
    username: username || 'admin',
    email: 'admin@localhost',
    full_name: 'Admin PPDB (Dummy)',
    role_id: 'mock-role-superadmin',
    role_name: 'Superadmin',
    user_type: 'superadmin',
    is_active: true,
    avatar_url: '',
    permissions: { ppdb: 'crud', companyprofile: 'crud' },
    is_superadmin: true,
    page_permissions: [] as string[],
  }
}

/** Sesi dummy yang cocok dengan hint peran, atau buat+simpan baru. */
export function getMockUser(username = 'admin') {
  const wantApplicant = APPLICANT_HINT.test(username)
  const stored = getStoredUser()
  if (stored && (stored.user_type === 'applicant') === wantApplicant) return stored
  const user = buildMockUser(username)
  setUser(user)
  return user
}
/**
 * Error HTTP dengan status code. Tetap turunan `Error` sehingga kode yang
 * membaca `err.message` tidak terpengaruh; `status` dipakai untuk membedakan
 * penolakan pasti (4xx) dari respons tidak pasti (5xx).
 */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

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

let refreshPromise: Promise<boolean> | null = null

export function getStoredUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null } catch { return null } }
export function clearAuth() { localStorage.removeItem(USER_KEY) }
export function setUser(user: unknown) { localStorage.setItem(USER_KEY, JSON.stringify(user)) }

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetchWithFallback(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-App': 'ppdb' }, body: JSON.stringify({}) })
      if (!res.ok) return false
      return true
    } catch { return false } finally { refreshPromise = null }
  })()
  return refreshPromise
}

export async function apiFetch<T>(endpoint: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })
  if (res.status === 401) {
    // Simpan detail respon pertama: untuk login 401 artinya kredensial salah
    // atau akun tidak ada — tampilkan pesan backend, bukan "Unauthorized".
    const firstBody = await parseJsonSafe<Record<string, string>>(res, `API ${endpoint}`).catch(() => ({ detail: res.statusText }))
    const firstMsg = firstBody?.detail || `API ${res.status}`

    const refreshed = await tryRefresh()
    if (refreshed) { res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers }) }
    if (res.status === 401) {
      clearAuth();
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
      throw new Error(firstMsg)
    }
  }
  if (!res.ok) { const body = await parseJsonSafe<Record<string, string>>(res, `API ${endpoint}`).catch(() => ({ detail: res.statusText })); throw new ApiError(body.detail || `API ${res.status}`, res.status) }
  if (res.status === 204) return undefined as T
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

export async function apiFetchBlob(endpoint: string, opts: RequestInit = {}): Promise<Blob> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) { res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers }) }
    if (res.status === 401) {
      clearAuth()
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
      throw new Error('Unauthorized')
    }
  }
  if (!res.ok) {
    const body = await parseJsonSafe<Record<string, string>>(res, `API ${endpoint}`).catch(() => ({ detail: res.statusText }))
    throw new ApiError(body.detail || `API ${res.status}`, res.status)
  }
  return res.blob()
}

export async function login(username: string, password: string) {
  if (MOCK_AUTH) {
    const user = buildMockUser(username)
    setUser(user)
    return user
  }
  const data = await apiFetch<{ user: any }>('/auth/login', { method: 'POST', headers: { 'X-Client-App': 'ppdb' }, body: JSON.stringify({ username, password }) })
  if (data.user) {
    setUser(data.user); return data.user
  }
  return data
}

export async function getMe() {
  if (MOCK_AUTH) {
    const stored = getStoredUser()
    if (stored) return stored
    const user = buildMockUser('admin')
    setUser(user)
    return user
  }
  const data = await apiFetch<any>('/auth/me'); setUser(data); return data
}

export async function logout() {
  try { await fetchWithFallback(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-App': 'ppdb' }, body: JSON.stringify({}) }) } catch (e) { void e }
  clearAuth()
}
