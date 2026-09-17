import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserFormPage from './pages/UserFormPage'
import RolesPage from './pages/RolesPage'
import RoleFormPage from './pages/RoleFormPage'
import ProfilePage from './pages/ProfilePage'
import ApplicantsPage from './pages/ApplicantsPage'
import ActivitiesPage from './pages/ActivitiesPage'
import NotificationsPage from './pages/NotificationsPage'
import NotFoundPage from './pages/NotFoundPage'
import * as api from './api/client'

export default function App() {
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    const loadFavicon = () => {
      fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.value && link) {
            link.href = data.value
            link.type = ''
          }
        })
        .catch(() => { /* keep default favicon if unavailable */ })
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
          {/* Public routes */}
          <Route path="/auth/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/new" element={<UserFormPage />} />
                    <Route path="/users/:id" element={<UserFormPage />} />
                    <Route path="/roles" element={<RolesPage />} />
                    <Route path="/roles/new" element={<RoleFormPage />} />
                    <Route path="/roles/:id" element={<RoleFormPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/applicants" element={<ApplicantsPage />} />
                    <Route path="/activities" element={<ActivitiesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
