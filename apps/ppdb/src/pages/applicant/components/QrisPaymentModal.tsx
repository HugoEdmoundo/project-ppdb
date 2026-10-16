import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Button } from '@/components/ui'
import { QRCodeSVG } from 'qrcode.react'
import {
  RefreshCw,
  Smartphone,
  XCircle,
  Loader2,
  SearchCheck,
  CheckCircle2,
  ShieldAlert,
  Ban,
  Clock,
} from 'lucide-react'
import { formatCountdown, type LocalPaymentState } from '../hooks/paymentStatus'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface QrisPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTx: any
  state: LocalPaymentState
  secondsRemaining: number
  checkingStatus: boolean
  syncMessage?: string | null
  onCheckStatus: () => void
  onCancelTx: (txId: string) => void
  isCancelling?: boolean
}

function StateBadge({ state, secondsRemaining }: { state: LocalPaymentState; secondsRemaining: number }) {
  if (state === 'paid') {
    return (
      <Badge variant="success" className="text-xs font-semibold">
        LUNAS ✓
      </Badge>
    )
  }
  if (state === 'cancelled' || state === 'expired' || state === 'failed') {
    return (
      <Badge variant="destructive" className="text-xs font-semibold uppercase">
        {state === 'failed' ? 'Gagal' : state === 'expired' ? 'Kedaluwarsa' : 'Dibatalkan'}
      </Badge>
    )
  }
  if (state === 'exception') {
    return (
      <Badge variant="warning" className="text-xs font-semibold uppercase">
        Pemeriksaan Admin
      </Badge>
    )
  }
  // awaiting_payment / verifying / loading / none
  if (state === 'awaiting_payment' && secondsRemaining > 0) {
    return (
      <Badge variant="warning" className="text-xs font-mono">
        {formatCountdown(secondsRemaining)}
      </Badge>
    )
  }
  return (
    <Badge variant="info" className="text-xs font-semibold uppercase">
      Memeriksa Status
    </Badge>
  )
}

export default function QrisPaymentModal({
  open,
  onOpenChange,
  activeTx,
  state,
  secondsRemaining,
  checkingStatus,
  syncMessage,
  onCheckStatus,
  onCancelTx,
  isCancelling = false,
}: QrisPaymentModalProps) {
  const canShowQr = state === 'awaiting_payment' || state === 'verifying'
  const isTerminal =
    state === 'paid' || state === 'cancelled' || state === 'expired' || state === 'failed'
  const isOpenTx = state === 'awaiting_payment' || state === 'verifying'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center justify-between gap-2">
            <span>Pembayaran QRIS Pak Kasir</span>
            <StateBadge state={state} secondsRemaining={secondsRemaining} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total */}
          <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-800 uppercase font-semibold">
              Total yang Harus Dibayar
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-heading">
              {formatRp(activeTx?.amount || 0)}
            </div>
            <span className="text-[11px] text-emerald-600">
              {activeTx?.payment_type === 'form'
                ? 'Biaya Formulir Pendaftaran'
                : activeTx?.payment_type === 'dp'
                  ? 'Pembayaran Uang Muka (DP)'
                  : 'Cicilan Biaya Pendidikan'}
            </span>
          </div>

          {/* QR / status area */}
          <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-inner">
            {state === 'loading' ? (
              <div className="w-52 h-52 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center space-y-3">
                <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-700">Menyiapkan transaksi…</p>
              </div>
            ) : state === 'paid' ? (
              <div className="w-52 h-52 bg-emerald-50 rounded-xl border-2 border-emerald-200 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">Pembayaran Berhasil</p>
                <p className="text-[11px] text-emerald-700">
                  Pembayaran Anda telah diverifikasi oleh gateway.
                </p>
              </div>
            ) : canShowQr && activeTx?.qr_string ? (
              <div className="flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-sm">
                  <QRCodeSVG value={activeTx.qr_string} size={200} level="M" includeMargin />
                </div>
                {secondsRemaining <= 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    <Clock className="w-3.5 h-3.5" />
                    Batas tampilan tercapai — status sedang diperiksa ke gateway.
                  </div>
                )}
              </div>
            ) : isOpenTx ? (
              <div className="w-52 h-52 bg-blue-50 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <SearchCheck className="w-10 h-10 text-blue-500" />
                <p className="text-xs font-semibold text-slate-700">
                  Memeriksa status pembayaran
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Transaksi Anda belum dapat dipastikan. Mohon jangan membayar ulang.
                </p>
              </div>
            ) : state === 'exception' ? (
              <div className="w-52 h-52 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700">Menunggu pemeriksaan admin</p>
                <p className="text-[11px] text-muted-foreground">
                  Pembayaran terdeteksi setelah tagihan dibatalkan. Tim admin akan menindaklanjuti.
                </p>
              </div>
            ) : isTerminal ? (
              <div className="w-52 h-52 bg-slate-50 rounded-xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <XCircle className="w-10 h-10 text-red-500" />
                <p className="text-xs font-semibold text-slate-700">
                  {state === 'cancelled' ? 'Transaksi Dibatalkan' : 'Transaksi Tidak Aktif'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Tutup jendela ini dan buat transaksi baru dari halaman pembayaran.
                </p>
              </div>
            ) : (
              <div className="w-52 h-52 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <Ban className="w-10 h-10 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi aktif</p>
              </div>
            )}
            <span className="text-[11px] font-mono text-slate-400 mt-2">
              Order ID: {activeTx?.order_id || activeTx?.id || '-'}
            </span>
          </div>

          {/* Pesan status */}
          {syncMessage && isOpenTx && (
            <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3">
              {syncMessage}
            </div>
          )}

          {/* Instruksi */}
          {state === 'awaiting_payment' && (
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Petunjuk Pembayaran:</span>
              </p>
              <p>1. Buka aplikasi M-Banking atau E-Wallet yang mendukung QRIS.</p>
              <p>2. Scan kode QR di atas dan pastikan nama penerima adalah PTDARRAHMAN.</p>
              <p>3. Konfirmasi pembayaran. Status akan diperbarui secara otomatis.</p>
            </div>
          )}

          {isOpenTx && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Jangan membuat transaksi atau membayar ulang selama transaksi ini belum
                dipastikan, untuk menghindari pembayaran ganda.
              </span>
            </div>
          )}

          {/* Aksi */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {state === 'paid' || isTerminal ? (
              <Button
                className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>
            ) : (
              <>
                <Button
                  className="flex-1 h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer"
                  onClick={onCheckStatus}
                  disabled={checkingStatus}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                  {checkingStatus ? 'Memeriksa...' : 'Cek Status Pembayaran'}
                </Button>
                {activeTx?.id && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onCancelTx(activeTx.id)
                      onOpenChange(false)
                    }}
                    disabled={isCancelling}
                    className="h-10 text-xs text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                  >
                    Batalkan Transaksi
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
