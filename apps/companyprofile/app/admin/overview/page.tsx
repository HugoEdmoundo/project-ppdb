'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as api from '@/app/lib/api'
import type { NewsArticle } from '@/app/lib/types'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import AdminToast from '@/app/components/ui/AdminToast'
import CrossTabSync from '@/app/components/CrossTabSync'
import {
  Newspaper, GraduationCap, Building2, Users, Trophy,
  Image as ImageIcon, MessageSquare, Link as LinkIcon, Phone, Settings,
  Menu, ChevronLeft, ChevronDown, ChevronRight, LogOut,
  LayoutDashboard, ArrowRight, Calendar, Sparkles, PenSquare, PictureInPicture2,
  Globe, ExternalLink, User as UserIcon,
} from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/app/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { buttonVariants } from '@/app/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card'
import { cn } from '@/app/lib/utils'

// ─── Types ──────────────────────────────────────────────────

interface AdminUser {
  id?: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  role_name?: string
  user_type?: string
  permissions?: Record<string, string>
  page_permissions?: string[]
}

interface SectionDef {
  key: string
  label: string
  icon: typeof Newspaper
  tint: string
  href: string
  description: string
}

const SECTIONS: SectionDef[] = [
  { key: 'news', label: 'Berita', icon: Newspaper, tint: 'from-emerald-500 to-emerald-700', href: '/admin/dashboard?tab=news', description: 'Artikel & berita terbaru' },
  { key: 'programs', label: 'Program', icon: GraduationCap, tint: 'from-sky-500 to-sky-700', href: '/admin/dashboard?tab=programs', description: 'Program pendidikan' },
  { key: 'facilities', label: 'Fasilitas', icon: Building2, tint: 'from-amber-500 to-amber-700', href: '/admin/dashboard?tab=facilities', description: 'Sarana & prasarana' },
  { key: 'staff', label: 'Staff', icon: Users, tint: 'from-violet-500 to-violet-700', href: '/admin/dashboard?tab=staff', description: 'Guru & pengurus' },
  { key: 'achievements', label: 'Prestasi', icon: Trophy, tint: 'from-rose-500 to-rose-700', href: '/admin/dashboard?tab=achievements', description: 'Raihan & penghargaan' },
  { key: 'gallery', label: 'Galeri', icon: ImageIcon, tint: 'from-pink-500 to-pink-700', href: '/admin/dashboard?tab=gallery', description: 'Dokumentasi kegiatan' },
  { key: 'testimonials', label: 'Testimoni', icon: MessageSquare, tint: 'from-cyan-500 to-cyan-700', href: '/admin/dashboard?tab=testimonials', description: 'Kesan wali santri' },
  { key: 'social', label: 'Tautan Sosial', icon: LinkIcon, tint: 'from-indigo-500 to-indigo-700', href: '/admin/dashboard?tab=social', description: 'Media sosial' },
  { key: 'contact', label: 'Info Kontak', icon: Phone, tint: 'from-teal-500 to-teal-700', href: '/admin/dashboard?tab=contact', description: 'Hubungi kami' },
  { key: 'settings', label: 'Pengaturan', icon: Settings, tint: 'from-slate-600 to-slate-800', href: '/admin/dashboard?tab=settings', description: 'Konfigurasi situs' },
]

const SIDEBAR_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Konten', keys: ['news', 'programs', 'facilities', 'gallery', 'testimonials'] },
  { label: 'Informasi', keys: ['staff', 'achievements', 'social', 'contact'] },
  { label: 'Sistem', keys: ['settings'] },
]

// ─── Main Component ─────────────────────────────────────────

export default function AdminOverview() {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState('/download.png')

  useSSE('companyprofile')

  const canCrud =
    adminUser?.user_type === 'superadmin' ||
    adminUser?.permissions?.companyprofile === 'crud'

  const filteredSections =
    pagePermissions && pagePermissions.length > 0
      ? SECTIONS.filter((s) => pagePermissions.includes(s.key))
      : SECTIONS

  const handle401 = useCallback(() => {
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }, [router])

  // Auth guard — sama dengan dashboard admin.
  useEffect(() => {
    const saved = localStorage.getItem('admin_user')
    if (!saved) {
      ;(async () => {
        try {
          const me = await api.getMe()
          if (me) {
            localStorage.setItem('admin_user', JSON.stringify(me))
            setAdminUser(me as unknown as AdminUser)
            if (me.page_permissions && me.page_permissions.length > 0) {
              setPagePermissions(me.page_permissions)
            }
          } else {
            throw new Error('no user')
          }
        } catch {
          router.replace('/auth/login')
        }
      })()
      return
    }
    try {
      const parsed = JSON.parse(saved) as AdminUser | null
      if (!parsed) {
        router.replace('/auth/login')
        return
      }
      requestAnimationFrame(() => {
        setAdminUser(parsed)
        if (parsed.page_permissions && parsed.page_permissions.length > 0) {
          setPagePermissions(parsed.page_permissions)
        }
      })
    } catch {
      router.replace('/auth/login')
    }
  }, [router])

  // Logo dinamis (tidak ada aset statis).
  useEffect(() => {
    const loadLogo = () => {
      api.getSettings()
        .then((settings) => {
          const logo = settings.find((s) => s.key === 'logo')?.value
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          if (logo) setLogoUrl(logo)
          else if (favicon) setLogoUrl(favicon)
          else setLogoUrl('/download.png')
        })
        .catch(() => {})
    }
    loadLogo()
    return eventBus.on('companyprofile:refresh', loadLogo)
  }, [])

  // Ambil ringkasan data (count) seluruh modul + berita terbaru.
  const fetchOverview = useCallback(async () => {
    setError('')
    try {
      const [news, programs, facilities, staff, achievements, gallery, testimonials, social, contact, settings] =
        await Promise.all([
          api.getNews(),
          api.getPrograms(),
          api.getFacilities(),
          api.getStaff(),
          api.getAchievements(),
          api.getGallery(),
          api.getTestimonials(),
          api.getSocialLinks(),
          api.getContactInfo(),
          api.getAdminSettings(),
        ])
      setCounts({
        news: news.length,
        programs: programs.length,
        facilities: facilities.length,
        staff: staff.length,
        achievements: achievements.length,
        gallery: gallery.length,
        testimonials: testimonials.length,
        social: social.length,
        contact: contact ? 1 : 0,
        settings: settings.length,
      })
      setLatestNews(
        [...news]
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 6)
      )
    } catch (e: unknown) {
      if (e instanceof Error && (e.message?.includes('401') || e.message?.includes('Unauthorized'))) {
        handle401()
        return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat ringkasan data')
    } finally {
      setLoading(false)
    }
  }, [handle401])

  useEffect(() => {
    if (!adminUser) return
    const frame = requestAnimationFrame(() => { fetchOverview() })
    return () => cancelAnimationFrame(frame)
  }, [adminUser, fetchOverview])

  useEffect(() => {
    return eventBus.on('companyprofile:refresh', () => {
      fetchOverview()
    })
  }, [fetchOverview])

  function handleLogout() {
    api.logout()
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }

  const greetingName = adminUser?.full_name || adminUser?.username || 'Admin'
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-dvh bg-background flex">
      <AdminToast />
      <CrossTabSync />
      {profileOpen && <ProfileModal open onClose={() => setProfileOpen(false)} />}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
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
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-auto max-w-8 object-contain drop-shadow-sm" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center font-bold text-lg select-none shadow-sm">ار</div>
            )
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-auto max-w-36 object-contain shrink-0 drop-shadow-sm" />
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
            onClick={() => { setCollapsed(p => { const v = !p; localStorage.setItem('cp_collapsed', String(v)); return v }) }}
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
              'group/btn relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
              'sidebar-item-active bg-primary/10 text-foreground font-semibold shadow-sm'
            )}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Dashboard</span>}
          </Link>

          {!collapsed ? (
            SIDEBAR_GROUPS.map((group) => {
              const items = filteredSections.filter((s) => group.keys.includes(s.key))
              if (items.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 select-none">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((s) => {
                      const Icon = s.icon
                      return (
                        <Link
                          key={s.key}
                          href={s.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'group/btn relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                            collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                            'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                          )}
                          title={collapsed ? s.label : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{s.label}</span>}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            filteredSections.map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.key}
                  href={s.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group/btn relative w-full flex items-center justify-center rounded-xl p-2 text-sm font-medium transition-all duration-150',
                    'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                  )}
                  title={s.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </Link>
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
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
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
                <span className="text-muted-foreground">Dashboard</span>
              </div>
            </div>

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

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          {/* Hero / Greeting */}
          <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary via-emerald-700 to-[#145337] p-6 md:p-8 text-white shadow-lg">
            <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#D4A853]/30 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Portal Admin · Company Profile
                </p>
                <h2 className="mt-2 font-heading text-2xl md:text-3xl font-bold leading-tight">
                  Selamat Datang kembali, {greetingName}
                </h2>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-emerald-50/80">
                  <Calendar className="h-4 w-4" />
                  {today}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/"
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'glass', size: 'sm' }))}
                >
                  Lihat Situs
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {canCrud && (
                  <Link
                    href="/admin/dashboard?tab=news"
                    className={cn(buttonVariants({ variant: 'gold', size: 'sm' }))}
                  >
                    <PenSquare className="h-4 w-4" />
                    Buat Berita
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Stat Cards Grid */}
          <h3 className="mt-8 mb-4 font-heading text-lg font-bold text-foreground">
            Ringkasan Konten
          </h3>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/60 border border-border/70 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredSections.map((s) => {
                const Icon = s.icon
                const count = counts[s.key] ?? 0
                return (
                  <Link
                    key={s.key}
                    href={s.href}
                    className="group h-full"
                  >
                    <Card className="h-full border-border/70 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
                      <CardContent className="p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br', s.tint)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors group-hover:bg-primary/10">
                            Kelola
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                        <div>
                          <p className="font-heading text-3xl font-bold text-foreground leading-none">
                            {count}
                          </p>
                          <p className="mt-1.5 text-sm font-semibold text-foreground">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Two-column: Recent + Quick actions */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 border-border/70 bg-white/70 backdrop-blur-md shadow-sm">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" />
                  Berita Terbaru
                </CardTitle>
                <Link
                  href="/admin/dashboard?tab=news"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Lihat semua
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-white/60 border border-border/70 animate-pulse" />
                    ))}
                  </div>
                ) : latestNews.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Belum ada berita. Mulai publikasikan konten baru.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {latestNews.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/60 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.content?.title || item.slug}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.date || '-'} · {item.category || 'Umum'}
                          </p>
                        </div>
                        <LinkIcon className="hidden sm:block h-4 w-4 shrink-0 text-primary/50" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-border/70 bg-white/70 backdrop-blur-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PictureInPicture2 className="h-4 w-4 text-primary" />
                    Aksi Cepat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <QuickLink href="/admin/dashboard?tab=news" icon={Newspaper} label="Kelola Berita" />
                  <QuickLink href="/admin/dashboard?tab=gallery" icon={ImageIcon} label="Kelola Galeri" />
                  <QuickLink href="/admin/dashboard?tab=programs" icon={GraduationCap} label="Kelola Program" />
                  <QuickLink href="/admin/dashboard?tab=contact" icon={Phone} label="Perbarui Info Kontak" />
                  <QuickLink href="/admin/dashboard?tab=settings" icon={Settings} label="Pengaturan Situs" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Newspaper; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/60 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-white group"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
