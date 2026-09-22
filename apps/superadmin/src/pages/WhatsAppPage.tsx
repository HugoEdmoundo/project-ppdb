import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Wifi, WifiOff, RefreshCw, LogOut, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Activity,
  ChevronLeft, ChevronRight, Loader2,
  QrCode, PhoneCall, Server, BarChart3, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  waGetSession, waInitSession, waLogoutSession, waDestroySession,
  waGetQrImage, waGetQueueStats, waGetLogs, waGetHealth, waGetQrSseUrl,
  WA_API_KEY,
  type WASessionInfo, type WAQueueStats, type WALogEntry,
} from '../api/client'
import PageHero from '../components/PageHero'

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META: Record<WASessionInfo['status'], {
  label: string; color: string; dot: string; icon: React.ElementType
}> = {
  initializing: { label: 'Inisialisasi...', color: 'text-slate-500', dot: 'bg-slate-400', icon: Loader2 },
  qr:           { label: 'Menunggu Scan QR', color: 'text-amber-600', dot: 'bg-amber-400', icon: QrCode },
  authenticated:{ label: 'Mengautentikasi...', color: 'text-blue-600', dot: 'bg-blue-400', icon: Loader2 },
  ready:        { label: 'Terhubung', color: 'text-emerald-600', dot: 'bg-emerald-400', icon: CheckCircle2 },
  disconnected: { label: 'Terputus', color: 'text-red-500', dot: 'bg-red-400', icon: WifiOff },
  destroyed:    { label: 'Tidak Aktif', color: 'text-slate-400', dot: 'bg-slate-300', icon: XCircle },
}

const LOG_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  queued:         { label: 'Antrian', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  sent:           { label: 'Terkirim', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  failed:         { label: 'Gagal', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  invalid_number: { label: 'No. Tidak Valid', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

// ── QR Panel ───────────────────────────────────────────────────────────────

function QrPanel({
  status,
  onRefreshQr,
}: {
  status: WASessionInfo
  onRefreshQr: () => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)

  // SSE — realtime QR updates
  useEffect(() => {
    if (!WA_API_KEY) return

    const url = new URL(waGetQrSseUrl())
    // Tambahkan key sebagai query param agar SSE bisa diauth
    // (browser tidak support custom header di EventSource)

    const es = new EventSource(url.toString())

    es.addEventListener('qr', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.qrCode) setQrDataUrl(data.qrCode)
        setQrError(null)
      } catch { /* ignore */ }
    })

    es.addEventListener('ready', () => {
      setQrDataUrl(null)
    })

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.qrCode) setQrDataUrl(data.qrCode)
        if (data?.status === 'ready') setQrDataUrl(null)
      } catch { /* ignore */ }
    })

    es.onerror = () => {
      // SSE gagal (mungkin karena butuh auth header, coba one-shot fallback)
    }

    sseRef.current = es
    return () => es.close()
  }, [])

  // Fallback one-shot fetch jika SSE tidak bisa bawa header
  const loadQr = useCallback(async () => {
    const res = await waGetQrImage()
    if (res.success && res.data.qrCode) return res.data.qrCode
    return null
  }, [])

  const fetchQrImage = useCallback(async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const qr = await loadQr()
      if (qr) setQrDataUrl(qr)
    } catch (err) {
      setQrError((err as Error).message)
    } finally {
      setQrLoading(false)
    }
  }, [loadQr])

  useEffect(() => {
    if (status.status !== 'qr' || qrDataUrl) return
    let active = true
    loadQr()
      .then((qr) => {
        if (active && qr) setQrDataUrl(qr)
      })
      .catch((err) => {
        if (active) setQrError((err as Error).message)
      })
      .finally(() => {
        if (active) setQrLoading(false)
      })
    return () => { active = false }
  }, [status.status, qrDataUrl, loadQr])

  if (status.status === 'ready') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="rounded-full bg-emerald-100 p-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-800">WhatsApp Terhubung</p>
          {status.phone && (
            <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1">
              <PhoneCall className="h-3.5 w-3.5" />
              +{status.phone}
              {status.pushName && <span className="text-slate-400">({status.pushName})</span>}
            </p>
          )}
          {status.connectedAt && (
            <p className="text-xs text-slate-400 mt-1">Terhubung sejak {fmtDate(status.connectedAt)}</p>
          )}
        </div>
      </div>
    )
  }

  if (status.status === 'qr' || qrDataUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-slate-600 text-center">
          Buka <strong>WhatsApp</strong> di HP → Perangkat Tertaut → Tautkan Perangkat → Scan QR
        </p>
        <div className="relative">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="WhatsApp QR Code"
              className="w-52 h-52 rounded-xl border-2 border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
              {qrLoading
                ? <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                : <QrCode className="h-10 w-10 text-slate-300" />
              }
            </div>
          )}
        </div>
        {qrError && (
          <p className="text-xs text-red-500">{qrError}</p>
        )}
        <Button variant="outline" size="sm" onClick={() => { fetchQrImage(); onRefreshQr() }} disabled={qrLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", qrLoading && "animate-spin")} />
          Refresh QR
        </Button>
        <p className="text-xs text-slate-400">QR berlaku ~60 detik. Klik Refresh jika kadaluarsa.</p>
      </div>
    )
  }

  if (status.status === 'initializing' || status.status === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-600">
          {status.status === 'initializing' ? 'Menginisialisasi sesi WhatsApp...' : 'Mengautentikasi...'}
        </p>
        <p className="text-xs text-slate-400">Mohon tunggu, proses ini mungkin memakan waktu ~30 detik</p>
      </div>
    )
  }

  // disconnected / destroyed / default
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="rounded-full bg-slate-100 p-4">
        <WifiOff className="h-10 w-10 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700">Session Tidak Aktif</p>
        <p className="text-sm text-slate-500 mt-1">Klik tombol Hubungkan untuk memulai sesi baru</p>
      </div>
    </div>
  )
}

// ── Queue Stats ────────────────────────────────────────────────────────────

function QueueCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={cn("text-2xl font-bold tabular-nums", color)}>{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [session, setSession] = useState<WASessionInfo>({ status: 'initializing' })
  const [sessionLoading, setSessionLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [queueStats, setQueueStats] = useState<WAQueueStats | null>(null)
  const [healthData, setHealthData] = useState<any>(null)

  const [logs, setLogs] = useState<WALogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsStatus, setLogsStatus] = useState('')
  const [logsLoading, setLogsLoading] = useState(true)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notConfigured = !WA_API_KEY

  // ── Fetch helpers ──────────────────────────────────────────────────────

  const fetchSession = useCallback((silent = false) => {
    return waGetSession()
      .then((res) => { setSession(res.data) })
      .catch(() => {
        // service mungkin belum jalan
      })
      .finally(() => { if (!silent) setSessionLoading(false) })
  }, [])

  const fetchQueueStats = useCallback(() => {
    return waGetQueueStats()
      .then((res) => { setQueueStats(res.data) })
      .catch(() => { /* ignore */ })
  }, [])

  const fetchHealth = useCallback(() => {
    return waGetHealth()
      .then((data) => { setHealthData(data) })
      .catch(() => { /* ignore */ })
  }, [])

  const fetchLogs = useCallback((page = 1, status = '') => {
    return waGetLogs({ page, perPage: 10, status: status || undefined })
      .then((res) => {
        setLogs(res.data)
        setLogsTotal(res.total)
        setLogsTotalPages(res.totalPages)
      })
      .catch(() => { /* ignore */ })
      .finally(() => { setLogsLoading(false) })
  }, [])

  // ── Initial load + polling ─────────────────────────────────────────────

  useEffect(() => {
    if (notConfigured) return
    fetchSession()
    fetchQueueStats()
    fetchHealth()
    fetchLogs(1, '')

    // Poll session + queue setiap 5 detik
    pollRef.current = setInterval(() => {
      fetchSession(true)
      fetchQueueStats()
    }, 5_000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [notConfigured, fetchHealth, fetchLogs, fetchQueueStats, fetchSession])

  useEffect(() => {
    if (notConfigured) return
    fetchLogs(logsPage, logsStatus)
  }, [logsPage, logsStatus, fetchLogs, notConfigured])

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleInit() {
    setActionLoading(true); setActionMsg(null)
    try {
      await waInitSession()
      setActionMsg({ type: 'success', text: 'Inisialisasi dimulai. Scan QR yang muncul.' })
      setTimeout(() => fetchSession(), 2_000)
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLogout() {
    if (!confirm('Logout akan menghapus sesi WhatsApp. Lanjutkan?')) return
    setActionLoading(true); setActionMsg(null)
    try {
      await waLogoutSession()
      setActionMsg({ type: 'success', text: 'Berhasil logout dari WhatsApp.' })
      await fetchSession()
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDestroy() {
    if (!confirm('Hapus sesi akan membutuhkan scan ulang QR. Yakin?')) return
    setActionLoading(true); setActionMsg(null)
    try {
      await waDestroySession()
      setActionMsg({ type: 'success', text: 'Sesi dihapus.' })
      await fetchSession()
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const meta = STATUS_META[session.status] ?? STATUS_META.disconnected
  const isReady = session.status === 'ready'
  const isActive = ['initializing', 'qr', 'authenticated', 'ready'].includes(session.status)

  if (notConfigured) {
    return (
      <div className="space-y-6">
        <PageHero
          eyebrow="Konfigurasi"
          title="WhatsApp"
          description="Kelola sesi WhatsApp untuk notifikasi PPDB"
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Konfigurasi Belum Lengkap</p>
            <p className="text-sm text-amber-700 mt-1">
              Tambahkan variabel berikut ke <code className="bg-amber-100 px-1 rounded">.env</code> superadmin:
            </p>
            <pre className="mt-3 rounded-lg bg-amber-100 p-3 text-xs font-mono text-amber-900">
{`VITE_WA_URL=http://localhost:3100
VITE_WA_API_KEY=<api-key-yang-sama-dengan-apps/whatsapp/.env>`}
            </pre>
            <p className="text-xs text-amber-600 mt-2">Restart dev server setelah mengubah .env.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Konfigurasi"
        title="WhatsApp"
        description="Kelola sesi WhatsApp untuk notifikasi PPDB"
      />

      {/* Action feedback */}
      {actionMsg && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
          actionMsg.type === 'success'
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        )}>
          {actionMsg.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)} className="ml-auto text-current/60 hover:text-current">✕</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Left: Session Card ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-offset-1", meta.dot, isReady ? "ring-emerald-200" : "ring-slate-200", (session.status === 'initializing' || session.status === 'authenticated') && "animate-pulse")} />
                <span className={cn("text-sm font-semibold", meta.color)}>
                  {sessionLoading ? 'Memuat...' : meta.label}
                </span>
              </div>
              <button
                onClick={() => fetchSession()}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Refresh status"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* QR / Status visual */}
            <div className="px-5 py-4">
              {sessionLoading
                ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                : <QrPanel status={session} onRefreshQr={fetchSession} />
              }
            </div>

            {/* Action buttons */}
            <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-2">
              {!isActive ? (
                <Button
                  className="w-full"
                  onClick={handleInit}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                  Hubungkan WhatsApp
                </Button>
              ) : (
                <>
                  {!isReady && (
                    <Button className="w-full" onClick={handleInit} disabled={actionLoading} variant="outline">
                      <RefreshCw className={cn("h-4 w-4 mr-2", actionLoading && "animate-spin")} />
                      Inisialisasi Ulang
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={handleLogout} disabled={actionLoading}>
                      <LogOut className="h-4 w-4 mr-1.5" />
                      Logout
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={handleDestroy} disabled={actionLoading}>
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Hapus Sesi
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Health check mini card */}
          {healthData && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Server className="h-4 w-4 text-slate-400" />
                Status Infrastruktur
              </div>
              {Object.entries((healthData.checks as Record<string, { status: string; detail?: string }>) ?? {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{key}</span>
                  <span className={cn(
                    "flex items-center gap-1 font-medium",
                    val.status === 'ok' ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {val.status === 'ok'
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    {val.detail ?? val.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Stats + Logs ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Queue stats */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BarChart3 className="h-4 w-4 text-slate-400" />
                Statistik Antrean Pesan
              </div>
              <button onClick={fetchQueueStats} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            {queueStats ? (
              <div className="grid grid-cols-5 gap-3">
                <QueueCard label="Menunggu" value={queueStats.waiting} color="text-blue-600" />
                <QueueCard label="Diproses" value={queueStats.active} color="text-amber-600" />
                <QueueCard label="Selesai" value={queueStats.completed} color="text-emerald-600" />
                <QueueCard label="Gagal" value={queueStats.failed} color="text-red-500" />
                <QueueCard label="Terjadwal" value={queueStats.delayed} color="text-purple-600" />
              </div>
            ) : (
              <div className="flex justify-center py-4 text-slate-400 text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat statistik...
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                Log Pengiriman
                {logsTotal > 0 && (
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 font-normal">
                    {logsTotal}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status filter */}
                <select
                  value={logsStatus}
                  onChange={e => { setLogsLoading(true); setLogsStatus(e.target.value); setLogsPage(1) }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Semua Status</option>
                  <option value="queued">Antrian</option>
                  <option value="sent">Terkirim</option>
                  <option value="failed">Gagal</option>
                  <option value="invalid_number">No. Tidak Valid</option>
                </select>
                <button onClick={() => { setLogsLoading(true); fetchLogs(logsPage, logsStatus) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {logsLoading ? (
                <div className="flex justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat log...
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                  <Activity className="h-8 w-8" />
                  <p className="text-sm">Belum ada log pengiriman</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Penerima</th>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Retry</th>
                      <th className="px-4 py-3 text-left">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(log => {
                      const sm = LOG_STATUS_META[log.status] ?? LOG_STATUS_META.failed
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 truncate max-w-[150px]">{log.recipient_name || '—'}</div>
                            <div className="text-xs text-slate-400 font-mono">{log.recipient_phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                              {log.event_key}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                              sm.bg, sm.color
                            )}>
                              {sm.label}
                            </span>
                            {log.error_message && (
                              <p className="text-xs text-red-400 mt-0.5 max-w-[180px] truncate" title={log.error_message}>
                                {log.error_message}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.retry_count > 0
                              ? <span className="text-amber-600 font-medium">{log.retry_count}×</span>
                              : <span className="text-slate-300">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {fmtDate(log.sent_at || log.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Halaman {logsPage} dari {logsTotalPages} · {logsTotal} total
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setLogsLoading(true); setLogsPage(p => Math.max(1, p - 1)) }}
                    disabled={logsPage === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setLogsLoading(true); setLogsPage(p => Math.min(logsTotalPages, p + 1)) }}
                    disabled={logsPage === logsTotalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
