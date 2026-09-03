'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TOKEN_KEY = 'admin_token'
const REFRESH_KEY = 'admin_refresh'
const USER_KEY = 'admin_user'

export default function CrossTabSync() {
  const router = useRouter()
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
        localStorage.removeItem(USER_KEY)
        router.push('/admin/login')
      }
      if ((e.key === TOKEN_KEY && e.oldValue !== e.newValue) || (e.key === USER_KEY && e.oldValue !== e.newValue)) {
        window.location.reload()
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [router])
  return null
}
