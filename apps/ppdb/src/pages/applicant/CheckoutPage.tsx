import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui"
import { Button } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { apiFetch } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { QrCode, Clock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react'

const FORMATTER = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function CheckoutPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const transaction = transactionQuery.data?.transaction
  const applicant = transactionQuery.data?.applicant
  const amount = transaction?.amount || 0
  const isExpired = user?.payment_status === 'expired' || user?.payment_status === 'failed'

  useEffect(() => {
    if (user?.payment_status === 'paid') {
      navigate('/applicant', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user?.payment_deadline) return

    const deadline = new Date(user.payment_deadline).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const distance = deadline - now

      if (distance < 0) {
        setTimeLeft('Waktu pembayaran telah habis (Gelombang Ditutup)')
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`${days} hari ${hours} jam ${minutes} menit`)
      } else {
        setTimeLeft(`${hours} jam ${minutes} menit`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [user?.payment_deadline])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await refreshUser()
      await transactionQuery.refetch()
      toast('success', 'Status diperbarui')
    } catch {
      toast('error', 'Gagal memperbarui status')
    } finally {
      setLoading(false)
    }
  }

  const formatDeadlineDate = (d?: string | null) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB'
    } catch {
      return d
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">

        <div className="text-center space-y-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Selesaikan Pembayaran Formulir</h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Selamat datang <strong>{user?.full_name}</strong>! Untuk melanjutkan ke tahap Upload Dokumen & Seleksi, Anda diwajibkan menyelesaikan pembayaran biaya formulir pendaftaran melalui sistem 1 pintu QRIS Pak Kasir.
          </p>
        </div>

        {isExpired ? (
          <Card className="border-red-200 bg-red-50/40 shadow-lg">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Masa Pembayaran Telah Berakhir
              </CardTitle>
              <CardDescription className="text-red-700">
                Gelombang pendaftaran telah resmi ditutup atau kuota pendaftar telah terpenuhi.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Mohon maaf, tagihan formulir Anda telah otomatis dibatalkan karena kuota pembayaran gelombang telah tercapai atau batas waktu pendaftaran telah terlewati.
              </p>
              <p className="text-sm text-slate-600">
                Anda diperkenankan mendaftar kembali pada gelombang berikutnya jika masih dibuka.
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => logout().then(() => navigate('/auth/login'))}>
                Keluar (Logout)
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 rounded-t-lg border-b border-primary/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg">Tagihan Formulir Pendaftaran</CardTitle>
                  <CardDescription>
                    Pembayaran otomatis 1 pintu via QRIS Pak Kasir
                  </CardDescription>
                </div>
                <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                  Menunggu Pembayaran
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Deadline countdown & info */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" /> Batas Waktu Pembayaran (Tutup Gelombang)
                  </span>
                  <span className="text-xs font-bold text-amber-700">
                    {timeLeft || 'Menghitung...'}
                  </span>
                </div>
                <p className="text-xs text-amber-800">
                  Jatuh tempo: <strong>{formatDeadlineDate(user?.payment_deadline)}</strong>. Pembayaran otomatis ditutup bila kuota gelombang penuh atau masa pendaftaran gelombang berakhir.
                </p>
              </div>

              {/* Total Tagihan */}
              {amount > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center space-y-1">
                  <p className="text-emerald-800 text-xs font-semibold uppercase tracking-wider">Total Tagihan Formulir</p>
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-600 font-heading">
                    {FORMATTER.format(amount)}
                  </div>
                  <p className="text-[11px] text-emerald-700/80">
                    Gelombang: {applicant?.wave_name || 'Gelombang Aktif'}
                  </p>
                </div>
              )}

              {/* QRIS Card Component */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-14 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center tracking-tighter">
                      QRIS
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">PAK KASIR PAYMENT GATEWAY</h4>
                      <p className="text-[11px] text-muted-foreground">Scan menggunakan aplikasi Bank atau E-Wallet apapun</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" /> 1 Pintu Otomatis
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
                  {/* QR Code Container */}
                  <div className="relative flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                    <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                      <QrCode className="w-36 h-36 sm:w-40 sm:h-40 text-slate-800 transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-emerald-950/5 pointer-events-none" />
                      <div className="absolute bottom-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 border shadow-xs">
                        QRIS AR-RAHMAN
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-mono text-slate-500">ID: {transaction?.id || '-'}</p>
                    </div>
                  </div>

                  {/* Payment instructions */}
                  <div className="flex-1 space-y-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      Cara Pembayaran:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Buka aplikasi <strong>M-Banking</strong> (BCA, Mandiri, BNI, BRI, BSI, dll) atau <strong>E-Wallet</strong> (GoPay, OVO, DANA, ShopeePay, LinkAja).</li>
                      <li>Pilih menu <strong>Bayar / Scan QRIS</strong>.</li>
                      <li>Arahkan kamera ke QR Code di samping.</li>
                      <li>Periksa nama merchant: <strong>PPDB PESANTREN AR-RAHMAN</strong>.</li>
                      <li>Pastikan nominal sesuai: <strong>{FORMATTER.format(amount)}</strong>.</li>
                      <li>Konfirmasi pembayaran dengan PIN Anda.</li>
                    </ol>

                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <p className="font-semibold text-[11px] text-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verifikasi Real-time
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tidak perlu upload struk transfer atau konfirmasi WhatsApp manual. Begitu saldo terpotong, sistem langsung memperbarui status Anda dalam hitungan detik.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary step */}
              <div className="bg-slate-50 rounded-lg border p-4 text-xs text-muted-foreground flex items-center justify-between">
                <span>Tahap 1: Pembayaran Formulir</span>
                <span className="font-medium text-emerald-700">Tahap 2 (Upload Dokumen) terbuka otomatis setelah lunas</span>
              </div>

            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t bg-muted/20">
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-semibold"
                onClick={handleRefresh}
                disabled={loading || transactionQuery.isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading || transactionQuery.isLoading ? 'animate-spin' : ''}`} />
                {(loading || transactionQuery.isLoading) ? 'Memeriksa Pembayaran...' : 'Cek Status Pembayaran (Refresh)'}
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => logout().then(() => navigate('/auth/login'))}>
            Keluar (Logout)
          </Button>
        </div>

      </div>
    </div>
  )
}
