import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, ShieldCheck, BookOpen, MessageSquare,
  Trophy, Receipt,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '@/api/client'
import { apiFetch } from '@/api/client'
import {
  DashboardShell,
  useBrand,
  type DashboardLinkComponent,
  type DashboardNavGroup,
} from '@repo/ui'
import ApplicantProfileModal from '@/components/shared/ApplicantProfileModal'

/**
 * Navigasi portal pendaftar. Isi menu memang berbeda per panel, tapi chrome
 * (sidebar + header + profile bar) memakai `DashboardShell` yang sama dengan
 * panel lain. `Kartu Ujian` & `checkout` SENGAJA tidak ikut: keduanya halaman
 * mandiri (kartu ujian butuh tampilan print bersih, checkout adalah paywall).
 */
const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/applicant' },
  { label: 'Upload Dokumen', icon: FileText, href: '/applicant/dokumen' },
  { label: 'Ujian TIU', icon: ShieldCheck, href: '/applicant/ujian-tiu' },
  { label: 'Seleksi Tahfidz', icon: BookOpen, href: '/applicant/seleksi-tahfidz' },
  { label: 'Seleksi Wawancara', icon: MessageSquare, href: '/applicant/seleksi-wawancara' },
  { label: 'Pengumuman', icon: Trophy, href: '/applicant/pengumuman' },
  { label: 'Kuitansi', icon: Receipt, href: '/applicant/kuitansi' },
]

const RouterDashboardLink: DashboardLinkComponent = ({ href, target, title, className, onClick, children }) => (
  <Link to={href ?? '#'} target={target} title={title} className={className} onClick={onClick}>
    {children}
  </Link>
)

export default function ApplicantLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { logoUrl, faviconUrl } = useBrand(API_BASE)
  const [showProfile, setShowProfile] = useState(false)

  // Data pendaftar untuk modal profil. Query key sama dengan halaman dashboard,
  // jadi react-query memakai cache yang sudah ada saat datang dari sana.
  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })
  const applicant = transactionQuery.data?.applicant

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  const navGroups: DashboardNavGroup[] = [
    {
      label: 'Menu Utama',
      items: navItems.map((item) => ({
        key: item.href,
        label: item.label,
        icon: item.icon,
        href: item.href,
        active: item.href === '/applicant'
          ? location.pathname === '/applicant'
          : location.pathname === item.href,
      })),
    },
  ]

  return (
    <>
      <DashboardShell
        brand={{
          name: 'PTDARRAHMAN',
          subtitle: 'PPDB Pendaftar',
          faviconUrl: faviconUrl || logoUrl || undefined,
          logoUrl: faviconUrl || logoUrl || undefined,
        }}
        navGroups={navGroups}
        renderLink={RouterDashboardLink}
        showSearch={false}
        roleLabel={user?.role_name || 'Calon Murid'}
        contentClassName="animate-fade-in"
        storageKey="ppdb_applicant_collapsed"
        user={{
          fullName: user?.full_name,
          username: user?.username,
          email: user?.email,
          avatarUrl: user?.avatar_url,
          role: user?.role_name || 'Calon Murid',
        }}
        onProfile={() => navigate('/applicant/profile')}
        onLogout={handleLogout}
      >
        {children}
      </DashboardShell>

      {false && showProfile && applicant && (
        <ApplicantProfileModal
          open
          onOpenChange={setShowProfile}
          applicant={applicant}
          title="Profil Saya"
          showPasswordHint
        />
      )}
    </>
  )
}
