'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const USER_KEY = 'admin_user'

export default function CrossTabSync() {
  const router = useRouter()
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === USER_KEY && !e.newValue) {
        localStorage.removeItem(USER_KEY)
        router.push('/auth/login')
      }
      if (e.key === USER_KEY && e.oldValue !== e.newValue) {
        window.location.reload()
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [router])
  return null
}
