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
import GlobeDemoPage from './pages/public/GlobeDemoPage'
import RegisterPage from './pages/public/RegisterPage'
import CheckoutPage from './pages/applicant/CheckoutPage'
import ApplicantDashboardPage from './pages/applicant/DashboardPage'
import ExamCardPage from './pages/applicant/ExamCardPage'
import NotificationsPage from './pages/admin/notifications/NotificationsPage'
import DataPendaftarPage from './pages/admin/ppdb/DataPendaftarPage'
import AdminProfilePage from './pages/admin/ProfilePage'
import SelectionPage from './pages/admin/ppdb/SelectionPage'
import MouPage from './pages/admin/ppdb/MouPage'
import DiskonasiPage from './pages/admin/ppdb/DiskonasiPage'
import DocumentSettingsPage from './pages/admin/ppdb/DocumentSettingsPage'
import TIUSettingsPage from './pages/admin/ppdb/TIUSettingsPage'
import ArsipPendaftarPage from './pages/admin/ppdb/ArsipPendaftarPage'
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
            <Route path="/globe" element={<GlobeDemoPage />} />
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Alias: /applicant/login -> /auth/login untuk user yang salah ketik URL */}
            <Route path="/applicant/login" element={<Navigate to="/auth/login" replace />} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout><Outlet /></AdminLayout></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="data-pendaftar" element={<DataPendaftarPage />} />
              <Route path="arsip" element={<ArsipPendaftarPage />} />
              <Route path="periods" element={<PeriodsPage />} />
              <Route path="document-settings" element={<DocumentSettingsPage />} />
              <Route path="tiu-settings" element={<TIUSettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="selection" element={<SelectionPage />} />
              <Route path="mou" element={<MouPage />} />
              <Route path="diskonasi" element={<DiskonasiPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            <Route path="/checkout" element={<ProtectedRoute role="applicant"><CheckoutPage /></ProtectedRoute>} />

            <Route path="/applicant" element={<ProtectedRoute role="applicant" requirePaid={true}><ApplicantDashboardPage /></ProtectedRoute>} />
            <Route path="/applicant/kartu-ujian" element={<ProtectedRoute role="applicant" requirePaid={true}><ExamCardPage /></ProtectedRoute>} />
            <Route path="/applicant/ujian-tiu" element={<Navigate to="/applicant" replace />} />

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
