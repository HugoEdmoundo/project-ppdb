'use client'

import { type ReactNode, useEffect } from 'react'
import { useBrand } from '@repo/ui'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

export function Providers({ children }: { children: ReactNode }) {
  const { faviconUrl } = useBrand(API_BASE)

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (faviconUrl && link) {
      link.href = faviconUrl
      link.type = ''
    }
  }, [faviconUrl])

  return <>{children}</>
}
