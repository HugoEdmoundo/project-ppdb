'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { login, getSettings } from '@/app/lib/api'
import { AuthCard } from '@repo/ui'

export default function AuthClient() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successName, setSuccessName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string>('')

  // Load logo dynamis (tidak ada aset logo statis) — fallback ke text mark.
  useEffect(() => {
    getSettings()
      .then((settings) => {
        const logo = settings.find((s) => s.key === 'logo')?.value
        if (logo) setLogoUrl(logo)
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (username: string, password: string) => {
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      setSuccessName(username)
      setSuccess(true)
      setTimeout(() => router.push('/admin/overview'), 900)
    } catch (err: unknown) {
      setSuccess(false)
      const msg = err instanceof Error ? err.message : 'Login gagal'
      setError(msg || 'Login gagal')
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

      <AuthCard
        title="Selamat Datang"
        logoUrl={logoUrl || undefined}
        loading={loading}
        success={success}
        error={error}
        successName={successName}
        onSubmit={handleLogin}
        submitText="Masuk ke Dasbor"
        badgeText="Panel Admin"
        badgeIcon={<ShieldCheck className="w-3.5 h-3.5 text-[#D4A853]" />}
      />
    </div>
  )
}

