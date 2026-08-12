'use client'

import { useEffect, useRef } from 'react'
import { eventBus } from '@/app/lib/event-bus'

export function useSSE(module: string) {
  const reconnectRef = useRef(0)

  useEffect(() => {
    const maxReconnect = 5
    let es: EventSource | null = null

    function connect() {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://project-ppdb-murex.vercel.app'
      const url = `${API_BASE.replace(/\/$/, '')}/companyprofile/events`

      es = new EventSource(url)

      const handler = () => {
        eventBus.emit(`${module}:refresh`)
      }

      es.addEventListener('change', handler)

      es.onerror = () => {
        es?.close()
        reconnectRef.current++
        if (reconnectRef.current <= maxReconnect) {
          setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      es?.close()
    }
  }, [module])
}
