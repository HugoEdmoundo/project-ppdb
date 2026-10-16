import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { ErrorState } from '@repo/ui'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import ApplicantLayout from './layouts/ApplicantLayout'
import LoginPage from './pages/auth/LoginPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import ForbiddenPage from './pages/errors/ForbiddenPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import PeriodsPage from './pages/admin/ppdb/PeriodsPage'
import LandingPage from './pages/public/LandingPage'
import GlobeDemoPage from './pages/public/GlobeDemoPage'
import RegisterPage from './pages/public/RegisterPage'
import PublicReceiptPage from './pages/public/PublicReceiptPage'
import ApplicantReceiptPage from './pages/applicant/ReceiptPage'
import ApplicantDocumentsPage from './pages/applicant/DocumentsPage'
import SelectionStagePage from './pages/applicant/SelectionStagePage'
import ResultStagePage from './pages/applicant/ResultStagePage'
import DpStagePage from './pages/applicant/DpStagePage'
import ApplicantProfilePage from './pages/applicant/ProfilePage'
import Stage2PaymentPage from './pages/applicant/Stage2PaymentPage'
import CheckoutPage from './pages/applicant/CheckoutPage'
import ApplicantDashboardPage from './pages/applicant/DashboardPage'
import ExamCardPage from './pages/applicant/ExamCardPage'
import NotificationsPage from './pages/admin/notifications/NotificationsPage'
import DataPendaftarPage from './pages/admin/ppdb/DataPendaftarPage'
import AdminProfilePage from './pages/admin/ProfilePage'
import SelectionPage from './pages/admin/ppdb/SelectionPage'
import LoaSkdPage from './pages/admin/ppdb/LoaSkdPage'
import TIUSettingsPage from './pages/admin/ppdb/TIUSettingsPage'
import ArsipPendaftarPage from './pages/admin/ppdb/ArsipPendaftarPage'
import VerifikasiDokumenPage from './pages/admin/ppdb/VerifikasiDokumenPage'
import PembayaranFormulirPage from './pages/admin/ppdb/PembayaranFormulirPage'
import PembayaranTahap2Page from './pages/admin/ppdb/PembayaranTahap2Page'
import PembayaranTahap2DetailPage from './pages/admin/ppdb/PembayaranTahap2DetailPage'
import AdminReceiptPage from './pages/admin/ppdb/AdminReceiptPage'
import PenilaianPage from './pages/admin/ppdb/PenilaianPage'
import ReviewLoaPage from './pages/admin/ppdb/ReviewLoaPage'
import PublicLoaPage from './pages/public/PublicLoaPage'
import Sessions1on1Page from './pages/admin/ppdb/Sessions1on1Page'
import SessionEvaluationPage from './pages/admin/ppdb/SessionEvaluationPage'
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
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <ErrorState status={500} retry={resetErrorBoundary} fullscreen={false} />
        )}
      >
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
              <Route path="verifikasi-dokumen" element={<VerifikasiDokumenPage />} />
              <Route path="pembayaran-formulir" element={<PembayaranFormulirPage />} />
              <Route path="pembayaran-tahap2" element={<PembayaranTahap2Page />} />
              <Route path="pembayaran-tahap2/:applicantId" element={<PembayaranTahap2DetailPage />} />
              <Route path="pembayaran-tahap2/:applicantId/kuitansi/:id" element={<AdminReceiptPage />} />
              <Route path="kuitansi/:id" element={<AdminReceiptPage />} />
              <Route path="sessions" element={<Navigate to="/admin/sessions/tahfidz" replace />} />
              <Route path="sessions/tahfidz" element={<Sessions1on1Page forcedType="tahfidz" />} />
              <Route path="sessions/wawancara" element={<Sessions1on1Page forcedType="interview" />} />
              <Route path="sessions/:sessionType/evaluasi/:sessionId" element={<SessionEvaluationPage />} />
              <Route path="penilaian" element={<PenilaianPage />} />
              <Route path="review-loa" element={<ReviewLoaPage />} />
              <Route path="arsip" element={<ArsipPendaftarPage />} />
              <Route path="periods" element={<PeriodsPage />} />
              <Route path="tiu-settings" element={<TIUSettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="selection" element={<SelectionPage />} />
              <Route path="rubrik" element={<SelectionPage />} />
              <Route path="pengumuman" element={<LoaSkdPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            <Route path="/checkout" element={<ProtectedRoute role="applicant"><CheckoutPage /></ProtectedRoute>} />

            {/* Public Kuitansi & LoA Resmi via Direct / QR Link */}
            <Route path="/kuitansi/:id" element={<PublicReceiptPage />} />
            <Route path="/receipt/:id" element={<PublicReceiptPage />} />
            <Route path="/loa/:registrationNo" element={<PublicLoaPage />} />

            {/* Applicant portal: satu chrome (DashboardShell) untuk semua halaman.
                Kartu Ujian & checkout tetap mandiri (tampilan print / paywall). */}
            <Route path="/applicant" element={<ProtectedRoute role="applicant" requirePaid={true}><ApplicantLayout><Outlet /></ApplicantLayout></ProtectedRoute>}>
              <Route index element={<ApplicantDashboardPage />} />
              <Route path="kuitansi" element={<ApplicantReceiptPage />} />
              <Route path="dokumen" element={<ApplicantDocumentsPage />} />
              <Route path="ujian-tiu" element={<SelectionStagePage section="tiu" title="Ujian TIU Online" subtitle="Tes Skolastik & Akademik via Safe Exam Browser (SEB)" />} />
              <Route path="seleksi-tahfidz" element={<SelectionStagePage section="tahfidz" title="Seleksi Tahfidz (1:1)" subtitle="Jadwal dan ujian tartil serta tahfidz Al-Qur'an" />} />
              <Route path="seleksi-wawancara" element={<SelectionStagePage section="interview" title="Seleksi Wawancara (1:1)" subtitle="Wawancara calon santri dan orang tua/wali" />} />
              <Route path="pengumuman" element={<ResultStagePage />} />
              <Route path="bayar-dp" element={<DpStagePage />} />
              <Route path="pembayaran-tahap2" element={<Stage2PaymentPage />} />
              <Route path="profile" element={<ApplicantProfilePage />} />
            </Route>
            <Route path="/applicant/kartu-ujian" element={<ProtectedRoute role="applicant" requirePaid={true}><ExamCardPage /></ProtectedRoute>} />

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
