import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProfileSession } from './types'

export interface UseDeviceSessionsOptions {
  /** Ambil daftar sesi dari API (harus mengembalikan array ProfileSession). */
  fetchSessions: () => Promise<ProfileSession[]>
  /** Cabut satu sesi (DELETE). Opsional — kalau tidak ada, tombol tidak tampil. */
  revokeSession?: (id: string) => Promise<unknown> | unknown
  /** Toast opsional untuk umpan balik revoke. */
  notify?: (type: 'success' | 'error' | 'warning', message: string) => void
  /** Auto-refresh ringan; 0 = matikan. Default 60000 ms. */
  autoRefreshMs?: number
  /** Mulai memuat saat mount. Default true. */
  enabled?: boolean
}

export interface UseDeviceSessionsResult {
  sessions: ProfileSession[]
  loading: boolean
  refreshing: boolean
  error: string | null
  revokingId: string | null
  reload: () => void
  revoke: (id: string) => Promise<void>
}

/**
 * Kelola state "Sesi Perangkat": muat daftar, auto-refresh berkala, dan cabut
 * sesi lain. Fetcher disuntik dari app supaya hook ini tidak terikat ke satu
 * API client.
 */
export function useDeviceSessions({
  fetchSessions,
  revokeSession,
  notify,
  autoRefreshMs = 60_000,
  enabled = true,
}: UseDeviceSessionsOptions): UseDeviceSessionsResult {
  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [loading, setLoading] = useState(enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const loadedOnceRef = useRef(false)
  const fetchRef = useRef(fetchSessions)
  fetchRef.current = fetchSessions

  const load = useCallback(async () => {
    if (loadedOnceRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchRef.current()
      if (!mountedRef.current) return
      setSessions(Array.isArray(data) ? data : [])
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (!mountedRef.current) return
      setError((err as Error)?.message || 'Gagal memuat sesi perangkat.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) {
      setLoading(false)
      return () => {
        mountedRef.current = false
      }
    }
    void load()
    return () => {
      mountedRef.current = false
    }
  }, [enabled, load])

  useEffect(() => {
    if (!enabled || !autoRefreshMs) return
    const id = window.setInterval(() => void load(), autoRefreshMs)
    return () => window.clearInterval(id)
  }, [enabled, autoRefreshMs, load])

  const revoke = useCallback(
    async (id: string) => {
      if (!revokeSession) return
      setRevokingId(id)
      try {
        await revokeSession(id)
        if (mountedRef.current) {
          setSessions((prev) => prev.filter((s) => s.id !== id))
        }
        notify?.('success', 'Sesi perangkat berhasil diakhiri.')
      } catch (err) {
        notify?.('error', (err as Error)?.message || 'Gagal mengakhiri sesi.')
      } finally {
        if (mountedRef.current) setRevokingId(null)
      }
    },
    [revokeSession, notify],
  )

  return {
    sessions,
    loading,
    refreshing,
    error,
    revokingId,
    reload: () => void load(),
    revoke,
  }
}
