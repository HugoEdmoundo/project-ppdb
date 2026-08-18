const TOKEN_KEY = 'ppdb_token'
const REFRESH_KEY = 'ppdb_refresh'
const USER_KEY = 'ppdb_user'
export const PRIMARY_API = (import.meta.env.VITE_API_URL || 'https://project-ppdb-murex.vercel.app').replace(/\/+$/, '')
export const FALLBACK_API = 'https://project-ppdb-murex.vercel.app'
export const API_BASE = PRIMARY_API

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

let refreshPromise: Promise<string | null> | null = null

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY) }
export function getStoredUser() { try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null } catch { return null } }
export function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); localStorage.removeItem(USER_KEY) }

function setTokens(access: string, refresh: string) { localStorage.setItem(TOKEN_KEY, access); localStorage.setItem(REFRESH_KEY, refresh) }
function setUser(user: unknown) { localStorage.setItem(USER_KEY, JSON.stringify(user)) }

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const rt = localStorage.getItem(REFRESH_KEY); if (!rt) return null
    try {
      const res = await fetchWithFallback(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) })
      if (!res.ok) return null
      const data = await res.json(); const { access_token, refresh_token } = data.data || data
      setTokens(access_token, refresh_token); return access_token
    } catch { return null } finally { refreshPromise = null }
  })()
  return refreshPromise
}

export async function apiFetch<T>(endpoint: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers })
  if (res.status === 401 && token) {
    const newToken = await tryRefresh()
    if (newToken) { headers['Authorization'] = `Bearer ${newToken}`; res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers }) }
    if (res.status === 401) { clearAuth(); window.location.href = '/auth/login'; throw new Error('Unauthorized') }
  }
  if (!res.ok) { const body = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(body.detail || `API ${res.status}`) }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(username: string, password: string) {
  const data = await apiFetch<{ access_token: string; refresh_token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  setTokens(data.access_token, data.refresh_token); setUser(data.user); return data.user
}

export async function getMe() {
  const data = await apiFetch<any>('/auth/me'); setUser(data); return data
}

export async function logout() {
  try { const rt = localStorage.getItem(REFRESH_KEY); if (rt) await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: rt }) }) } catch (e) { void e }
  clearAuth()
}

export { setTokens, setUser }
