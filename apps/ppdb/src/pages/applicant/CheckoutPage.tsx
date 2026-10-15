import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, Button, Badge } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { apiFetch } from '@/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Clock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Smartphone, XCircle } from 'lucide-react'

const FORMATTER = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function CheckoutPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900)

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const applicant = transactionQuery.data?.applicant
  const activeTx = transactionQuery.data?.active_transaction
  const formTx = transactionQuery.data?.transaction
  const currentTx = activeTx || formTx
  const amount = currentTx?.amount || 250000

  const isExpired = user?.payment_status === 'expired' || user?.payment_status === 'failed'

  useEffect(() => {
    if (user?.payment_status === 'paid') {
      navigate('/applicant', { replace: true })
    }
  }, [user, navigate])

  // Create QRIS mutation
  const createQrisMutation = useMutation({
    mutationFn: () => apiFetch<any>('/payment/create-qris', {
      method: 'POST',
      body: JSON.stringify({ payment_type: 'form' })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      toast('success', 'Kode QRIS berhasil dibuat')
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal membuat transaksi QRIS')
    }
  })

  // Cancel transaction mutation
  const cancelTxMutation = useMutation({
    mutationFn: (txId: string) => apiFetch<any>(`/payment/transactions/${txId}/cancel`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      toast('success', 'Transaksi berhasil dibatalkan')
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal membatalkan transaksi')
    }
  })

  // Auto-create QRIS if no active transaction and not paid
  useEffect(() => {
    if (
      !transactionQuery.isLoading &&
      !isExpired &&
      user?.payment_status !== 'paid' &&
      !activeTx &&
      !createQrisMutation.isPending
    ) {
      createQrisMutation.mutate()
    }
  }, [transactionQuery.isLoading, isExpired, user?.payment_status, activeTx])

  // Timer countdown for active QRIS (15 minutes)
  useEffect(() => {
    if (activeTx?.expires_in_seconds !== undefined) {
      setSecondsRemaining(Math.max(0, activeTx.expires_in_seconds))
    } else if (activeTx?.expired_at) {
      const expTime = new Date(activeTx.expired_at).getTime()
      const now = new Date().getTime()
      const diff = Math.max(0, Math.floor((expTime - now) / 1000))
      setSecondsRemaining(diff)
    }
  }, [activeTx])

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsRemaining])

  // Format seconds to MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Polling / Manual Status Sync
  const handleCheckStatus = async () => {
    if (!currentTx?.id) return
    setCheckingStatus(true)
    try {
      const res = await apiFetch<any>(`/payment/transactions/${currentTx.id}/sync-status`, {
        method: 'POST'
      })
      if (res.status === 'success') {
        toast('success', 'Alhamdulillah! Pembayaran Anda berhasil diverifikasi.')
        await refreshUser()
        await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
        navigate('/applicant', { replace: true })
      } else if (res.status === 'expired') {
        toast('warning', 'Batas waktu pembayaran QRIS telah habis. Silakan buat kode baru.')
        queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      } else if (res.status === 'cancelled') {
        toast('info', 'Transaksi telah dibatalkan.')
        queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      } else {
        toast('info', 'Pembayaran belum terdeteksi. Silakan selesaikan scan di aplikasi Anda.')
      }
    } catch {
      toast('error', 'Gagal memeriksa status pembayaran')
    } finally {
      setCheckingStatus(false)
    }
  }

  // Periodic polling every 7 seconds while active QRIS is pending
  useEffect(() => {
    if (!activeTx?.id || activeTx.status !== 'pending' || secondsRemaining <= 0) return
    const pollInterval = setInterval(() => {
      apiFetch<any>(`/payment/transactions/${activeTx.id}/sync-status`, { method: 'POST' })
        .then(res => {
          if (res.status === 'success') {
            toast('success', 'Pembayaran berhasil diverifikasi!')
            refreshUser()
            queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
            navigate('/applicant', { replace: true })
          }
        })
        .catch(() => {})
    }, 7000)

    return () => clearInterval(pollInterval)
  }, [activeTx?.id, activeTx?.status, secondsRemaining, navigate, refreshUser, queryClient, toast])

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl space-y-5 sm:space-y-6">

        <div className="text-center space-y-2 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary leading-tight">Selesaikan Pembayaran Formulir</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Selamat datang <strong>{user?.full_name}</strong>! Selesaikan pembayaran biaya formulir pendaftaran untuk membuka tahap selanjutnya.
          </p>
        </div>

        {isExpired ? (
          <Card className="border-red-200 bg-red-50/40 shadow-lg">
            <CardHeader className="bg-red-50 border-b border-red-100 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-red-800 text-base sm:text-lg">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>Masa Pembayaran Telah Berakhir</span>
              </CardTitle>
              <CardDescription className="text-red-700 text-xs sm:text-sm mt-1">
                Gelombang pendaftaran telah resmi ditutup atau kuota pembayaran telah terpenuhi.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Mohon maaf, tagihan formulir Anda telah dibatalkan karena kuota gelombang telah terpenuhi.
              </p>
            </CardContent>
            <CardFooter className="p-4 sm:p-6 border-t flex justify-end">
              <Button variant="outline" className="w-full sm:w-auto h-10" onClick={() => logout().then(() => navigate('/auth/login'))}>
                Keluar (Logout)
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 rounded-t-lg border-b border-primary/10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg">Tagihan Formulir Pendaftaran</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Pembayaran otomatis 1 pintu via QRIS Pak Kasir
                  </CardDescription>
                </div>
                <Badge variant={secondsRemaining > 0 ? "warning" : "destructive"} className="self-start sm:self-auto px-3 py-1 text-xs shrink-0">
                  {secondsRemaining > 0 ? 'Menunggu Pembayaran' : 'QRIS Kedaluwarsa'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">

              {/* 15-Minute QRIS Countdown Card */}
              <div className={`rounded-xl border p-3.5 sm:p-4 space-y-2 transition-colors ${
                secondsRemaining > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-red-200 bg-red-50/60'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Masa Berlaku Kode QRIS (15 Menit)</span>
                  </span>
                  <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${
                    secondsRemaining > 60 ? 'bg-amber-200/80 text-amber-950' : 'bg-red-200 text-red-950 animate-pulse'
                  }`}>
                    {secondsRemaining > 0 ? formatTimer(secondsRemaining) : '00:00 - KEDALUWARSA'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {secondsRemaining > 0
                    ? 'Selesaikan pembayaran sebelum countdown habis agar tidak perlu membuat kode QR baru.'
                    : 'Batas waktu pembayaran untuk kode QRIS ini telah berakhir. Silakan klik tombol "Buat Ulang QRIS" di bawah.'}
                </p>
              </div>

              {/* Total Tagihan */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 sm:p-5 text-center space-y-1">
                <p className="text-emerald-800 text-xs font-semibold uppercase tracking-wider">Total Tagihan Formulir</p>
                <div className="text-3xl sm:text-4xl font-bold text-emerald-600 font-heading">
                  {FORMATTER.format(amount)}
                </div>
                <p className="text-[11px] text-emerald-700/80">
                  Gelombang: {applicant?.wave_name || 'Gelombang Aktif'}
                </p>
              </div>

              {/* Live QRIS Display */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-14 rounded bg-red-600 text-white font-black text-xs flex items-center justify-center tracking-tighter shrink-0">
                      QRIS
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">PAK KASIR PAYMENT GATEWAY</h4>
                      <p className="text-[11px] text-muted-foreground">Scan menggunakan aplikasi Bank (BCA, Mandiri, BNI, BRI, BSI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay)</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" /> 1 Pintu Otomatis
                  </span>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 justify-center py-2">
                  {/* QR Code Container */}
                  <div className="relative flex flex-col items-center bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-inner shrink-0 w-full max-w-[240px] sm:max-w-[260px]">
                    {currentTx?.qr_string && secondsRemaining > 0 ? (
                      <div className="p-2 bg-white rounded-lg border-2 border-slate-300 shadow-sm flex items-center justify-center">
                        <QRCodeSVG
                          value={currentTx.qr_string}
                          size={190}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-50 rounded-lg border-2 border-dashed border-red-300 flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <XCircle className="w-10 h-10 text-red-500" />
                        <p className="text-xs font-semibold text-slate-700">QRIS Kedaluwarsa</p>
                        <Button
                          size="sm"
                          onClick={() => createQrisMutation.mutate()}
                          disabled={createQrisMutation.isPending}
                          className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          {createQrisMutation.isPending ? 'Membuat...' : 'Buat Ulang QRIS'}
                        </Button>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-mono text-slate-500 break-all">Order ID: {currentTx?.order_id || currentTx?.id || '-'}</p>
                    </div>
                  </div>

                  {/* Payment instructions */}
                  <div className="flex-1 space-y-3 text-xs text-slate-600 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Cara Pembayaran:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Buka aplikasi <strong>M-Banking</strong> atau <strong>E-Wallet</strong> favorit Anda.</li>
                      <li>Pilih menu <strong>Bayar / Scan QRIS</strong>.</li>
                      <li>Arahkan kamera ke QR Code di samping.</li>
                      <li>Periksa nama merchant: <strong>PPDB PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN</strong>.</li>
                      <li>Pastikan nominal tepat: <strong>{FORMATTER.format(amount)}</strong>.</li>
                      <li>Konfirmasi pembayaran dengan PIN Anda.</li>
                    </ol>

                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <p className="font-semibold text-[11px] text-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Konfirmasi Real-Time Idempoten
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Sistem memverifikasi pembayaran secara otomatis detik demi detik. Halaman ini akan otomatis membuka akses pendaftaran Anda setelah berhasil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1 h-11 text-xs sm:text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus || transactionQuery.isLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                  {checkingStatus ? 'Memeriksa Verifikasi...' : 'Cek Status Pembayaran (Manual Refresh)'}
                </Button>

                {currentTx?.id && secondsRemaining > 0 && (
                  <Button
                    variant="outline"
                    className="h-11 text-xs sm:text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => cancelTxMutation.mutate(currentTx.id)}
                    disabled={cancelTxMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    {cancelTxMutation.isPending ? 'Membatalkan...' : 'Batal / Ganti Transaksi'}
                  </Button>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 sm:p-6 border-t bg-muted/20 text-xs text-muted-foreground">
              <span>PPDB Ar-Rahman · Integrasi Resmi Pak Kasir API v2</span>
              <Button variant="ghost" size="sm" onClick={() => logout().then(() => navigate('/auth/login'))}>
                Keluar (Logout)
              </Button>
            </CardFooter>
          </Card>
        )}

      </div>
    </div>
  )
}
