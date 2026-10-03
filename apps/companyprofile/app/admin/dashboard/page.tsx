'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import AdminConfirm from '@/app/components/ui/AdminConfirm'
import {
  Plus, Menu, Settings, ChevronLeft, ChevronDown, ChevronRight, LogOut,
  User as UserIcon, LayoutDashboard, Loader2,
  Globe, ExternalLink, FolderOpen,
} from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'
import EmptyState from '@/app/components/ui/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/Table'
import { cn } from '@/app/lib/utils'

// ── Sub-components ────────────────────────────────────────────────────────────
import { SettingsEditor } from './SettingsEditor'
import { ContactEditor } from './ContactEditor'
import { CrudFormDialog } from './CrudFormDialog'
import {
  TABS, TABLE_COLS, FORM_FIELDS, CONTENT_FIELDS, truncate,
} from './_constants'
import type { AdminUser, FormState, RowRecord } from './_types'

const TAB_DESCRIPTIONS: Record<string, string> = {
  news: 'Kelola artikel, berita, dan pengumuman terbaru pesantren.',
  programs: 'Atur program pendidikan yang ditawarkan pesantren.',
  facilities: 'Kelola sarana dan prasarana yang dimiliki pesantren.',
  staff: 'Kelola daftar guru dan pengurus pesantren.',
  achievements: 'Catat raihan dan penghargaan santri.',
  gallery: 'Kelola dokumentasi foto kegiatan pesantren.',
  testimonials: 'Kelola kesan dan testimoni wali santri.',
  social: 'Atur tautan media sosial resmi pesantren.',
  contact: 'Perbarui informasi kontak pesantren.',
  settings: 'Konfigurasi logo, favicon, dan pengaturan situs.',
}

const SIDEBAR_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Konten', keys: ['news', 'programs', 'facilities', 'gallery', 'testimonials'] },
  { label: 'Informasi', keys: ['staff', 'achievements', 'social', 'contact'] },
  { label: 'Sistem', keys: ['settings'] },
]

// ─── Skeleton ───────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <div className="h-4 bg-[var(--border)] rounded flex-1" />
          <div className="h-4 bg-[var(--border)] rounded flex-1" />
          <div className="h-4 bg-[var(--border)] rounded w-20" />
          <div className="h-4 bg-[var(--border)] rounded w-16" />
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white/60 rounded-xl p-5 border border-[var(--border)] space-y-3"
        >
          <div className="h-4 bg-[var(--border)] rounded w-3/4" />
          <div className="h-3 bg-[var(--border)] rounded w-1/2" />
          <div className="flex gap-2 mt-2">
            <div className="h-8 bg-[var(--border)] rounded w-16" />
            <div className="h-8 bg-[var(--border)] rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const ADMIN_PAGE_SIZE = 25

export default function AdminDashboard() {
  const router = useRouter()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('news')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // ── Data state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // Id baris yang sedang dimuat penuh untuk form edit. Non-null = tombol Edit
  // baris tersebut sedang mengambil `content` & `gallery` yang tidak ada di list.
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const isSuperadmin =
    adminUser?.user_type === 'superadmin' || adminUser?.is_superadmin === true

  const canCrud =
    isSuperadmin ||
    adminUser?.permissions?.companyprofile === 'crud'

  const filteredTabs =
    isSuperadmin
      ? TABS
      : pagePermissions !== null
      ? TABS.filter((tab) => pagePermissions.includes(tab.key))
      : TABS

  // ── Form state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<RowRecord | null>(null)
  const [formData, setFormData] = useState<FormState>({})

  useSSE('companyprofile')

  // ── Deep-link ?tab= ───────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some((t) => t.key === tab)) {
      const id = window.setTimeout(() => setActiveTab(tab), 0)
      return () => window.clearTimeout(id)
    }
  }, [])

  // ── SSE: live page-permissions ────────────────────────────────────────────
  useEffect(() => {
    const userId = adminUser?.id
    if (!userId) return
    const url = `${api.API_BASE.replace(/\/$/, '')}/users/${userId}/events`
    const es = new EventSource(url, { withCredentials: true })
    es.addEventListener('page_permissions_changed', (e) => {
      try {
        const data = JSON.parse(e.data)
        setPagePermissions(
          data.page_keys && data.page_keys.length > 0 ? data.page_keys : null,
        )
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [adminUser?.id])

  // ── Dynamic logo ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadLogo = () => {
      api.getSettings()
        .then((settings) => {
          const logo = settings.find((s) => s.key === 'logo')?.value
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          setLogoUrl(favicon || logo || '')
        })
        .catch(() => { })
    }
    loadLogo()
    return eventBus.on('companyprofile:refresh', loadLogo)
  }, [])

  const handle401 = useCallback(() => {
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }, [router])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const currentTabs =
      isSuperadmin
        ? TABS
        : pagePermissions !== null
        ? TABS.filter((tab) => pagePermissions.includes(tab.key))
        : TABS

    setLoading(true)
    setError('')
    try {
      const tab = currentTabs.find((t) => t.key === activeTab)
      if (!tab) {
        if (currentTabs.length > 0) setActiveTab(currentTabs[0].key)
        setLoading(false)
        return
      }
      if (activeTab === 'contact' || activeTab === 'settings') {
        const data = await tab.fetch()
        setItems(Array.isArray(data) ? data : data ? [data as RowRecord] : [])
        setHasMore(false)
      } else {
        const data = await api.getEntityPage(tab.endpoint, 1, ADMIN_PAGE_SIZE)
        const rows = data as unknown as RowRecord[]
        setItems(rows)
        setPage(1)
        setHasMore(rows.length === ADMIN_PAGE_SIZE)
      }
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401()
        return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
      setItems([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [activeTab, handle401, isSuperadmin, pagePermissions])

  const loadMore = useCallback(async () => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const data = await api.getEntityPage(tab.endpoint, next, ADMIN_PAGE_SIZE)
      const rows = data as unknown as RowRecord[]
      setItems((prev) => [...prev, ...rows])
      setPage(next)
      setHasMore(rows.length === ADMIN_PAGE_SIZE)
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401(); return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat lebih banyak data')
    } finally {
      setLoadingMore(false)
    }
  }, [activeTab, handle401, hasMore, loadingMore, page])

  useEffect(() => {
    eventBus.on('companyprofile:refresh', fetchData)
    return () => eventBus.off('companyprofile:refresh', fetchData)
  }, [fetchData])

  // ── Bootstrap: load user & sidebar state ─────────────────────────────────
  useEffect(() => {
    // Deferred ke async boundary: membaca localStorage untuk inisialisasi
    // post-hydration (SSR-safe) tanpa setState sinkron dalam effect.
    const id = window.setTimeout(() => {
      const saved = localStorage.getItem('cp_collapsed')
      if (saved) setCollapsed(saved === 'true')

      const userRaw = localStorage.getItem('admin_user')
      if (!userRaw) {
        ; (async () => {
          try {
            const me = await api.getMe()
            if (me) {
              localStorage.setItem('admin_user', JSON.stringify(me))
              setAdminUser(me)
            }
          } catch {
            localStorage.removeItem('admin_user')
            router.replace('/auth/login')
          }
        })()
        return
      }
      try {
        const parsed = JSON.parse(userRaw)
        setAdminUser(parsed)
        if (parsed.page_permissions?.length > 0) {
          setPagePermissions(parsed.page_permissions)
        }
      } catch {
        localStorage.removeItem('admin_user')
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [router])

  useEffect(() => {
    if (!localStorage.getItem('admin_user')) {
      router.replace('/auth/login')
      return
    }
    const id = window.setTimeout(() => fetchData(), 0)
    return () => window.clearTimeout(id)
  }, [activeTab, fetchData, router])

  // Lock body scroll when form is open
  useEffect(() => {
    document.body.style.overflow = formMode ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [formMode])

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = ''
    for (const f of CONTENT_FIELDS[activeTab] || []) fd[`_c_${f.name}`] = ''
    fd.image = ''
    fd.gallery = []
    setFormData(fd)
    setEditingItem(null)
    setFormMode('create')
  }

  function populateForm(item: RowRecord) {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = item[f.name] ?? ''
    // Extract content fields
    const content = (item.content ?? {}) as Record<string, unknown>
    for (const f of CONTENT_FIELDS[activeTab] || []) {
      const val = content[f.name]
      fd[`_c_${f.name}`] = f.type === 'list' && Array.isArray(val)
        ? (val as string[]).join('\n')
        : typeof val === 'string' ? val : ''
    }
    fd.image = item.image || ''
    let rawGallery = item.gallery
    if (typeof rawGallery === 'string') try { rawGallery = JSON.parse(rawGallery) } catch { /* ignore */ }
    fd.gallery = Array.isArray(rawGallery) ? rawGallery as string[] : []
    setFormData(fd)
    setEditingItem(item)
    setFormMode('edit')
  }

  // WAJIB ambil detail penuh sebelum membuka form edit. `GET /{entity}` sengaja
  // membuang `content.content` dan mengosongkan `gallery` supaya list publik
  // tetap ringan; menyalin baris list itu ke form lalu Menyimpan akan
  // MENGHAPUS isi artikel dan galerinya secara permanen. Kalau detail gagal
  // dimuat, form TIDAK boleh dibuka sama sekali.
  async function openEdit(item: RowRecord) {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab) return
    setDetailLoading(item.id ?? '')
    try {
      const detail = (await api.getEntityDetail(
        tab.endpoint,
        String(item.slug || item.id || item.key || ''),
      )) as unknown as RowRecord
      populateForm({ ...item, ...detail })
    } catch (e: unknown) {
      toast(
        'error',
        'Gagal memuat data lengkap: ' +
          (e instanceof Error ? e.message : 'terjadi kesalahan') +
          '. Form tidak dibuka agar data lama tidak tertimpa.',
      )
    } finally {
      setDetailLoading(null)
    }
  }

  function closeForm() {
    setFormMode(null)
    setEditingItem(null)
    setFormData({})
  }

  async function handleDelete(item: RowRecord) {
    try {
      const tab = TABS.find((t) => t.key === activeTab)!
      await api.deleteItem(`${tab.endpoint}/${item.id}`)
      fetchData()
      toast('success', 'Berhasil dihapus')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  function handleLogout() {
    api.logout()
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }

  function handleCollapseToggle() {
    setCollapsed((p) => {
      const v = !p
      localStorage.setItem('cp_collapsed', String(v))
      return v
    })
  }

  const activeTabDef = TABS.find((t) => t.key === activeTab)!

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background flex">
      <AdminToast />
      <AdminConfirm />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className={cn(
          'fixed md:sticky top-0 left-0 z-40 h-dvh bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl flex flex-col border-r border-border/50 transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('relative flex items-center border-b border-border/60 bg-white/30', collapsed ? 'justify-center px-2 py-4' : 'px-5 py-4')}>
          {collapsed ? (
            logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-8 object-contain drop-shadow-sm" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center font-bold text-lg select-none shadow-sm">ار</div>
            )
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-9 object-contain shrink-0 drop-shadow-sm" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center font-bold text-lg shrink-0 select-none shadow-sm">ار</div>
              )}
              <div className="min-w-0">
                <div className="font-heading text-sm font-bold text-foreground truncate">PTDARRAHMAN</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                  Admin CMS
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleCollapseToggle}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-all hover:text-foreground hover:scale-110"
            title={collapsed ? 'Perlebar sidebar' : 'Sempitkan sidebar'}
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 no-scrollbar">
          <Link
            href="/admin/overview"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
              'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            )}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Dashboard</span>}
          </Link>

          {!collapsed ? (
            SIDEBAR_GROUPS.map((group) => {
              const tabs = filteredTabs.filter((t) => group.keys.includes(t.key))
              if (tabs.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 select-none">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }}
                          className={cn(
                            'group/btn relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                            collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                            isActive
                              ? 'sidebar-item-active bg-primary/10 text-foreground font-semibold shadow-sm'
                              : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                          )}
                          title={collapsed ? tab.label : undefined}
                        >
                          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />}
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{tab.label}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            filteredTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }}
                  className={cn(
                    'group/btn relative w-full flex items-center justify-center rounded-xl p-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'sidebar-item-active bg-primary/10 text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                  )}
                  title={tab.label}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />}
                  <Icon className="h-4 w-4 shrink-0" />
                </button>
              )
            })
          )}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-border/60 px-3 py-4 space-y-2', collapsed && 'px-2')}>
          <Link
            href="/"
            target="_blank"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'group/link w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
              'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            )}
            title="Lihat Situs"
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">Lihat Situs</span>
                <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground/60 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </>
            )}
          </Link>
          {!collapsed && (
            <p className="px-3 pt-1 text-[10px] text-muted-foreground/70 leading-relaxed select-none">
              © {new Date().getFullYear()} PTDARRAHMAN
            </p>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-navbar">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden -ml-2 rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="font-heading text-base font-bold text-foreground">Admin CMS</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                <span className="text-muted-foreground">Kelola Konten</span>
              </div>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="group flex items-center gap-2.5 rounded-xl border border-transparent bg-white/50 py-1.5 pl-1.5 pr-2.5 sm:pr-3 text-left transition-all duration-200 hover:bg-white/80 hover:border-emerald-primary/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Avatar className="h-8 w-8 ring-1 ring-emerald-primary/20 transition-shadow group-hover:ring-emerald-primary/40">
                    <AvatarImage src={adminUser?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
                      {adminUser?.full_name?.[0] || adminUser?.username?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-sm font-bold text-foreground leading-tight truncate">
                      {adminUser?.full_name || adminUser?.username}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      <span className="truncate">{adminUser?.role_name || adminUser?.user_type}</span>
                    </div>
                  </div>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-1.5">
                {/* User card header */}
                <div className="rounded-xl border border-emerald-primary/15 bg-gradient-to-br from-emerald-primary/10 to-emerald-primary/5 p-3 mb-1.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                      <AvatarImage src={adminUser?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
                        {adminUser?.full_name?.[0] || adminUser?.username?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground leading-tight">
                        {adminUser?.full_name || adminUser?.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{adminUser?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {adminUser?.role_name || adminUser?.user_type || 'Admin'}
                    </span>
                  </div>
                </div>

                <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => setProfileOpen(true)}>
                  <UserIcon className="h-4 w-4 text-emerald-primary" />
                  <span>Lihat Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => window.open('/', '_blank')}>
                  <Globe className="h-4 w-4 text-emerald-primary" />
                  <span>Lihat Situs</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-rose-danger focus:bg-rose-light/60 focus:text-rose-danger"
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          {/* Title card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary via-emerald-700 to-[#145337] p-6 md:p-8 text-white shadow-lg mb-6">
            <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#D4A853]/30 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm text-white shadow-inner shrink-0">
                  <activeTabDef.icon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Admin CMS
                  </p>
                  <h2 className="mt-1.5 font-heading text-2xl md:text-3xl font-bold leading-tight">
                    {activeTabDef.label}
                  </h2>
                  <p className="mt-1.5 text-sm text-emerald-50/85 max-w-xl leading-relaxed">
                    {TAB_DESCRIPTIONS[activeTab] || 'Kelola konten website Pesantren Ar-Rahman.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {activeTab !== 'settings' && activeTab !== 'contact' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold shadow-inner" title="Jumlah item">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {items.length} item
                  </span>
                )}
                {canCrud && activeTab !== 'settings' && activeTab !== 'contact' && (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/95 hover:bg-white text-emerald-900 px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Baru
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Skeletons */}
          {loading && (
            <>
              <div className="hidden md:block bg-white/50 rounded-2xl border border-[var(--border)] p-4">
                <TableSkeleton />
              </div>
              <div className="md:hidden">
                <CardSkeleton />
              </div>
            </>
          )}

          {/* Empty states */}
          {activeTab === 'settings' && !loading && items.length === 0 && (
            <EmptyState icon={Settings} title="Belum Ada Pengaturan" description="Tidak ada pengaturan yang tersedia." />
          )}
          {activeTab !== 'settings' && !loading && !error && items.length === 0 && (
            <EmptyState
              icon={LayoutDashboard}
              title="Belum Ada Data"
              description={
                activeTab === 'contact'
                  ? 'Info kontak belum diatur.'
                  : canCrud
                    ? 'Belum ada item di sini. Klik "Buat Baru" untuk memulai.'
                    : 'Belum ada item di sini.'
              }
              action={
                canCrud && activeTab !== 'contact' ? (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Baru
                  </button>
                ) : undefined
              }
            />
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && !loading && (
            <SettingsEditor settings={items as unknown as api.SiteSetting[]} canCrud={canCrud} />
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && !loading && (
            <ContactEditor contactInfo={items[0]} canCrud={canCrud} onSave={fetchData} />
          )}

          {/* Table Data */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && (
            <Card className="border-border shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      {TABLE_COLS[activeTab]?.map((col) => (
                        <TableHead
                          key={col.label}
                          className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider h-11"
                        >
                          {col.label}
                        </TableHead>
                      ))}
                      {canCrud && (
                        <TableHead className="text-right text-[12px] font-semibold text-muted-foreground uppercase tracking-wider h-11">
                          Aksi
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.id || item.key} className={cn('transition-colors hover:bg-primary/[0.04]', idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent')}>
                        {TABLE_COLS[activeTab]?.map((col) => (
                          <TableCell
                            key={col.label}
                            className="py-3 max-w-[200px] sm:max-w-[300px] truncate text-foreground font-medium"
                          >
                            {truncate(col.accessor(item), 40)}
                          </TableCell>
                        ))}
                        {canCrud && (
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                loading={detailLoading === item.id}
                                onClick={() => void openEdit(item)}
                              >
                                Edit
                              </Button>
                              {activeTab !== 'contact' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={async () => {
                                    const { confirm } = await import(
                                      '@/app/components/ui/AdminConfirm'
                                    )
                                    const ok = await confirm({
                                      title: 'Hapus Item',
                                      message: 'Yakin ingin menghapus item ini? Tindakan ini tidak bisa dibatalkan.',
                                      confirmLabel: 'Ya, Hapus',
                                      cancelLabel: 'Batal',
                                      variant: 'danger',
                                    })
                                    if (ok) handleDelete(item)
                                  }}
                                >
                                  Hapus
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Load more */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && hasMore && (
            <div className="flex justify-center mt-6 mb-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                <Loader2 className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Form modal */}
      {formMode && (
        <CrudFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}

      {profileOpen && <ProfileModal open onClose={() => setProfileOpen(false)} />}
      <CrossTabSync />
    </div>
  )
}
