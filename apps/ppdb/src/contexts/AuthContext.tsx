import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import * as api from '@/api/client'

export interface AuthUser {
  id: string; username: string; email: string; full_name: string; role_id: string; role_name?: string; user_type: string; is_active: boolean
  avatar_url?: string
  permissions: Record<string, string>
  is_superadmin: boolean
  page_permissions: string[]
  payment_status?: string
  payment_deadline?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, login: async () => {}, logout: async () => {}, refreshUser: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => api.getStoredUser())
  // loading hanya true jika ada sesi tersimpan yang perlu divalidasi ke backend.
  const [loading, setLoading] = useState(() => !!api.getStoredUser())

  useEffect(() => {
    if (!api.getStoredUser()) return
    api.getMe().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  // Auto-refresh user permissions every 30 seconds to handle dynamic permission changes or account deactivation
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      api.getMe().then(setUser).catch(() => {
        api.clearAuth()
        setUser(null)
      })
    }, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // only re-run if user id changes

  const loginFn = useCallback(async (username: string, password: string) => { const u = await api.login(username, password); setUser(u) }, [])
  const logoutFn = useCallback(async () => { await api.logout(); setUser(null) }, [])
  const refreshUser = useCallback(async () => { try { setUser(await api.getMe()) } catch (e) { void e } }, [])

  return <AuthContext.Provider value={{ user, loading, login: loginFn, logout: logoutFn, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

export function usePermission() {
  const { user } = useAuth()
  return {
    hasModuleAccess: (module: string, level: 'dashboard' | 'read' | 'crud' = 'read') => {
      if (!user) return false
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      const perm = user.permissions?.[module] || 'none'
      const levels = { none: 0, dashboard: 1, read: 2, crud: 3 }
      return (levels[perm as keyof typeof levels] || 0) >= levels[level]
    },
    isAdmin: () => {
      if (!user) return false
      // Superadmin selalu punya akses admin
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      // Applicant TIDAK punya akses admin
      if (user.user_type === 'applicant') return false
      // Admin biasa: harus punya minimal 1 module bukan 'none'
      return Object.values(user.permissions || {}).some(v => v !== 'none')
    },
    hasApplicantAccess: () => {
      if (!user) return false
      // Hanya user_type=applicant yang punya akses applicant dashboard
      return user.user_type === 'applicant'
    },
    pagePermissions: user?.page_permissions || [],
    permissions: user?.permissions || {},
    isSuperadmin: user?.is_superadmin || user?.user_type === 'superadmin',
  }
}

export function useFilteredNav(items: { label: string; href?: string; module?: string; minLevel?: 'dashboard' | 'read' | 'crud'; roles?: string[]; children?: { label: string; href: string; module?: string; minLevel?: 'dashboard' | 'read' | 'crud' }[] }[]) {
  const { user } = useAuth()
  const { permissions, isSuperadmin, pagePermissions } = usePermission()

  return useMemo(() => {
    if (!user) return items

    return items.reduce((acc, item) => {
      // Check role access
      if (item.roles && !item.roles.includes(user.user_type) && !isSuperadmin) return acc

      // Check module permission
      if (item.module && !isSuperadmin) {
        const minLevel = item.minLevel || 'dashboard'
        const perm = permissions[item.module] || 'none'
        const levels: Record<string, number> = { none: 0, dashboard: 1, read: 2, crud: 3 }
        if ((levels[perm] || 0) < levels[minLevel]) return acc
      }

      // Filter children based on page_permissions
      const filteredItem = { ...item }
      if (item.children) {
        filteredItem.children = item.children.filter(c => {
          if (!isSuperadmin && pagePermissions.length > 0) {
            const pageKey = c.href.replace('/admin/', '') || ''
            if (!pagePermissions.includes(pageKey)) return false
          }
          return true
        })
        if (filteredItem.children.length === 0) return acc
      } else {
        if (!isSuperadmin && pagePermissions.length > 0 && item.href) {
          const pageKey = item.href.replace('/admin', '').replace(/^\//, '') || ''
          if (pageKey && !pagePermissions.includes(pageKey)) return acc
        }
      }

      acc.push(filteredItem)
      return acc
    }, [] as typeof items)
  }, [items, user, permissions, isSuperadmin, pagePermissions])
}
