import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, Shield, LogOut, User as UserIcon,
  ChevronLeft, Menu, GraduationCap, Bell
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getSettings, API_BASE } from '../api/client'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applicants', icon: GraduationCap, label: 'Pendaftar' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/roles', icon: Shield, label: 'Roles' },
  { to: '/notifications', icon: Bell, label: 'Notifikasi' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sa_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState('/download.png')

  // Load favicon dynamically (sidebar pakai favicon, bukan logo)
  useEffect(() => {
    const loadLogo = () => {
      getSettings()
        .then((settings) => {
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          setLogoUrl(favicon || '/download.png')
        })
        .catch(() => {})
    }
    loadLogo()

    const sseUrl = `${API_BASE}/companyprofile/events`
    const es = new EventSource(sseUrl)
    es.addEventListener('change', () => {
      loadLogo()
    })
    return () => {
      es.close()
    }
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const toggleCollapse = () => {
    setCollapsed(p => { const v = !p; localStorage.setItem('sa_collapsed', String(v)); return v })
  }

  const initials = (user?.full_name || user?.username || 'S')[0]?.toUpperCase()

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 flex h-dvh flex-col border-r border-border bg-white/80 backdrop-blur-xl transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {/* Header */}
        <div className={`relative flex items-center border-b border-border ${collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4'}`}>
          {collapsed ? (
            <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-auto max-w-8 object-contain" />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-auto max-w-36 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">PTDARRAHMAN</div>
                <div className="text-[11px] text-muted-foreground">Superadmin Panel</div>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleCollapse}
            className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-xl md:flex"
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                )}
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
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-white/70 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="hidden text-base font-bold text-foreground sm:block font-heading">
                Superadmin Panel
              </h1>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5">
                  <Avatar className="h-8 w-8 text-sm">
                    <AvatarImage src={user?.avatar_url || undefined} alt={initials} />
                    <AvatarFallback className="bg-primary/10 font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {user?.full_name || user?.username}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Superadmin</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold text-foreground">{user?.full_name || user?.username}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
