'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Lock, User, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import AnimatedLogo from '../components/ui/AnimatedLogo'
import { API_BASE, getSettings } from '../lib/api'

export default function AuthClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [logoUrl, setLogoUrl] = useState('/logo.png')

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const logo = settings.find((s) => s.key === 'logo')?.value
        if (logo) setLogoUrl(logo)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email dan password harus diisi')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login gagal' }))
        throw new Error(err.detail || 'Login gagal')
      }
      const data = await res.json()
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_user', JSON.stringify(data.user || {}))
      }
      setSuccess(true)
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://app.ptdarrahman.sch.id'
      }, 900)
    } catch (err: any) {
      setSuccess(false)
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.35]" />
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-[var(--accent-subtle)] opacity-40 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-[var(--color-gold-subtle)] opacity-30 blur-3xl" />

      <div className="glass-card p-8 md:p-10 text-center max-w-sm w-full relative z-10 rounded-2xl shadow-xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--accent)] via-[var(--accent-gold)] to-[var(--accent)]" />

        <div className="flex justify-center mb-6">
          <AnimatedLogo
            src={logoUrl}
            alt="PTDARRAHMAN Logo"
            className="h-12 w-auto"
          />
        </div>

        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] mb-1">
          Selamat Datang
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Masuk untuk mengakses platform
        </p>

        <div className="mb-7 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--accent-gold)]" />
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-gold)]">
            Portal Peserta
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--accent-gold)]" />
        </div>

        {success && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#1A6B47]/25 bg-[#E8F5EE] px-4 py-3 text-left text-xs font-medium text-[#135235]"
            style={{ animation: 'modalIn 0.25s ease-out' }}
          >
            <CheckCircle2 className="mt-px w-4 h-4 shrink-0" />
            <span>Login berhasil — mengalihkan Anda...</span>
          </div>
        )}
        {error && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs font-medium text-red-600"
            style={{ animation: 'modalIn 0.25s ease-out' }}
          >
            <AlertCircle className="mt-px w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Email / Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="auth-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl border border-[var(--border)] bg-white/80 pl-9 pr-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
                placeholder="Masukkan email atau username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                id="auth-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl border border-[var(--border)] bg-white/80 pl-9 pr-10 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
                placeholder="Masukkan kata sandi"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                tabIndex={-1}
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !email.trim() || !password.trim()} className="btn-primary w-full justify-center disabled:opacity-60">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </span>
            ) : (
              <>
                Masuk ke Portal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
