import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, Shield, GraduationCap, Bell, History, MessageCircle,
  Globe, ExternalLink,
} from 'lucide-react'
import { API_BASE } from '../api/client'
import {
  DashboardShell,
  useBrand,
  resolveCompanyProfileUrl,
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

const COMPANY_PROFILE_URL = resolveCompanyProfileUrl(
  import.meta.env.VITE_COMPANY_PROFILE_URL as string | undefined,
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
      onViewSite={() => window.open(COMPANY_PROFILE_URL, '_blank')}
      onLogout={handleLogout}
      sidebarFooter={
        <>
          <Link
            to={COMPANY_PROFILE_URL}
            target="_blank"
            title="Lihat Situs"
            className="group/link w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-primary/10 hover:text-foreground"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">Lihat Situs</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover/link:opacity-100" />
          </Link>
          <p className="px-3 pt-1 text-[10px] leading-relaxed text-muted-foreground/70 select-none">
            © {new Date().getFullYear()} PTDARRAHMAN · Superadmin
          </p>
        </>
      }
    >
      {children}
    </DashboardShell>
  )
}
