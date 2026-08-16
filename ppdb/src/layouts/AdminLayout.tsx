import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useFilteredNav } from '../contexts/AuthContext'
import {
  LayoutDashboard, ChevronDown, ChevronLeft, Menu, LogOut, CalendarDays, CreditCard, Bell, User as UserIcon
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { settingsService } from '../services/index'
import { API_BASE } from '../api/client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from '@/components/ui'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', module: 'dashboard' },
  { label: 'Periode PPDB', icon: CalendarDays, href: '/admin/periods', module: 'ppdb', minLevel: 'read' },
  { label: 'Pembayaran', icon: CreditCard, href: '/admin/payments', module: 'payment', minLevel: 'read' },
  { label: 'Notifikasi', icon: Bell, href: '/admin/notifications', module: 'notification', minLevel: 'read' },
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
  const [logoUrl, setLogoUrl] = useState('/download.png')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filtered = useFilteredNav(navItems as unknown as Parameters<typeof useFilteredNav>[0]) as NavItem[]

  useEffect(() => {
    const loadLogo = () => {
      settingsService.getAll()
        .then((settings) => {
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          setLogoUrl(favicon || '/download.png')
        })
        .catch(() => {})
    }
    loadLogo()
    const sseUrl = `${API_BASE}/companyprofile/events`
    const es = new EventSource(sseUrl)
    es.addEventListener('change', () => loadLogo())
    return () => es.close()
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Auto-expand parent yang child-nya active (hanya jalan saat pindah halaman)
  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev }
      let changed = false
      filtered.forEach((item: NavItem) => {
        if (item.children && item.children.some((c: NavChild) => location.pathname.startsWith(c.href))) {
          if (!next[item.label]) {
            next[item.label] = true
            changed = true
          }
        }
      })
      return changed ? next : prev
    })
  }, [location.pathname]) // Hanya re-run ketika path berubah

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
      'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
      collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
      active
        ? 'sidebar-item-active scale-[1.01]'
        : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
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
          'fixed md:sticky top-0 left-0 z-40 h-dvh glass-sidebar flex flex-col transition-all duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Header */}
        <div className={cn('relative flex items-center border-b border-border/60 bg-white/40', collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4')}>
          {collapsed ? (
            <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-auto max-w-8 object-contain" />
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-auto max-w-36 object-contain shrink-0" />
              <div className="min-w-0">
                <div className="font-heading text-sm font-bold text-foreground truncate">PTDARRAHMAN</div>
                <div className="text-[11px] text-muted-foreground">PPDB Admin</div>
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
                    <div className="ml-8 mt-1 space-y-0.5">
                      {item.children.map((c: NavChild) => (
                        <NavLink
                          key={c.href}
                          to={c.href}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-xs transition-all',
                            location.pathname === c.href
                              ? 'bg-primary/10 font-semibold text-primary'
                              : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                          )}
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <NavLink
                key={item.href}
                to={item.href!}
                className={navLinkCls(active)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-navbar">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden -ml-2 rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="hidden sm:block font-heading text-base font-bold text-foreground">
                Admin PPDB
              </h1>
            </div>

            {/* Profile dropdown (shadcn) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="gap-2 px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {user?.full_name?.[0] || user?.username?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-foreground leading-tight">{user?.full_name || user?.username}</div>
                    <div className="text-[11px] text-muted-foreground">{user?.role_name || user?.user_type}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{user?.full_name || user?.username}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate('/admin/profile')}>
                  <UserIcon className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-rose-danger focus:text-rose-danger focus:bg-rose-light/60" onSelect={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
