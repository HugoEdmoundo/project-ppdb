import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, Shield, LogOut, User as UserIcon,
  ChevronLeft, Menu, GraduationCap, Bell, History, MessageCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { API_BASE } from '../api/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useBrand } from '@repo/ui'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applicants', icon: GraduationCap, label: 'Pendaftar' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/roles', icon: Shield, label: 'Roles' },
  { to: '/activities', icon: History, label: 'Aktivitas' },
  { to: '/notifications', icon: Bell, label: 'Notifikasi' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sa_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { faviconUrl } = useBrand(API_BASE)

  // Close mobile sidebar on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  const toggleCollapse = () => {
    setCollapsed(p => { const v = !p; localStorage.setItem('sa_collapsed', String(v)); return v })
  }

  const initials = (user?.full_name || user?.username || 'S')[0]?.toUpperCase()

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 flex h-dvh flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {/* Header */}
        <div className={`relative flex h-16 items-center border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          {collapsed ? (
            faviconUrl ? <img src={faviconUrl} alt="PTDARRAHMAN" className="h-8 w-8 object-contain transition-transform hover:scale-105" /> : <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg select-none shadow-sm">ار</div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {faviconUrl ? <img src={faviconUrl} alt="PTDARRAHMAN" className="h-9 w-9 object-contain shrink-0 transition-transform hover:scale-105" /> : <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0 select-none shadow-sm">ار</div>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900 tracking-tight">PTDARRAHMAN</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Superadmin</div>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleCollapse}
            className="absolute -right-3.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 rounded-full border-slate-200 bg-white shadow-sm md:flex hover:bg-slate-50 hover:text-primary transition-colors z-50"
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-6 scrollbar-hide">
          {!collapsed && <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Menu Utama</div>}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.to === '/dashboard' ? location.pathname === '/dashboard' || location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                  collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="md:hidden text-slate-500 hover:text-slate-900"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Breadcrumb / Title area */}
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-md">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard Utama</span>
                </div>
                <span className="text-slate-300">/</span>
                <h1 className="text-sm font-bold text-slate-900 capitalize tracking-tight">
                  {location.pathname === '/dashboard' ? 'Overview' : location.pathname.split('/')[1]}
                </h1>
              </div>
            </div>

            {/* Profile Dropdown Chip */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2.5 rounded-full bg-slate-50 px-2 py-1.5 hover:bg-slate-100 border border-slate-200 transition-colors h-10 group">
                  <Avatar className="h-7 w-7 text-xs border border-white shadow-sm transition-transform group-hover:scale-105">
                    <AvatarImage src={user?.avatar_url || undefined} alt={initials} />
                    <AvatarFallback className="bg-primary/10 font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block pr-2">
                    <div className="text-sm font-semibold leading-none text-slate-700 group-hover:text-slate-900 transition-colors">
                      {user?.full_name || user?.username}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-lg border-slate-100">
                <DropdownMenuLabel className="font-normal p-3 bg-slate-50/50 rounded-t-lg border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <div className="p-1">
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-md cursor-pointer hover:bg-slate-50">
                    <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-700">Profil Saya</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-slate-100" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-md cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Keluar</span>
                  </DropdownMenuItem>
                </div>
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
