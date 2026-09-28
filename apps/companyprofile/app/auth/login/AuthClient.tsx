'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { login } from '@/app/lib/api'
import { AuthCard, AuthRecovery, useBrand } from '@repo/ui'
import { API_BASE } from '@/app/lib/api'

export default function AuthClient() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successName, setSuccessName] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)

  // Logo dinamis via useBrand (GET /companyprofile/settings/logo + live SSE).
  const { logoUrl } = useBrand(API_BASE)

  const handleLogin = async (username: string, password: string) => {
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      setSuccessName(username)
      setSuccess(true)
      setTimeout(() => router.push('/admin/overview'), 500)
    } catch (err: unknown) {
      setSuccess(false)
      const msg = err instanceof Error ? err.message : 'Login gagal'
      setError(msg || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-pattern-dots opacity-[0.35]" />
      <div className="pointer-events-none absolute top-20 right-20 w-72 h-72 rounded-full bg-[var(--accent-subtle)] opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-20 w-96 h-96 rounded-full bg-[var(--color-gold-subtle)] opacity-30 blur-3xl" />

      <AuthCard
        title="Selamat Datang"
        subtitle="Sistem PTDARRAHMAN"
        logoUrl={logoUrl || undefined}
        loading={loading}
        success={success}
        error={error}
        successName={successName}
        onSubmit={handleLogin}
        submitText="Masuk"
        forgotText="Lupa username atau password?"
        onForgotClick={() => setShowRecovery(true)}
        badgeText="Akses Terbatas"
        badgeIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#D4A853]" />}
      />
      <AuthRecovery open={showRecovery} onClose={() => setShowRecovery(false)} apiBase={API_BASE} />
    </div>
  )
}
