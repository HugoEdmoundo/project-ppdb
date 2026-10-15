'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_AUTH, getMockUser } from '@/app/lib/api'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Dummy auth: isi sesi `admin_user` bila belum ada, supaya /admin bisa
    // dibuka langsung saat backend/DB belum jalan (NEXT_PUBLIC_MOCK_AUTH=true).
    if (MOCK_AUTH) getMockUser()
    const user = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null
    if (user) {
      router.replace('/admin/overview')
    } else {
      router.replace('/auth/login')
    }
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
