import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Loader2, QrCode, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { waGetQrRaw, waGetQrSseUrl } from '@/api/client'

// SSE relevan selama sesi masih "dalam proses" — bukan cuma pas state sudah
// 'qr'. Dengan begitu event 'qr' dari microservice tertangkap realtime, bukan
// nunggu polling 8 detik berikutnya.
const SSE_ACTIVE_STATUSES = new Set(['initializing', 'authenticated', 'qr'])

export default function QrPanel({
  status,
  onRefresh,
}: {
  status: string
  onRefresh: () => void
}) {
  const [qrRaw, setQrRaw] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(status)
  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalStatus(status)
  }, [status])

  // Raw QR dirender jadi visual di client via qrcode.react (bukan PNG server).
  // Microservice mengirim QR di event 'qr' (data.raw) ATAU di event 'status'
  // (data.qrCode) — dua-duanya dibaca agar QR muncul walau event 'qr' sudah
  // lewat sebelum SSE dibuka.
  const handleSseData = useCallback((data: any) => {
    if (!data) return
    if (data.status) setLocalStatus(data.status)
    const raw =
      typeof data.raw === 'string' && data.raw
        ? data.raw
        : typeof data.qrCode === 'string' && data.qrCode
          ? data.qrCode
          : null
    if (raw) {
      setQrRaw(raw)
      setQrError(null)
    }
    if (data?.status === 'ready') setQrRaw(null)
  }, [])

  useEffect(() => {
    if (!SSE_ACTIVE_STATUSES.has(localStatus) && !SSE_ACTIVE_STATUSES.has(status)) {
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
      if (localStatus !== 'qr' && status !== 'qr') {
        // QR yang sudah usang dibersihkan begitu keluar dari mode 'qr'
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQrRaw(null)
      }
      return
    }

    const es = new EventSource(waGetQrSseUrl(), { withCredentials: true })

    es.addEventListener('qr', (e) => { try { handleSseData(JSON.parse(e.data)) } catch { /* ignore */ } })
    es.addEventListener('status', (e) => { try { handleSseData(JSON.parse(e.data)) } catch { /* ignore */ } })
    es.addEventListener('ready', () => { setQrRaw(null); setLocalStatus('ready'); })
    es.addEventListener('error', () => {
      setQrError('Koneksi SSE terputus. QR tetap diperbarui lewat segarkan otomatis.')
    })

    sseRef.current = es
    return () => { es.close(); sseRef.current = null }
  }, [status, localStatus, handleSseData])

  // Fallback + retry otomatis: kalau QR belum keluar (SSE one-shot bisa miss),
  // coba tarik langsung tiap 4 detik sampai dapat.
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
    if (localStatus !== 'qr' || qrRaw) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQrRaw()
    const id = setInterval(() => { fetchQrRaw() }, 4_000)
    return () => clearInterval(id)
  }, [localStatus, qrRaw, fetchQrRaw])

  const isQrState = localStatus === 'qr' || (SSE_ACTIVE_STATUSES.has(localStatus) && !!qrRaw)

  if (localStatus === 'ready') {
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

  if (isQrState) {
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
              className="h-52 w-52 block"
            />
          ) : (
            <div className="h-52 w-52 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
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

  if (localStatus === 'initializing' || localStatus === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-600">Menginisialisasi sesi WhatsApp...</p>
        <p className="text-xs text-slate-400">Mohon tunggu, proses ini mungkin memakan waktu beberapa detik</p>
      </div>
    )
  }

  if (localStatus === 'OFFLINE') {
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
