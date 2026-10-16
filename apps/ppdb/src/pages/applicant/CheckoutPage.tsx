import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter, Button, Badge } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { QRCodeSVG } from 'qrcode.react'
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  XCircle,
  Loader2,
  SearchCheck,
  Ban,
  ShieldAlert,
} from 'lucide-react'
import { useQrisPayment } from './hooks/useQrisPayment'
import { formatCountdown } from './hooks/paymentStatus'

const FORMATTER = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function CheckoutPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    myTransaction,
    activeTx,
    viewState,
    syncOutcome,
    hasOpenTransaction,
    qrReady,
    isLoading,
    checkingStatus,
    secondsRemaining,
    createQrisMutation,
    cancelTxMutation,
    handleCheckStatus,
    requestCreateQris,
  } = useQrisPayment({ defaultType: 'form', pollEnabled: true })

  const applicant = myTransaction?.applicant
  const formTx = myTransaction?.transaction
  const currentTx = activeTx || formTx
  const amount = currentTx?.amount || 250000

  const isExpired = user?.payment_status === 'expired' || user?.payment_status === 'failed'
  const formPaid =
    (formTx?.status === 'success' || formTx?.status === 'paid') && formTx?.payment_type === 'form'
  const isPaid = user?.payment_status === 'paid' || formPaid

  // Setelah transaksi formulir sukses (via sync/polling), segarkan data auth
  // sekali agar `ProtectedRoute requirePaid` mengizinkan akses `/applicant`.
  const refreshedAuthRef = useRef(false)
  useEffect(() => {
    if (user?.payment_status === 'paid') {
      navigate('/applicant', { replace: true })
      return
    }
    if (formPaid && !refreshedAuthRef.current) {
      refreshedAuthRef.current = true
      void refreshUser()
    }
  }, [user?.payment_status, formPaid, navigate, refreshUser])

  const createQris = createQrisMutation.mutate
  const isCreating = createQrisMutation.isPending

  // Buat QRIS otomatis sekali per kunjungan bila tidak ada transaksi terbuka.
  // Transaksi `pending_verification` / `pending` tidak dianggap "tidak ada".
  const attemptedRef = useRef(false)
  useEffect(() => {
    if (isLoading) return
    if (isPaid || isExpired) return
    if (hasOpenTransaction) return
    if (isCreating) return
    if (attemptedRef.current) return
    attemptedRef.current = true
    createQris({ pType: 'form' })
  }, [isLoading, isPaid, isExpired, hasOpenTransaction, isCreating, createQris])

  const countdownElapsed = secondsRemaining <= 0
  const isVerifying = viewState === 'verifying'
  const isException = viewState === 'exception'
  const isTerminalError = viewState === 'expired' || viewState === 'cancelled' || viewState === 'failed'

  const handleRetryCreate = () => {
    attemptedRef.current = true
    requestCreateQris('form')
    toast('info', 'Membuat kode QRIS baru…')
  }

  const headerBadge = (() => {
    if (isVerifying) return { variant: 'info' as const, label: 'Memeriksa Status' }
    if (viewState === 'paid') return { variant: 'success' as const, label: 'LUNAS ✓' }
    if (isException) return { variant: 'warning' as const, label: 'Pemeriksaan Admin' }
    if (isTerminalError) return { variant: 'destructive' as const, label: 'Tidak Aktif' }
    if (qrReady) {
      return countdownElapsed
        ? { variant: 'info' as const, label: 'Memeriksa Status' }
        : { variant: 'warning' as const, label: 'Menunggu Pembayaran' }
    }
    if (viewState === 'loading') return { variant: 'secondary' as const, label: 'Menyiapkan…' }
    return { variant: 'warning' as const, label: 'Menunggu Pembayaran' }
  })()

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
                <Badge variant={headerBadge.variant} className="self-start sm:self-auto px-3 py-1 text-xs shrink-0">
                  {headerBadge.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">

              {/* Countdown / status card */}
              <div className={`rounded-xl border p-3.5 sm:p-4 space-y-2 transition-colors ${
                qrReady && !countdownElapsed ? 'border-amber-200 bg-amber-50/60' : 'border-blue-200 bg-blue-50/60'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{isVerifying ? 'Pemeriksaan Status Pembayaran' : 'Masa Berlaku Tampilan QRIS (15 Menit)'}</span>
                  </span>
                  {isVerifying ? (
                    <span className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa…
                    </span>
                  ) : (
                    <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${
                      secondsRemaining > 60 ? 'bg-amber-200/80 text-amber-950' : 'bg-blue-200 text-blue-950'
                    }`}>
                      {!countdownElapsed ? formatCountdown(secondsRemaining) : '00:00 - MEMERIKSA'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {isVerifying
                    ? 'Transaksi Anda sedang diverifikasi ke gateway. Mohon jangan membuat pembayaran baru atau membayar ulang sebelum status jelas.'
                    : qrReady && !countdownElapsed
                      ? 'Selesaikan pembayaran sebelum countdown habis agar tidak perlu membuat kode QR baru.'
                      : 'Batas tampilan telah tercapai, tetapi status transaksi belum tentu kedaluwarsa. Sistem memeriksa status ke gateway — jangan membuat pembayaran baru sampai status dipastikan.'}
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

              {/* Live QRIS / status Display */}
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
                  {/* QR Code / status Container */}
                  <div className="relative flex flex-col items-center bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-inner shrink-0 w-full max-w-[240px] sm:max-w-[260px]">
                    {qrReady ? (
                      <div className="p-2 bg-white rounded-lg border-2 border-slate-300 shadow-sm flex items-center justify-center">
                        <QRCodeSVG
                          value={currentTx.qr_string}
                          size={190}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    ) : viewState === 'loading' || isVerifying ? (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                        <p className="text-xs font-semibold text-slate-700">Memeriksa status pembayaran…</p>
                        <p className="text-[11px] text-muted-foreground">Mohon jangan membayar ulang.</p>
                      </div>
                    ) : isException ? (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-amber-50 rounded-lg border-2 border-dashed border-amber-300 flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <ShieldAlert className="w-9 h-9 text-amber-500" />
                        <p className="text-xs font-semibold text-slate-700">Menunggu pemeriksaan admin</p>
                        <p className="text-[11px] text-muted-foreground">Tim admin akan menindaklanjuti pembayaran Anda.</p>
                      </div>
                    ) : isTerminalError ? (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-50 rounded-lg border-2 border-dashed border-red-300 flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <XCircle className="w-10 h-10 text-red-500" />
                        <p className="text-xs font-semibold text-slate-700">Transaksi Tidak Aktif</p>
                        <Button
                          size="sm"
                          onClick={handleRetryCreate}
                          disabled={isCreating}
                          className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          {isCreating ? 'Membuat...' : 'Buat Ulang QRIS'}
                        </Button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center space-y-2">
                        <Ban className="w-9 h-9 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-600">Belum ada kode QRIS</p>
                        <Button
                          size="sm"
                          onClick={handleRetryCreate}
                          disabled={isCreating}
                          className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          {isCreating ? 'Membuat...' : 'Buat QRIS'}
                        </Button>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-mono text-slate-500 break-all">Order ID: {currentTx?.order_id || currentTx?.id || '-'}</p>
                    </div>
                  </div>

                  {/* Payment instructions */}
                  <div className="flex-1 space-y-3 text-xs text-slate-600 min-w-0">
                    {isVerifying || (qrReady && countdownElapsed) ? (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
                        <p className="font-semibold text-[11px] text-blue-800 flex items-center gap-1">
                          <SearchCheck className="h-3.5 w-3.5 shrink-0" /> Memeriksa status ke gateway
                        </p>
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                          {syncOutcome?.message ||
                            'Status pembayaran belum dapat dipastikan. Jangan membuat transaksi atau membayar ulang selama pemeriksaan berlangsung.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                          <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Cara Pembayaran:</span>
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                          <li>Buka aplikasi <strong>M-Banking</strong> atau <strong>E-Wallet</strong> favorit Anda.</li>
                          <li>Pilih menu <strong>Bayar / Scan QRIS</strong>.</li>
                          <li>Arahkan kamera ke QR Code di samping.</li>
                          <li>Periksa nama merchant: <strong>PPDB PTDARRAHMAN</strong>.</li>
                          <li>Pastikan nominal tepat: <strong>{FORMATTER.format(amount)}</strong>.</li>
                          <li>Konfirmasi pembayaran dengan PIN Anda.</li>
                        </ol>
                      </>
                    )}

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
                  onClick={() => handleCheckStatus(currentTx?.id)}
                  disabled={checkingStatus || isLoading || !currentTx?.id}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                  {checkingStatus ? 'Memeriksa Verifikasi...' : 'Cek Status Pembayaran (Manual Refresh)'}
                </Button>

                {hasOpenTransaction && (
                  <Button
                    variant="outline"
                    className="h-11 text-xs sm:text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => currentTx?.id && cancelTxMutation.mutate(currentTx.id)}
                    disabled={cancelTxMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    {cancelTxMutation.isPending ? 'Membatalkan...' : 'Batal / Ganti Transaksi'}
                  </Button>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 sm:p-6 border-t bg-muted/20 text-xs text-muted-foreground">
              <span>PPDB PTDARRAHMAN · Integrasi Resmi Pak Kasir API v2</span>
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
