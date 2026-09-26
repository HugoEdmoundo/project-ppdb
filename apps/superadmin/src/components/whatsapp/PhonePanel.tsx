import { useEffect, useState } from 'react'
import { Copy, Loader2, Smartphone, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { waCancelPairing, waGetQrSseUrl, waRequestPairingCode } from '@/api/client'

export default function PhonePanel({
  existingCode,
  onRefresh,
}: {
  existingCode?: string | null
  onRefresh: () => void
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(existingCode || null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Kode pairing di-regenerate microservice tiap beberapa menit. Koneksi SSE
  // dibuka satu kali saat mount (event 'code' di-push begitu kode berganti),
  // EventSource otomatis reconnect kalau koneksi sempat putus.
  useEffect(() => {
    const es = new EventSource(waGetQrSseUrl(), { withCredentials: true })
    es.addEventListener('code', (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.code) setCode(data.code)
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [])

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
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
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
      <p className="text-[11px] text-slate-400 leading-relaxed text-center border-t border-slate-100 pt-2">
        Nomor ini hanya dipakai untuk membuat kode pairing (fitur resmi WhatsApp{' '}
        <em>"Tautkan dengan nomor HP"</em>) — tidak disimpan sebagai kontak dan
        hanya bisa diakses oleh superadmin. Request tetap lewat backend, API key
        microservice tidak pernah sampai ke browser.
      </p>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}