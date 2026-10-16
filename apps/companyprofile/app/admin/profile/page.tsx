'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/app/lib/api'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import { DashboardShell } from '@repo/ui'
import { ProfilePage as SharedProfilePage, type ProfileSession } from '@repo/ui/profile'
import {
  AdminDashboardLink,
  buildAdminNavGroups,
  useAdminFavicon,
} from '../_admin-shell'

const MODULES = [
  { key: 'news', label: 'Berita', href: '/admin/dashboard?tab=news' },
  { key: 'programs', label: 'Program', href: '/admin/dashboard?tab=programs' },
  { key: 'facilities', label: 'Fasilitas', href: '/admin/dashboard?tab=facilities' },
  { key: 'gallery', label: 'Galeri', href: '/admin/dashboard?tab=gallery' },
  { key: 'testimonials', label: 'Testimoni', href: '/admin/dashboard?tab=testimonials' },
  { key: 'staff', label: 'Staff', href: '/admin/dashboard?tab=staff' },
  { key: 'achievements', label: 'Prestasi', href: '/admin/dashboard?tab=achievements' },
  { key: 'social', label: 'Tautan Sosial', href: '/admin/dashboard?tab=social' },
  { key: 'contact', label: 'Info Kontak', href: '/admin/dashboard?tab=contact' },
  { key: 'settings', label: 'Pengaturan', href: '/admin/dashboard?tab=settings' },
]

interface SessionsApi {
  getSessions?: () => Promise<{ sessions?: ProfileSession[] } | ProfileSession[]>
  revokeSession?: (id: string) => Promise<void>
  updateProfile?: (data: Record<string, string>) => Promise<unknown>
}

export default function AdminProfilePage() {
  const router = useRouter()
  const faviconUrl = useAdminFavicon()
  const [adminUser, setAdminUser] = useState<api.AuthMe | null>(null)
  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    api
      .getMe()
      .then((u) => {
        if (mounted) setAdminUser(u)
      })
      .catch(() => {
        if (mounted) setAdminUser(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading((prev) => (sessions.length === 0 ? true : prev))
      if (sessions.length > 0) setSessionsRefreshing(true)
      setSessionsError(null)
      const apiHelper = api as unknown as SessionsApi
      if (typeof apiHelper.getSessions === 'function') {
        const data = await apiHelper.getSessions()
        const list = Array.isArray(data) ? data : data?.sessions ?? []
        setSessions(list)
      } else {
        setSessions([])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat sesi perangkat.'
      setSessionsError(msg)
    } finally {
      setSessionsLoading(false)
      setSessionsRefreshing(false)
    }
  }, [sessions.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions()
    }, 0)
    const interval = window.setInterval(() => void loadSessions(), 60000)
    return () => {
      clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [loadSessions])

  async function handleSubmit(payload: Record<string, string | undefined>) {
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string') clean[k] = v
    }
    const apiHelper = api as unknown as SessionsApi
    if (typeof apiHelper.updateProfile === 'function') {
      await apiHelper.updateProfile(clean)
    }
    const u = await api.getMe()
    setAdminUser(u)
  }

  async function handleRevoke(id: string) {
    try {
      setRevokingId(id)
      const apiHelper = api as unknown as SessionsApi
      if (typeof apiHelper.revokeSession === 'function') {
        await apiHelper.revokeSession(id)
      }
      await loadSessions()
      toast('success', 'Sesi perangkat berhasil diakhiri.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengakhiri sesi.'
      toast('error', msg)
    } finally {
      setRevokingId(null)
    }
  }

  const navGroups = buildAdminNavGroups(
    MODULES.map((m) => ({ key: m.key, label: m.label, href: m.href })),
    true,
  )

  return (
    <>
      <AdminToast />
      <DashboardShell
        brand={{ name: 'PTDARRAHMAN', subtitle: 'Admin CMS', faviconUrl: faviconUrl || undefined, logoUrl: faviconUrl || undefined }}
        navGroups={navGroups}
        renderLink={AdminDashboardLink}
        onNavigate={(item) => {
          if (item?.href) router.push(item.href)
        }}
        apiBase={api.API_BASE}
        contentClassName="animate-fade-in no-scrollbar"
        storageKey="cp_collapsed"
        roleLabel={adminUser?.role_name || adminUser?.user_type}
        user={{
          fullName: adminUser?.full_name,
          username: adminUser?.username,
          email: adminUser?.email,
          avatarUrl: adminUser?.avatar_url,
          role: adminUser?.role_name || adminUser?.user_type,
        }}
        onProfile={() => router.push('/admin/profile')}
        onViewSite={() => window.open('/', '_blank', 'noopener,noreferrer')}
        onLogout={async () => {
          try {
            await api.logout()
          } finally {
            router.push('/auth/login')
          }
        }}
      >
        <SharedProfilePage
          user={adminUser}
          notify={(type, message) => {
            if (type === 'success') toast('success', message)
            else if (type === 'error') toast('error', message)
            else toast('warning', message)
          }}
          onUploadAvatar={async (file: File) => {
            const url = await api.uploadImage(file)
            return url as string
          }}
          onSubmit={handleSubmit}
          onBack={() => router.back()}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          sessionsError={sessionsError}
          sessionsRefreshing={sessionsRefreshing}
          onRefreshSessions={loadSessions}
          onRevokeSession={handleRevoke}
          revokingSessionId={revokingId}
        />
      </DashboardShell>
    </>
  )
}