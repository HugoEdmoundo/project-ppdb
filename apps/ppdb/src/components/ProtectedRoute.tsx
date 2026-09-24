import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, usePermission } from '../contexts/AuthContext'
import { PageLoader, useBrand } from "@repo/ui"
import { API_BASE } from '../api/client'

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
  const { logoUrl } = useBrand(API_BASE)

  if (loading) {
    return <PageLoader logoUrl={logoUrl || undefined} />
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
    if (user.user_type === 'applicant') {
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
