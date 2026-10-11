import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import TopBar from './TopBar'

interface ApplicantTopBarProps {
  title?: string
  onProfile?: () => void
}

export default function ApplicantTopBar({ title = "PPDB", onProfile }: ApplicantTopBarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <TopBar
      title={title}
      containerClassName="px-4 md:px-6 h-14 max-w-6xl mx-auto"
      user={user}
      subtitle={user?.role_name || 'Calon Murid'}
      profileLabel="Profil Saya"
      onProfile={onProfile}
      onLogout={async () => {
        await logout()
        navigate('/auth/login')
      }}
    />
  )
}
