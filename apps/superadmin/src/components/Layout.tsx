import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, Shield, GraduationCap, Bell, History, MessageCircle
} from 'lucide-react'
import { API_BASE } from '../api/client'
import {
  DashboardShell,
  useBrand,
  type DashboardLinkComponent,
  type DashboardNavGroup,
} from '@repo/ui'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/applicants', icon: GraduationCap, label: 'Pendaftar' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/roles', icon: Shield, label: 'Roles' },
  { to: '/activities', icon: History, label: 'Aktivitas' },
  { to: '/notifications', icon: Bell, label: 'Notifikasi' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
]

const RouterDashboardLink: DashboardLinkComponent = ({ href, target, title, className, onClick, children }) => (
  <Link to={href ?? '#'} target={target} title={title} className={className} onClick={onClick}>
    {children}
  </Link>
)

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { logoUrl, faviconUrl } = useBrand(API_BASE)

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  const pageSegment =
    location.pathname === '/' || location.pathname === '/dashboard'
      ? 'Overview'
      : location.pathname.split('/')[1]

  const navGroups: DashboardNavGroup[] = [
    {
      label: 'Menu Utama',
      items: NAV_ITEMS.map((item) => ({
        key: item.to,
        label: item.label,
        icon: item.icon,
        href: item.to,
        active:
          item.to === '/dashboard'
            ? location.pathname === '/dashboard' || location.pathname === '/'
            : location.pathname.startsWith(item.to),
      })),
    },
  ]

  return (
    <DashboardShell
      brand={{ name: 'PTDARRAHMAN', subtitle: 'Superadmin', logoUrl: logoUrl || faviconUrl || undefined }}
      navGroups={navGroups}
      renderLink={RouterDashboardLink}
      title="Superadmin"
      subtitle={pageSegment}
      roleLabel="Superadmin"
      storageKey="sa_collapsed"
      user={{
        fullName: user?.full_name,
        username: user?.username,
        email: user?.email,
        avatarUrl: user?.avatar_url,
        role: 'Superadmin',
      }}
      onProfile={() => navigate('/profile')}
      onLogout={handleLogout}
      sidebarFooter={
        <p className="px-3 pt-1 text-[10px] leading-relaxed text-muted-foreground/70 select-none">
          © {new Date().getFullYear()} PTDARRAHMAN · Superadmin
        </p>
      }
    >
      {children}
    </DashboardShell>
  )
}
