import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Wifi, WifiOff, RefreshCw, LogOut,
  CheckCircle2, XCircle, AlertTriangle, Activity,
  ChevronLeft, ChevronRight, Loader2,
  QrCode, PhoneCall, Server, BarChart3, FileText, Send,
  Smartphone, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  waGetStatus, waInitSession, waLogoutSession, waGetQrRaw,
  waGetQueueStats, waGetLogs, waSendTest, waGetQrSseUrl,
  waRequestPairingCode, waCancelPairing,
  type WAProxyStatus, type WAQueueStats, type WALogEntry,
} from '../api/client'
import PageHero from '../components/PageHero'

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {
  label: string
  color: string
  dot: string
  bg: string
  icon: React.ElementType
}> = {
  initializing:  { label: 'Menghubungkan...', color: 'text-blue-600', dot: 'bg-blue-400', bg: 'bg-blue-50 border-blue-200', icon: Loader2 },
  authenticated: { label: 'Menghubungkan...', color: 'text-blue-600', dot: 'bg-blue-400', bg: 'bg-blue-50 border-blue-200', icon: Loader2 },
  qr:            { label: 'Perlu Scan QR', color: 'text-amber-600', dot: 'bg-amber-400', bg: 'bg-amber-50 border-amber-200', icon: QrCode },
  ready:         { label: 'Terhubung', color: 'text-emerald-600', dot: 'bg-emerald-400', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  disconnected:  { label: 'Terputus', color: 'text-red-500', dot: 'bg-red-400', bg: 'bg-red-50 border-red-200', icon: WifiOff },
  destroyed:     { label: 'Terputus', color: 'text-slate-500', dot: 'bg-slate-400', bg: 'bg-slate-50 border-slate-200', icon: XCircle },
  OFFLINE:       { label: 'Service Offline', color: 'text-red-500', dot: 'bg-red-400', bg: 'bg-red-50 border-red-200', icon: WifiOff },
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

// ── QR Panel (SSE via FastAPI proxy) ────────────────────────────────────────

function QrPanel({
  status,
  onRefresh,
}: {
  status: string
  onRefresh: () => void
}) {
  const [qrRaw, setQrRaw] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)

  // Proses event SSE yang datang dari proxy FastAPI (event microservice dipertahankan).
  // Backend mengirim RAW QR string — rendering jadi QR visual dilakukan di client
  // via library qrcode.react (bukan gambar PNG dari server).
  const handleSseData = useCallback((data: any) => {
    if (!data) return
    if (data?.raw) {
      setQrRaw(data.raw)
      setQrError(null)
    }
    if (data?.status === 'ready') setQrRaw(null)
  }, [])

  // SSE hanya dibuka saat state == 'qr' (auto-refresh QR tanpa polling manual)
  useEffect(() => {
    if (status !== 'qr') {
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
      // Bersihkan QR yang sudah kadaluarsa ketika keluar dari state 'qr'
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrRaw(null)
      return
    }

    const es = new EventSource(waGetQrSseUrl(), { withCredentials: true })

    es.addEventListener('qr', (e) => { try { handleSseData(JSON.parse(e.data)) } catch { /* ignore */ } })
    es.addEventListener('status', (e) => { try { handleSseData(JSON.parse(e.data)) } catch { /* ignore */ } })
    es.addEventListener('ready', () => setQrRaw(null))
    es.addEventListener('error', () => setQrError('Koneksi SSE terputus. Klik Segarkan QR jika perlu.'))

    sseRef.current = es
    return () => { es.close(); sseRef.current = null }
  }, [status, handleSseData])

  // Fallback satu-kali jika SSE belum mengirim
  const fetchQrRaw = useCallback(async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const res = await waGetQrRaw()
      if (res?.success && res?.data?.raw) {
        setQrRaw(res.data.raw)
      } else {
        setQrError(res?.error || res?.message || 'QR belum tersedia saat ini.')
      }
    } catch (err) {
      setQrError((err as Error).message)
    } finally {
      setQrLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'qr' && !qrRaw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchQrRaw()
    }
  }, [status, qrRaw, fetchQrRaw])

  if (status === 'ready') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="rounded-full bg-emerald-100 p-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-800">WhatsApp Terhubung</p>
          <p className="text-sm text-slate-500 mt-1">Sesi aktif dan siap mengirim notifikasi</p>
        </div>
      </div>
    )
  }

  if (status === 'qr') {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-slate-600 text-center">
          Buka <strong>WhatsApp</strong> di HP → Perangkat Tertaut → Tautkan Perangkat → Scan QR
        </p>
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
          {qrRaw ? (
            <QRCodeSVG
              value={qrRaw}
              size={200}
              level="M"
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#0f172a"
              className="h-50 w-50 block"
            />
          ) : (
            <div className="h-50 w-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
              {qrLoading
                ? <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                : <QrCode className="h-10 w-10 text-slate-300" />}
            </div>
          )}
        </div>
        {qrError && <p className="text-xs text-red-500 max-w-xs text-center">{qrError}</p>}
        <Button variant="outline" size="sm" onClick={() => { fetchQrRaw(); onRefresh() }} disabled={qrLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', qrLoading && 'animate-spin')} />
          Segarkan QR
        </Button>
        <p className="text-xs text-slate-400">QR dirender dari raw string via qrcode.react dan diperbarui otomatis.</p>
      </div>
    )
  }

  if (status === 'initializing' || status === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-600">Menginisialisasi sesi WhatsApp...</p>
        <p className="text-xs text-slate-400">Mohon tunggu, proses ini mungkin memakan waktu beberapa detik</p>
      </div>
    )
  }

  if (status === 'OFFLINE') {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="rounded-full bg-red-100 p-4">
          <WifiOff className="h-10 w-10 text-red-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-700">WhatsApp Microservice Offline</p>
          <p className="text-sm text-slate-500 mt-1">Jalankan service-nya di port 3100 lalu klik Hubungkan</p>
        </div>
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

// ── Phone / Pairing Code Panel (opsi selain scan QR) ────────────────────────

function PhonePanel({
  onRefresh,
}: {
  onRefresh: () => void
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Kode pairing otomatis di-regenerate microservice tiap ~3 menit; ikuti via SSE.
  useEffect(() => {
    if (!code) return
    const es = new EventSource(waGetQrSseUrl(), { withCredentials: true })
    es.addEventListener('code', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.code) setCode(data.code)
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [code])

  const handleGetCode = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await waRequestPairingCode(phone)
      if (res?.success && res?.data?.code) {
        setCode(res.data.code)
      } else {
        setError(res?.error || res?.message || 'Gagal membuat pairing code.')
      }
      onRefresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    setError(null)
    try {
      await waCancelPairing()
      setCode(null)
      onRefresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      if (code) await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  if (code) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
          <Smartphone className="h-3.5 w-3.5" />
          Tautkan perangkat dengan nomor HP
        </div>
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 px-8 py-5 text-center select-all">
          <span className="text-3xl font-mono font-bold tracking-[0.35em] text-slate-800">
            {code}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed text-center max-w-xs">
          Buka <strong>WhatsApp</strong> di HP Anda → <strong>Setelan</strong> →{' '}
          <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong> →{' '}
          <strong>Tautkan dengan nomor HP</strong>, lalu masukkan kode di atas.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={loading}>
            <Copy className="h-4 w-4 mr-1.5" />
            {copied ? 'Tersalin!' : 'Salin Kode'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
            <XCircle className="h-4 w-4 mr-1.5" />
            Batalkan
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">Kode berubah otomatis tiap beberapa menit.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full space-y-2">
        <label className="text-xs font-medium text-slate-500" htmlFor="pairing-phone">
          Nomor WhatsApp (otomatis ditautkan ke sesi ini)
        </label>
        <input
          id="pairing-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="628123456789"
          autoComplete="off"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <Button className="w-full" onClick={handleGetCode} disabled={loading || phone.trim().length < 10}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
        Ambil Kode Aktivasi
      </Button>
      <p className="text-[11px] text-slate-400 leading-relaxed text-center">
        Anda akan menerima kode 8 karakter. Masukkan di WhatsApp HP Anda melalui
        menu <strong>Perangkat Tertaut</strong>. Cocok untuk perangkat tanpa kamera.
      </p>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}

// ── Queue Stats ────────────────────────────────────────────────────────────

function QueueCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={cn('text-2xl font-bold tabular-nums', color)}>{value}</span>
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

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
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('qr')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setActionLoading(true); setActionMsg(null)
    try {
      const res = await waInitSession()
      setActionMsg({ type: 'success', text: res?.message || 'Inisialisasi dimulai. Scan QR yang muncul.' })
      setTimeout(() => fetchSession(), 2_000)
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

  async function handleMethodChange(method: 'qr' | 'phone') {
    if (method === 'qr' && loginMethod === 'phone' && session?.pairingCode) {
      try {
        await waCancelPairing()
        fetchSession(true)
      } catch { /* ignore */ }
    }
    setLoginMethod(method)
  }

  const statusLabel = session?.status ?? 'OFFLINE'
  const meta = STATUS_META[statusLabel] ?? STATUS_META.OFFLINE
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

        {/* ── Left: Session Card ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-2.5 w-2.5 rounded-full ring-2 ring-offset-1',
                  meta.dot,
                  isReady ? 'ring-emerald-200' : 'ring-slate-200',
                  (statusLabel === 'initializing' || statusLabel === 'authenticated') && 'animate-pulse'
                )} />
                <span className={cn('text-sm font-semibold', meta.color)}>
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

            {/* Pilih metode login: Scan QR / Nomor HP */}
            {!isReady && statusLabel !== 'OFFLINE' && (
              <div className="grid grid-cols-2 gap-1 border-b border-slate-100 px-5 py-3">
                {([
                  { key: 'qr', label: 'Scan QR', desc: 'Pindai dengan HP', Icon: QrCode },
                  { key: 'phone', label: 'Nomor HP', desc: 'Kode aktivasi', Icon: Smartphone },
                ] as const).map(({ key, label, desc, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleMethodChange(key)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors border',
                      loginMethod === key
                        ? 'border-primary/30 bg-primary/5 text-slate-800'
                        : 'border-transparent text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', loginMethod === key ? 'text-primary' : 'text-slate-400')} />
                    <span>
                      <span className="block text-xs font-semibold leading-tight">{label}</span>
                      <span className="block text-[10px] leading-tight text-slate-400">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* QR / Status visual */}
            <div className="px-5 py-4">
              {sessionLoading
                ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                : loginMethod === 'phone'
                  ? <PhonePanel onRefresh={() => fetchSession()} />
                  : <QrPanel status={statusLabel} onRefresh={fetchSession} />}
            </div>

            {/* Action buttons */}
            <div className="border-t border-slate-100 px-5 py-4 flex flex-col gap-2">
              {isReady ? (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5" />
                      Nomor WhatsApp Terhubung
                    </div>
                    {session?.phone && (
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        +{session.phone}{session.pushName ? ` (${session.pushName})` : ''}
                      </div>
                    )}
                    {session?.connectedAt && (
                      <div className="text-xs text-slate-400 mt-0.5">Sejak {fmtDate(session.connectedAt)}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                    Putus Koneksi
                  </Button>
                </>
              ) : (
                <>
                  {!isActive && statusLabel !== 'OFFLINE' && (
                    <Button className="w-full" onClick={handleInit} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                      Hubungkan WhatsApp
                    </Button>
                  )}
                  {(isActive && !isReady) && (
                    <Button className="w-full" variant="outline" onClick={handleInit} disabled={actionLoading}>
                      <RefreshCw className={cn('h-4 w-4 mr-2', actionLoading && 'animate-spin')} />
                      Inisialisasi Ulang
                    </Button>
                  )}
                  {(statusLabel === 'OFFLINE' || statusLabel === 'disconnected' || statusLabel === 'destroyed') && (
                    <Button className="w-full" onClick={handleInit} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                      Hubungkan WhatsApp
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Test send — hanya saat READY */}
          {isReady && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Send className="h-4 w-4 text-slate-400" />
                Uji Coba Pengiriman Pesan
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Nomor tujuan (cth: 08123456789)"
                  disabled={sendingTest}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button onClick={handleSendTest} disabled={sendingTest}>
                  {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Kirim Test
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Pesan uji coba dikirim dari nomor WhatsApp yang terhubung di atas.
              </p>
            </div>
          )}

          {/* Health check mini card */}
          {session?.health && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Server className="h-4 w-4 text-slate-400" />
                Status Infrastruktur
              </div>
              {Object.entries((session.health.checks as Record<string, { status: string; detail?: string }>) ?? {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{key}</span>
                  <span className={cn(
                    'flex items-center gap-1 font-medium',
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
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
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
                              : <span className="text-slate-300">—</span>}
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
