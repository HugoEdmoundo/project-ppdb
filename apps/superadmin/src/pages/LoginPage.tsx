import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE } from '../api/client'
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import AnimatedLogo from '../components/AnimatedLogo'
import { useBrand } from '@repo/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPw, setShowPw] = useState(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi')
      return
    }
    setError('')
    setLoading(true)
    try {
      const loggedInUser = await login(username, password)
      setSuccessName(loggedInUser?.full_name || loggedInUser?.username || username)
      setSuccess(true)
      setRedirecting(true)
      setTimeout(() => navigate('/', { replace: true }), 1200)
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

      <div className="glass-card p-8 md:p-10 text-center max-w-sm w-full relative z-10 rounded-2xl shadow-xl overflow-hidden">
        {/* Gold top strip */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--color-emerald)] via-[var(--color-gold)] to-[var(--color-emerald)]" />

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          {logoUrl ? (
            <AnimatedLogo src={logoUrl} alt="PTDARRAHMAN Logo" className="h-12 w-auto" />
          ) : (
            <span className="h-12 w-12 rounded-2xl bg-[var(--color-emerald)] flex items-center justify-center shadow-lg shadow-[var(--color-emerald)]/20">
              <span className="text-white font-[var(--font-display)] font-bold text-2xl select-none">A</span>
            </span>
          )}
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] mb-1">Selamat Datang</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-3">Masuk untuk mengakses platform</p>

        {/* Divider */}
        <div className="mb-7 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--color-gold)]" />
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-gold)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Akses Terbatas</span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--color-gold)]" />
        </div>

        {/* Alert */}
        {success && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#1A6B47]/25 bg-[#E8F5EE] px-4 py-3 text-left text-xs font-medium text-[#135235]" style={{ animation: 'modalIn 0.25s ease-out' }}>
            <CheckCircle2 className="mt-px w-4 h-4 shrink-0" />
            <span>
              Login berhasil! Selamat datang,{' '}
              <strong>{successName}</strong>.{' '}
              Mengalihkan ke panel…
            </span>
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs font-medium text-red-600" style={{ animation: 'modalIn 0.25s ease-out' }}>
            <AlertCircle className="mt-px w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label htmlFor="superadmin-username" className="block text-xs font-semibold text-[var(--text)] mb-1.5">Email / Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="superadmin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-white/80 pl-9 pr-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--color-emerald)] focus:shadow-[0_0_0_3px_var(--color-emerald-subtle)]"
                placeholder="Masukkan username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="superadmin-password" className="block text-xs font-semibold text-[var(--text)] mb-1.5">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="superadmin-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl border border-[var(--color-border)] bg-white/80 pl-9 pr-10 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--color-emerald)] focus:shadow-[0_0_0_3px_var(--color-emerald-subtle)]"
                placeholder="Masukkan kata sandi"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                tabIndex={-1}
                aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success || !username.trim() || !password.trim()}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </span>
            ) : (
              <>
                Masuk ke Panel
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Forgot password hint */}
          <p className="pt-2 text-[11px] text-[var(--text-muted)]">
            Lupa password? Hubungi administrator.
          </p>
        </form>
      </div>
    </div>
  )
}
