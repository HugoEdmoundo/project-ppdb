import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../api/client'
import { ShieldCheck } from 'lucide-react'
import { useBrand, AuthCard } from '@repo/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  // Logo diambil dinamis via hook useBrand (fetch /companyprofile/settings/logo
  // + live-update via SSE). Tidak ada aset logo statis — fallback text mark.
  const { logoUrl } = useBrand(API_BASE)
  const [successName, setSuccessName] = useState('')

  const isSuperadmin = !!user && (user.user_type === 'superadmin' || !!user.is_superadmin)

  // If already logged in as superadmin, redirect.
  // Jangan redirect user dengan session tersimpan yang BUKAN superadmin
  // (mis. sisa localStorage lama) — itu bikin loop /auth/login ↔ / (ProtectedRoute
  // menolak non-superadmin, LoginPage malah me-redirect balik ke /).
  useEffect(() => {
    if (isSuperadmin && !redirecting) {
      navigate('/', { replace: true })
    }
  }, [isSuperadmin, navigate, redirecting])

  if (isSuperadmin && !redirecting) {
    return null
  }

  async function handleLogin(username: string, password: string) {
    setError('')
    setLoading(true)
    try {
      const loggedInUser = await login(username, password)
      setSuccessName(loggedInUser?.full_name || loggedInUser?.username || username)
      setSuccess(true)
      setRedirecting(true)
      setTimeout(() => navigate('/', { replace: true }), 500)
    } catch (e: any) {
      setSuccess(false)
      setError(e.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)] px-4 py-8 relative overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-emerald-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />
      {/* Dots pattern */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.35]" />
      {/* Decorative orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-[var(--color-emerald-subtle)] opacity-40 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-[var(--color-gold-subtle)] opacity-30 blur-3xl" />

      <AuthCard
        title="Selamat Datang"
        subtitle="sistem ptdarrahman"
        logoUrl={logoUrl || undefined}
        loading={loading}
        success={success}
        error={error}
        successName={successName}
        onSubmit={handleLogin}
        submitText="Masuk ke Panel"
        forgotText="Lupa password? Hubungi administrator."
        badgeText="Akses Terbatas"
        badgeIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#D4A853]" />}
      />
    </div>
  )
}
