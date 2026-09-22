'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import AdminConfirm from '@/app/components/ui/AdminConfirm'
import {
  LogOut, User as UserIcon, Menu, Plus, Loader2, Settings, LayoutDashboard,
} from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'
import EmptyState from '@/app/components/ui/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/Avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/Table'
import { cn } from '@/app/lib/utils'

// ── Sub-components ────────────────────────────────────────────────────────────
import { DashboardSidebar } from './DashboardSidebar'
import { SettingsEditor } from './SettingsEditor'
import { ContactEditor } from './ContactEditor'
import { CrudFormDialog } from './CrudFormDialog'
import {
  TABS, TABLE_COLS, FORM_FIELDS, CONTENT_FIELDS, truncate,
} from './_constants'
import type { RowRecord, FormState, AdminUser } from './_types'

// ── Skeletons ─────────────────────────────────────────────────────────────────

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

  // ── Auth state ────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const canCrud =
    adminUser?.user_type === 'superadmin' ||
    adminUser?.permissions?.companyprofile === 'crud'

  const filteredTabs =
    pagePermissions && pagePermissions.length > 0
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
          setLogoUrl(logo || favicon || '')
        })
        .catch(() => {})
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
      pagePermissions && pagePermissions.length > 0
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
  }, [activeTab, handle401, pagePermissions])

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
        ;(async () => {
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

  function openEdit(item: RowRecord) {
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
          'transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <DashboardSidebar
          tabs={filteredTabs}
          activeTab={activeTab}
          collapsed={collapsed}
          logoUrl={logoUrl}
          onTabChange={setActiveTab}
          onCollapse={handleCollapseToggle}
          onMobileClose={() => setSidebarOpen(false)}
        />
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
              <h1 className="hidden sm:block font-heading text-base font-bold text-foreground">
                {activeTabDef.label}
              </h1>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="gap-2 px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={adminUser?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {adminUser?.full_name?.[0] || adminUser?.username?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-foreground leading-tight">
                      {adminUser?.full_name || adminUser?.username}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {adminUser?.role_name || adminUser?.user_type}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {adminUser?.full_name || adminUser?.username}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{adminUser?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onSelect={() => setProfileOpen(true)}>
                  <UserIcon className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-rose-danger focus:text-rose-danger focus:bg-rose-light/60"
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
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

          {/* List toolbar */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && canCrud && (
            <div className="flex justify-end mb-6">
              <Button onClick={openCreate} className="gap-2 shadow-md">
                <Plus className="w-4 h-4" />
                Buat Baru
              </Button>
            </div>
          )}

          {/* Data table */}
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
                      <TableRow
                        key={item.id || item.key}
                        className={idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}
                      >
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
                              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
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
