import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, usePermission } from '../contexts/AuthContext'
import { PageLoader } from '@/components/ui/PageLoader'

export default function ProtectedRoute({ 
  children, 
  role,
  requirePaid = false
}: { 
  children: React.ReactNode; 
  role?: 'admin' | 'applicant';
  requirePaid?: boolean;
}) {
  const { user, loading } = useAuth()
  const { isAdmin, hasApplicantAccess } = usePermission()
  const location = useLocation()

  if (loading) {
    return <PageLoader />
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

  if (role === 'applicant') {
    if (!userIsApplicant) {
      if (userIsAdmin) return <Navigate to="/admin/dashboard" replace />
      return <Navigate to="/auth/login" replace />
    }
    
    // Paywall strict check
    if (user.user_type === 'calon_murid') {
      const isPaid = user.payment_status === 'paid'
      const isCheckoutPage = location.pathname === '/checkout'
      
      if (requirePaid && !isPaid) {
        return <Navigate to="/checkout" replace />
      }
      
      // If they are on checkout but already paid, send them to dashboard
      if (isCheckoutPage && isPaid) {
        return <Navigate to="/applicant" replace />
      }
    }
  }

  return <>{children}</>
}
