import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AuthUser } from '../types'
import * as api from '../api/client'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthContext not initialized') },
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => api.getStoredUser())
  // loading hanya true jika ada sesi tersimpan yang perlu divalidasi ke backend.
  // Tanpa sesi tersimpan, langsung false agar ProtectedRoute redirect ke /auth/login.
  const [loading, setLoading] = useState(() => !!api.getStoredUser())

  useEffect(() => {
    if (!api.getStoredUser()) return
    // Validate token in background
    api.getMe().then((u) => setUser(u)).catch(() => {
      setUser(null)
    }).finally(() => setLoading(false))

    // Revalidasi berkala: akun yang dinonaktifkan (is_active=false) atau token
    // yang di-revoke saat sesi berjalan akan segera di-kick ke /auth/login.
    const interval = window.setInterval(() => {
      api.getMe().then((u) => setUser(u)).catch(() => {
        setUser(null)
        window.location.href = '/auth/login'
      })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe()
      setUser(u)
    } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
