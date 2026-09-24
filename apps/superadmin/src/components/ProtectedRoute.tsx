import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageLoader, useBrand } from "@repo/ui"
import { API_BASE } from '../api/client'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { logoUrl } = useBrand(API_BASE)

  if (loading) {
    return <PageLoader logoUrl={logoUrl || undefined} />
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (user.user_type !== 'superadmin' && !(user as any).is_superadmin) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
