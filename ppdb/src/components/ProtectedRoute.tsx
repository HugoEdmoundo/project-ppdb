import { Navigate } from 'react-router-dom'
import { useAuth, usePermission } from '../contexts/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

export default function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'applicant' }) {
  const { user, loading } = useAuth()
  const { isAdmin, hasApplicantAccess } = usePermission()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  const userIsAdmin = isAdmin()
  const userIsApplicant = hasApplicantAccess()

  if (role === 'admin' && !userIsAdmin) {
    if (userIsApplicant) return <Navigate to="/applicant" replace />
    return <Navigate to="/auth/login" replace />
  }

  if (role === 'applicant' && !userIsApplicant) {
    if (userIsAdmin) return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
