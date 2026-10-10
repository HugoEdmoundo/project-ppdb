import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useFilteredNav } from '../contexts/AuthContext'
import {
  LayoutDashboard, CalendarDays, CreditCard, Bell, Users, Archive, Settings, ClipboardCheck, Award, Globe, ExternalLink, CalendarCheck
} from 'lucide-react'
import { API_BASE } from '@/api/client'
import {
  DashboardShell,
  useBrand,
  type DashboardLinkComponent,
  type DashboardNavGroup,
} from '@repo/ui'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', module: 'ppdb' },
  { label: 'Data Pendaftar', icon: Users, href: '/admin/data-pendaftar', module: 'ppdb', minLevel: 'read' },
  { label: 'Verifikasi Dokumen', icon: ClipboardCheck, href: '/admin/verifikasi-dokumen', module: 'ppdb', minLevel: 'read' },
  {
    label: 'Pembayaran',
    icon: CreditCard,
    module: 'ppdb',
    minLevel: 'read',
    children: [
      { label: 'Pembayaran Formulir', href: '/admin/pembayaran-formulir' },
      { label: 'Pembayaran Tahap 2', href: '/admin/pembayaran-tahap2' },
    ]
  },
  {
    label: 'Session 1:1',
    icon: CalendarCheck,
    module: 'ppdb',
    minLevel: 'read',
    children: [
      { label: 'Session Tahfidz', href: '/admin/sessions/tahfidz' },
      { label: 'Session Wawancara', href: '/admin/sessions/wawancara' },
    ]
  },
  { label: 'Hasil Pendaftaran', icon: Award, href: '/admin/penilaian', module: 'ppdb', minLevel: 'read' },
  { label: 'Periode PPDB', icon: CalendarDays, href: '/admin/periods', module: 'ppdb', minLevel: 'read' },
  {
    label: 'Konfigurasi',
    icon: Settings,
    module: 'ppdb',
    minLevel: 'read',
    children: [
      { label: 'Preview LoA & SKD', href: '/admin/pengumuman' },
      { label: 'Rubrik', href: '/admin/rubrik' },
      { label: 'Pengaturan TIU', href: '/admin/tiu-settings' },
    ]
  },
  { label: 'Arsip Pendaftar', icon: Archive, href: '/admin/arsip', module: 'ppdb', minLevel: 'read' },
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

const RouterDashboardLink: DashboardLinkComponent = ({ href, target, title, className, onClick, children }) => (
  <Link to={href ?? '#'} target={target} title={title} className={className} onClick={onClick}>
    {children}
  </Link>
)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { logoUrl } = useBrand(API_BASE)

  const filtered = useFilteredNav(navItems as unknown as Parameters<typeof useFilteredNav>[0]) as NavItem[]

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  const navGroups: DashboardNavGroup[] = [
    {
      label: 'Menu Utama',
      items: filtered.map((item: NavItem) => {
        const childActive = (c: NavChild) => location.pathname === c.href
        const children = item.children?.map((c) => ({
          key: c.href,
          label: c.label,
          href: c.href,
          active: childActive(c),
        }))
        return {
          key: item.href ?? item.label,
          label: item.label,
          icon: item.icon,
          href: item.href,
          children,
          active: item.href
            ? location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            : !!children?.some((c) => c.active),
        }
      }),
    },
  ]

  return (
    <DashboardShell
      brand={{ name: 'PTDARRAHMAN', subtitle: 'PPDB Admin', logoUrl: logoUrl || undefined }}
      navGroups={navGroups}
      renderLink={RouterDashboardLink}
      title="Admin PPDB"
      subtitle={user?.role_name || user?.user_type}
      roleLabel={user?.role_name || user?.user_type}
      contentClassName="animate-fade-in"
      storageKey="ppdb_collapsed"
      user={{
        fullName: user?.full_name,
        username: user?.username,
        email: user?.email,
        avatarUrl: user?.avatar_url,
        role: user?.role_name || user?.user_type,
      }}
      onProfile={() => navigate('/admin/profile')}
      onViewSite={() => window.open('/', '_blank')}
      onLogout={handleLogout}
      sidebarFooter={
        <>
          <Link
            to="/"
            target="_blank"
            title="Lihat Situs"
            className="group/link w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-primary/10 hover:text-foreground"
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">Lihat Situs</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover/link:opacity-100" />
          </Link>
          <p className="px-3 pt-1 text-[10px] leading-relaxed text-muted-foreground/70 select-none">
            PPDB Pesantren Ar-Rahman · {new Date().getFullYear()}
          </p>
        </>
      }
    >
      {children}
    </DashboardShell>
  )
}
