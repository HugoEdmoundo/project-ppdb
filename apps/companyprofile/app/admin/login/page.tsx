'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/app/lib/api'
import { LockKeyhole, Eye, EyeOff, User, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      setSuccess(true)
      setTimeout(() => router.push('/admin/overview'), 900)
    } catch (e: unknown) {
      setSuccess(false)
      const msg = e instanceof Error ? e.message : 'Login gagal. Periksa username dan password.'
      setError(msg || 'Login gagal. Periksa username dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-8">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.35]" />

      {/* Decorative orbs */}
      <div className="absolute -top-24 -right-24 md:-top-32 md:-right-32 w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full bg-[var(--accent-subtle)] opacity-20 md:opacity-30 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 md:-bottom-40 md:-left-40 w-[350px] h-[350px] md:w-[500px] md:h-[500px] rounded-full bg-[var(--color-gold-subtle)] opacity-20 md:opacity-25 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[250px] h-[250px] md:w-[350px] md:h-[350px] rounded-full bg-[var(--accent)]/5 blur-3xl" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="relative">
          <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-[var(--accent-gold)]/5 rounded-3xl blur-xl" />

          <div className="relative bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-8 md:p-10 text-center overflow-hidden">
            {/* Verse strip — brand line */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--accent)] via-[var(--accent-gold)] to-[var(--accent)]" />

            {/* Logo icon */}
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 flex items-center justify-center">
              <LockKeyhole className="w-6 h-6 text-[var(--accent)]" />
            </div>

            <h1 className="font-[var(--font-display)] text-2xl md:text-3xl font-semibold text-[var(--text)] mb-1">
              Panel Admin
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-muted)] mb-3">
              Pesantren Tahfidz Qur&apos;an &amp; Digital
            </p>

            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--accent-gold)]" />
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                Akses Terbatas
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
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Username / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-11 rounded-xl border border-[var(--border)] bg-white/80 pl-9 pr-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
                    placeholder="Masukkan username atau email"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-xl border border-[var(--border)] bg-white/80 pl-9 pr-10 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-subtle)]"
                    placeholder="Masukkan password"
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

              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  'Masuk ke Panel'
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          PTDARRAHMAN · Sistem Manajemen Konten
        </p>
      </div>
    </div>
  )
}
