'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSSE } from '@/app/hooks/useSSE'
import { eventBus } from '@/app/lib/event-bus'

export default function RealtimeWatcher({ module }: { module: string }) {
  const router = useRouter()

  useSSE(module)

  useEffect(() => {
    const handler = () => router.refresh()
    eventBus.on(`${module}:refresh`, handler)
    return () => eventBus.off(`${module}:refresh`, handler)
  }, [module, router])

  return null
}
