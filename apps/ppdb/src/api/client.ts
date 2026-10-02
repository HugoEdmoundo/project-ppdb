const USER_KEY = 'ppdb_user'

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

let refreshPromise: Promise<boolean> | null = null

export function getStoredUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null } catch { return null } }
export function clearAuth() { localStorage.removeItem(USER_KEY) }
export function setUser(user: unknown) { localStorage.setItem(USER_KEY, JSON.stringify(user)) }

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetchWithFallback(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
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
  if (!res.ok) { const body = await parseJsonSafe<Record<string, string>>(res, `API ${endpoint}`).catch(() => ({ detail: res.statusText })); throw new Error(body.detail || `API ${res.status}`) }
  if (res.status === 204) return undefined as T
  return parseJsonSafe<T>(res, `API ${endpoint}`)
}

export async function login(username: string, password: string) {
  const data = await apiFetch<{ user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (data.user) {
    setUser(data.user); return data.user
  }
  return data
}

export async function getMe() {
  const data = await apiFetch<any>('/auth/me'); setUser(data); return data
}

export async function logout() {
  try { await fetchWithFallback(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }) } catch (e) { void e }
  clearAuth()
}
