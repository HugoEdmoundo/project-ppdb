'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'

interface RealtimeState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useRealtimeData<T>(
  module: string,
  fetcher: () => Promise<T>,
): RealtimeState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)

  useSSE(module)

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setError(null)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetcherRef.current = fetcher
    // eslint-disable-next-line react-hooks/set-state-in-effect
    doFetch()
  }, [fetcher, doFetch])

  useEffect(() => {
    const handler = () => {
      setLoading(true)
      doFetch()
    }
    eventBus.on(`${module}:refresh`, handler)
    return () => eventBus.off(`${module}:refresh`, handler)
  }, [module, doFetch])

  return { data, loading, error, refetch: doFetch }
}
