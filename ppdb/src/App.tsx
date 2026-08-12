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
import * as api from './api/client'

export default function App() {
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
      .then(res => res.json())
      .then(data => { if (data?.value && link) link.href = data.value; else if (link) link.href = '/download.png' })
      .catch(() => { if (link) link.href = '/download.png' })
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout><Outlet /></AdminLayout></ProtectedRoute>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="periods" element={<PeriodsPage />} />
            </Route>

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
