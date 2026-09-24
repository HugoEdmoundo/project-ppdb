import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  waGetLogs, waGetQueueStats, waGetStatus, waInitSession,
  waLogoutSession, waSendTest, waCancelPairing,
  type WALogEntry, type WAProxyStatus, type WAQueueStats,
} from '../api/client'
import PageHero from '../components/PageHero'
import SessionCard from '../components/whatsapp/SessionCard'
import QueueStats from '../components/whatsapp/QueueStats'
import LogsPanel from '../components/whatsapp/LogsPanel'
import type { LoginMethod } from '../components/whatsapp/constants'

export default function WhatsAppPage() {
  const [session, setSession] = useState<WAProxyStatus | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [queueStats, setQueueStats] = useState<WAQueueStats | null>(null)

  const [logs, setLogs] = useState<WALogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsStatus, setLogsStatus] = useState('')
  const [logsLoading, setLogsLoading] = useState(true)

  // Form test (hanya saat READY)
  const [testPhone, setTestPhone] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Opsi login: scan QR (default) atau nomor HP + pairing code
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('qr')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initPollRef = useRef<number[]>([])

  // ── Fetch helpers ──────────────────────────────────────────────────────

  const fetchSession = useCallback(async (silent = false) => {
    if (!silent) setSessionLoading(true)
    try {
      const data = await waGetStatus()
      setSession(data)
    } catch {
      setSession(null)
    } finally {
      if (!silent) setSessionLoading(false)
    }
  }, [])

  const fetchQueueStats = useCallback(async () => {
    try {
      const res = await waGetQueueStats()
      if (res?.success && res?.data) setQueueStats(res.data)
    } catch { /* ignore */ }
  }, [])

  const fetchLogs = useCallback(async (page = 1, status = '') => {
    setLogsLoading(true)
    try {
      const res = await waGetLogs({ page, perPage: 10, status: status || undefined })
      if (res?.success) {
        setLogs(res.data || [])
        setLogsTotal(res.total || 0)
        setLogsTotalPages(res.totalPages || 1)
      }
    } catch { /* ignore */ } finally {
      setLogsLoading(false)
    }
  }, [])

  // ── Initial load + polling 8 detik ─────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSession()
    fetchQueueStats()
    fetchLogs(1, '')

    pollRef.current = setInterval(() => {
      fetchSession(true)
      fetchQueueStats()
    }, 8_000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      initPollRef.current.forEach(clearTimeout)
    }
  }, [fetchSession, fetchQueueStats, fetchLogs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs(logsPage, logsStatus)
  }, [logsPage, logsStatus, fetchLogs])

  // ── Actions ────────────────────────────────────────────────────────────

  // Kembali ke mode 'phone' jika masih ada pairing code aktif dari sesi lalu
  useEffect(() => {
    if (session?.status === 'qr' && session?.pairingCode && loginMethod === 'qr') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoginMethod('phone')
    }
  }, [session?.status, session?.pairingCode, loginMethod])

  async function handleInit() {
    initPollRef.current.forEach(clearTimeout)
    initPollRef.current = []
    setActionLoading(true); setActionMsg(null)
    try {
      const res = await waInitSession()
      setActionMsg({ type: 'success', text: res?.message || 'Inisialisasi dimulai. Scan QR yang muncul.' })
      // Pantau status lebih cepat di awal (buat QR langsung muncul) tanpa
      // mengandalkan interval 8 detik berikutnya.
      const delays = [500, 1_500, 3_000]
      initPollRef.current = delays.map(d => window.setTimeout(() => fetchSession(true), d))
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Putus koneksi akan menghapus sesi WhatsApp dan wajib scan QR ulang. Lanjutkan?')) return
    setActionLoading(true); setActionMsg(null)
    try {
      const res = await waLogoutSession()
      setActionMsg({ type: 'success', text: res?.message || 'Sesi WhatsApp diputus.' })
      await fetchSession()
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) {
      setActionMsg({ type: 'error', text: 'Masukkan nomor telepon tujuan terlebih dahulu.' })
      return
    }
    setSendingTest(true); setActionMsg(null)
    try {
      const res = await waSendTest(testPhone.trim())
      if (res?.success) {
        setActionMsg({ type: 'success', text: res?.message || 'Pesan uji coba berhasil dikirim!' })
        setTestPhone('')
      } else {
        setActionMsg({ type: 'error', text: res?.error || res?.message || 'Gagal mengirim pesan uji coba.' })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setSendingTest(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  function handleMethodChange(method: LoginMethod) {
    if (method === 'qr' && loginMethod === 'phone' && session?.pairingCode) {
      waCancelPairing()
        .catch(() => { /* ignore */ })
        .finally(() => fetchSession(true))
    }
    setLoginMethod(method)
  }

  function handleLogsStatus(s: string) {
    setLogsLoading(true)
    setLogsStatus(s)
    setLogsPage(1)
  }

  function handleLogsPage(p: number) {
    setLogsLoading(true)
    setLogsPage(p)
  }

  function handleLogsRefresh() {
    setLogsLoading(true)
    fetchLogs(logsPage, logsStatus)
  }

  const statusLabel = session?.status ?? 'OFFLINE'
  const isReady = statusLabel === 'ready'
  const isActive = ['initializing', 'qr', 'authenticated', 'ready'].includes(statusLabel)
  const notConfigured = session?.configured === false
  const webhookMismatch = session?.webhookMismatch === true

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Konfigurasi"
        title="WhatsApp"
        description="Kelola sesi WhatsApp untuk notifikasi PPDB"
      />

      {/* Konfigurasi backend belum lengkap */}
      {notConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Konfigurasi Backend Belum Lengkap</p>
            <p className="text-sm text-amber-700 mt-1">
              Tambahkan variabel berikut ke <code className="bg-amber-100 px-1 rounded">apps/api/.env</code>:
            </p>
            <pre className="mt-3 rounded-lg bg-amber-100 p-3 text-xs font-mono text-amber-900 whitespace-pre-wrap">
{`API_BASE_URL=http://localhost:8000
WA_SERVICE_URL=http://localhost:3100
WA_SERVICE_API_KEY=<api-key-yang-sama-dengan-apps/whatsapp/.env>`}
            </pre>
            <p className="text-xs text-amber-600 mt-2">Restart backend setelah mengubah .env.</p>
          </div>
        </div>
      )}

      {/* Hint webhook mismatch */}
      {!notConfigured && webhookMismatch && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Konfigurasi Webhook Mismatch</p>
            <p className="text-sm text-amber-700 mt-1">
              WA microservice mengarahkan callback ke <code className="bg-amber-100 px-1 rounded">{session?.webhookUrl || '—'}</code>,
              tetapi API ini diharapkan menerima di{' '}
              <code className="bg-amber-100 px-1 rounded">{session?.expectedWebhookUrl || '—'}</code>.
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Perbaiki <code className="bg-amber-100 px-1 rounded">WEBHOOK_URL</code> di{' '}
              <code className="bg-amber-100 px-1 rounded">apps/whatsapp/.env</code> agar status pengiriman tercatat.
            </p>
          </div>
        </div>
      )}

      {/* Action feedback */}
      {actionMsg && (
        <div className={cn(
          'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
          actionMsg.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        )}>
          {actionMsg.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-auto text-current/60 hover:text-current">✕</button>
        </div>
      )}

      {/* Alert service offline */}
      {!notConfigured && statusLabel === 'OFFLINE' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Layanan WhatsApp Microservice Belum Dijalankan
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            WhatsApp Gateway berjalan sebagai service di port 3100. Jalankan dari root monorepo:
          </p>
          <div className="bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-xs font-mono select-all inline-block">
            cd apps/whatsapp && npm run dev
          </div>
          <p className="text-[11px] text-slate-500">
            *Setelah service menyala, tombol scan QR akan otomatis aktif.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Session + Test + Health ── */}
        <div className="lg:col-span-1">
          <SessionCard
            session={session}
            sessionLoading={sessionLoading}
            actionLoading={actionLoading}
            loginMethod={loginMethod}
            isReady={isReady}
            isActive={isActive}
            testPhone={testPhone}
            sendingTest={sendingTest}
            statusLabel={statusLabel}
            onMethodChange={handleMethodChange}
            onInit={handleInit}
            onDisconnect={handleDisconnect}
            onRefreshStatus={fetchSession}
            onTestPhoneChange={setTestPhone}
            onSendTest={handleSendTest}
          />
        </div>

        {/* ── Right: Stats + Logs ── */}
        <div className="lg:col-span-2 space-y-6">
          <QueueStats stats={queueStats} onRefresh={fetchQueueStats} />
          <LogsPanel
            logs={logs}
            total={logsTotal}
            totalPages={logsTotalPages}
            page={logsPage}
            status={logsStatus}
            loading={logsLoading}
            onPage={handleLogsPage}
            onStatus={handleLogsStatus}
            onRefresh={handleLogsRefresh}
          />
        </div>
      </div>
    </div>
  )
}