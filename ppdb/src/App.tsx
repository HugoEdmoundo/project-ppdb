import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import ForbiddenPage from './pages/errors/ForbiddenPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import PeriodsPage from './pages/admin/ppdb/PeriodsPage'
import LandingPage from './pages/public/LandingPage'
import RegisterPage from './pages/public/RegisterPage'
import CheckoutPage from './pages/applicant/CheckoutPage'
import ApplicantDashboardPage from './pages/applicant/DashboardPage'
import PaymentsPage from './pages/admin/ppdb/PaymentsPage'
import NotificationsPage from './pages/admin/notifications/NotificationsPage'
import ApplicantsPage from './pages/admin/ppdb/ApplicantsPage'
import DataPendaftarPage from './pages/admin/ppdb/DataPendaftarPage'
import AdminProfilePage from './pages/admin/ProfilePage'
import SelectionPage from './pages/admin/ppdb/SelectionPage'
import DiskonasiPage from './pages/admin/ppdb/DiskonasiPage'
import Stage2PaymentsPage from './pages/admin/ppdb/Stage2PaymentsPage'
import * as api from './api/client'

export default function App() {
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    const loadFavicon = () => {
      fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.value && link) { link.href = data.value; link.type = '' } })
        .catch(() => { /* silently ignore if favicon is unavailable */ })
    }
    loadFavicon()
    const es = new EventSource(`${api.API_BASE}/companyprofile/events`)
    es.addEventListener('change', loadFavicon)
    return () => es.close()
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/login" element={<LoginPage />} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout><Outlet /></AdminLayout></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="data-pendaftar" element={<DataPendaftarPage />} />
              <Route path="applicants" element={<ApplicantsPage />} />
              <Route path="periods" element={<PeriodsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="selection" element={<SelectionPage />} />
              <Route path="diskonasi" element={<DiskonasiPage />} />
              <Route path="stage2-pembayaran" element={<Stage2PaymentsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            <Route path="/checkout" element={<ProtectedRoute role="applicant"><CheckoutPage /></ProtectedRoute>} />
            
            <Route path="/applicant" element={<ProtectedRoute role="applicant" requirePaid={true}><ApplicantDashboardPage /></ProtectedRoute>} />


            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
