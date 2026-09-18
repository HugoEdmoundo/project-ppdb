'use client'

// Redirect shim — rute /admin/login dialihkan ke /auth/login agar tidak ada
// dua halaman login yang berbeda. Semua auth guard sudah diperbarui ke
// /auth/login, tapi shim ini mencegah 404 jika ada bookmark atau link lama
// yang masih menunjuk ke /admin/login.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)]">
      <svg className="animate-spin w-6 h-6 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}
