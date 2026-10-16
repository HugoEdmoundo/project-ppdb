import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ProfilePage as SharedProfilePage, type ProfileSession } from '@repo/ui/profile'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading((prev) => (sessions.length === 0 ? true : prev))
      if (sessions.length > 0) setSessionsRefreshing(true)
      setSessionsError(null)
      const data = await api.getSessions()
      setSessions((data as any)?.sessions ?? (data as any) ?? [])
    } catch (err: any) {
      setSessionsError(err?.message || 'Gagal memuat sesi perangkat.')
    } finally {
      setSessionsLoading(false)
      setSessionsRefreshing(false)
    }
  }, [sessions.length])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions()
    }, 0)
    const id = window.setInterval(() => void loadSessions(), 60000)
    return () => {
      clearTimeout(timer)
      window.clearInterval(id)
    }
  }, [loadSessions])

  async function handleSubmit(payload: Record<string, string | undefined>) {
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string') clean[k] = v
    }
    await api.updateProfile(clean)
    await refreshUser()
  }

  async function handleRevoke(id: string) {
    try {
      setRevokingId(id)
      await api.revokeSession(id)
      await loadSessions()
      toast('success', 'Sesi perangkat berhasil diakhiri.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengakhiri sesi.')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <SharedProfilePage
      user={user}
      notify={(type, message) => {
        if (type === 'success') toast('success', message)
        else if (type === 'error') toast('error', message)
        else toast('warning', message)
      }}
      onUploadAvatar={api.uploadAvatar}
      onSubmit={handleSubmit}
      onBack={() => navigate(-1)}
      sessions={sessions}
      sessionsLoading={sessionsLoading}
      sessionsError={sessionsError}
      sessionsRefreshing={sessionsRefreshing}
      onRefreshSessions={loadSessions}
      onRevokeSession={handleRevoke}
      revokingSessionId={revokingId}
    />
  )
}