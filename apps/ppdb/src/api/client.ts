const USER_KEY = 'ppdb_user'

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function fetchWithFallback(url: string, opts?: RequestInit): Promise<Response> {
  const options = { ...opts, credentials: 'include' as RequestCredentials }
  return fetch(url, options)
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
    const refreshed = await tryRefresh()
    if (refreshed) { res = await fetchWithFallback(`${API_BASE}${endpoint}`, { ...opts, headers }) }
    if (res.status === 401) {
      clearAuth();
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
      throw new Error('Unauthorized')
    }
  }
  if (!res.ok) { const body = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(body.detail || `API ${res.status}`) }
  if (res.status === 204) return undefined as T
  return res.json()
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
  try { await fetchWithFallback(`${API_BASE}/auth/logout`, { method: 'POST', body: JSON.stringify({}) }) } catch (e) { void e }
  clearAuth()
}
