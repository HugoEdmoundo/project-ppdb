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
  Plus, Settings, LayoutDashboard, Loader2, FolderOpen,
} from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'
import EmptyState from '@/app/components/ui/EmptyState'
import { DashboardShell } from '@repo/ui'
import {
  AdminDashboardLink,
  AdminSidebarFooter,
  buildAdminNavGroups,
  useAdminLogo,
} from '../_admin-shell'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/Table'
import { cn } from '@/app/lib/utils'

// ── Sub-components ────────────────────────────────────────────────────────────
import { StaffOrgChart } from '@/app/components/staff/StaffOrgChart'
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
  const logoUrl = useAdminLogo()

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
        : typeof val === 'string' ? val
        : typeof val === 'number' ? String(val)
        : ''
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

  const activeTabDef = TABS.find((t) => t.key === activeTab)!

  const navGroups = buildAdminNavGroups(
    filteredTabs.map((t) => ({
      key: t.key,
      label: t.label,
      icon: t.icon,
      active: activeTab === t.key,
      onClick: () => setActiveTab(t.key),
    })),
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminToast />
      <AdminConfirm />

      <DashboardShell
        brand={{ name: 'PTDARRAHMAN', subtitle: 'Admin CMS', logoUrl: logoUrl || undefined }}
        navGroups={navGroups}
        renderLink={AdminDashboardLink}
        title="Admin CMS"
        subtitle="Kelola Konten"
        contentClassName="animate-fade-in"
        storageKey="cp_collapsed"
        roleLabel={adminUser?.role_name || adminUser?.user_type}
        user={{
          fullName: adminUser?.full_name,
          username: adminUser?.username,
          email: adminUser?.email,
          avatarUrl: adminUser?.avatar_url,
          role: adminUser?.role_name || adminUser?.user_type,
        }}
        onProfile={() => setProfileOpen(true)}
        onViewSite={() => window.open('/', '_blank')}
        onLogout={handleLogout}
        sidebarFooter={<AdminSidebarFooter />}
      >


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

          {/* Staff org chart */}
          {activeTab === 'staff' && !loading && items.length > 0 && (
            <Card className="border-border shadow-sm bg-white/60 backdrop-blur-sm p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Struktur Organisasi</h3>
              <p className="text-xs text-muted-foreground mb-4">Klik kartu untuk mengedit data staff. Posisi diatur lewat field “Atasan” dan “Urutan Tampilan” pada form edit.</p>
              <StaffOrgChart
                staff={items as unknown as import('@/app/lib/types').Staff[]}
                onSelect={(s) => {
                  const row = items.find((i) => i.id === s.id)
                  if (row && canCrud) void openEdit(row)
                }}
              />
            </Card>
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
      </DashboardShell>

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
    </>
  )
}
