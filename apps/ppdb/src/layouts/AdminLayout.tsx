import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useFilteredNav } from '../contexts/AuthContext'
import {
  LayoutDashboard, ChevronDown, ChevronLeft, Menu, CalendarDays, CreditCard, Bell, Users, FileCheck2, FileText, Timer
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { settingsService } from '../services/index'
import { API_BASE } from '@/api/client'
import TopBar from '@/components/shared/TopBar'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', module: 'ppdb' },
  { label: 'Data Pendaftar', icon: Users, href: '/admin/data-pendaftar', module: 'ppdb', minLevel: 'read' },
  {
    label: 'Persyaratan Seleksi',
    icon: FileCheck2,
    module: 'ppdb',
    minLevel: 'read',
    children: [
      { label: 'Seleksi', href: '/admin/selection' },
      { label: 'Review MOU', href: '/admin/mou' },
    ]
  },
  {
    label: 'Pembayaran',
    icon: CreditCard,
    module: 'ppdb',
    minLevel: 'read',
    children: [
      { label: 'Diskonasi', href: '/admin/diskonasi' },
    ]
  },
  { label: 'Periode PPDB', icon: CalendarDays, href: '/admin/periods', module: 'ppdb', minLevel: 'read' },
  { label: 'Template & Dokumen', icon: FileText, href: '/admin/document-settings', module: 'ppdb', minLevel: 'read' },
  { label: 'Pengaturan TIU', icon: Timer, href: '/admin/tiu-settings', module: 'ppdb', minLevel: 'read' },
  { label: 'Notifikasi', icon: Bell, href: '/admin/notifications', module: 'ppdb', minLevel: 'read' },
]

type NavChild = { label: string; href: string }
type NavItem = {
  label: string
  icon: typeof LayoutDashboard
  href?: string
  module?: string
  children?: NavChild[]
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ppdb_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [prevPath, setPrevPath] = useState(location.pathname)

  const filtered = useFilteredNav(navItems as unknown as Parameters<typeof useFilteredNav>[0]) as NavItem[]

  useEffect(() => {
    const loadLogo = () => {
      settingsService.getAll()
        .then((settings) => {
          const logo = settings.find((s) => s.key === 'logo')?.value
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          setLogoUrl(favicon || logo || '')
        })
        .catch(() => {})
    }
    loadLogo()
    const sseUrl = `${API_BASE}/companyprofile/events`
    const es = new EventSource(sseUrl)
    es.addEventListener('change', () => loadLogo())
    return () => es.close()
  }, [])

  // Tutup drawer mobile + auto-expand parent yang child-nya active saat pindah halaman.
  // Dipindah ke derived-state (guard prevPath) supaya tidak memanggil setState di dalam effect.
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setMobileOpen(false)
    const next = { ...expanded }
    let changed = false
    filtered.forEach((item: NavItem) => {
      if (item.children && item.children.some((c: NavChild) => location.pathname.startsWith(c.href))) {
        if (!next[item.label]) {
          next[item.label] = true
          changed = true
        }
      }
    })
    if (changed) setExpanded(next)
  }

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  const toggleCollapse = () => {
    setCollapsed(p => { const v = !p; localStorage.setItem('ppdb_collapsed', String(v)); return v })
  }

  function toggleExpand(label: string) {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function isActive(item: NavItem): boolean {
    if (item.href) return location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    return !!item.children?.some(c => location.pathname.startsWith(c.href))
  }

  const navLinkCls = (active: boolean) =>
    cn(
      'relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
      active
        ? 'bg-gradient-to-r from-emerald-primary to-emerald-dark text-white shadow-md shadow-emerald-primary/25'
        : 'text-slate-600 hover:bg-emerald-primary/10 hover:text-foreground'
    )

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-40 h-dvh bg-white border-r border-slate-200 flex flex-col transition-all duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Header */}
        <div className={cn('relative flex items-center border-b border-border/60 bg-white/40', collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4')}>
          {collapsed ? (
            logoUrl ? <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg select-none">ار</div>
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {logoUrl ? <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-9 object-contain shrink-0" /> : <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0 select-none">ار</div>}
              <div className="min-w-0">
                <div className="font-heading text-sm font-bold text-primary truncate">PTDARRAHMAN</div>
                <div className="text-[10px] font-bold text-gold-dark uppercase tracking-widest">PPDB Admin</div>
              </div>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-all hover:text-foreground"
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
          {!collapsed && (
            <div className="mb-2 mt-1 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Menu Utama
            </div>
          )}
          {filtered.map((item: NavItem) => {
            const Icon = item.icon
            const active = isActive(item)
            if (item.children) {
              const isExpanded = expanded[item.label]
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={navLinkCls(active)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-200/70 pl-3">
                      {item.children.map((c: NavChild) => {
                        const childActive = location.pathname === c.href
                        return (
                          <NavLink
                            key={c.href}
                            to={c.href}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-xs font-medium transition-all',
                              childActive
                                ? 'bg-emerald-primary/10 font-semibold text-primary'
                                : 'text-slate-500 hover:bg-emerald-primary/10 hover:text-foreground'
                            )}
                          >
                            {c.label}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <NavLink
                key={item.href}
                to={item.href!}
                className={cn(navLinkCls(active), 'group')}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && (
                  <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gold-accent" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-[11px] text-slate-400">PPDB Pesantren Ar-Rahman · {new Date().getFullYear()}</p>
          </div>
        )}
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title="Admin PPDB"
          titleClassName="hidden sm:block"
          user={user}
          subtitle={user?.role_name || user?.user_type}
          profileLabel="Profile"
          onProfile={() => navigate('/admin/profile')}
          onLogout={handleLogout}
          mobileMenuTrigger={
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden -ml-2 rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          }
        />

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
