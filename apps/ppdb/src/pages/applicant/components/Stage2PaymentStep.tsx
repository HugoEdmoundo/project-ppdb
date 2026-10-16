import { useState, useEffect } from 'react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useQrisPayment } from '../hooks/useQrisPayment'
import QrisPaymentModal from './QrisPaymentModal'
import OfficialReceiptModal from './OfficialReceiptModal'
import { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import {
  CheckCircle,
  Receipt,
  QrCode,
  DollarSign,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Badge, Button, Input } from '@/components/ui'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export function Stage2PaymentStep() {
  const { toast } = useToast()
  const [customAmount, setCustomAmount] = useState<string>('')
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  const {
    paymentModalOpen,
    setPaymentModalOpen,
    setPaymentType,
    checkingStatus,
    secondsRemaining,
    financials,
    activeTx,
    recentTransactions,
    requestCreateQris,
    cancelTxMutation,
    handleCheckStatus,
    viewState,
    syncOutcome,
    isCreating,
  } = useQrisPayment({ defaultType: 'installment', autoOpenOnOpenTransaction: true })

  // Set default custom amount when opening installment payment
  useEffect(() => {
    if (financials?.remaining_balance) {
      setCustomAmount(String(financials.remaining_balance))
    }
  }, [financials?.remaining_balance])

  // Initiate Installment Payment
  const handlePayInstallment = () => {
    if (!financials.dp_paid) {
      toast('warning', 'Pembayaran DP harus diselesaikan terlebih dahulu.')
      return
    }
    const amt = parseInt(customAmount.replace(/\D/g, ''), 10)
    if (isNaN(amt) || amt <= 0) {
      toast('error', 'Nominal cicilan harus lebih dari 0')
      return
    }
    if (amt > financials.remaining_balance) {
      toast('error', `Nominal tidak boleh melebihi sisa tagihan (${formatRp(financials.remaining_balance)})`)
      return
    }
    setPaymentType('installment')
    requestCreateQris('installment', amt)
  }

  // Open Receipt
  const handleOpenReceipt = async (tx: any) => {
    try {
      const token = tx.receipt_token
      const endpoint = token
        ? `/payment/receipt/${tx.id}?token=${token}`
        : `/payment/receipt/${tx.id}`
      const data = await apiFetch<ReceiptData>(endpoint)
      setSelectedReceipt(data)
      setReceiptModalOpen(true)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat kuitansi')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Cicilan Biaya Pendidikan Tahap 2 */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-900 text-base">Monitoring Biaya Pendidikan & Cicilan Tahap 2</h4>
              <p className="text-xs text-muted-foreground truncate">Monitoring kewajiban total tagihan LoA dan pembayaran cicilan bertahap</p>
            </div>
          </div>
          {financials.is_lunas ? (
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 gap-1.5 px-3 py-1 font-bold shrink-0">
              <CheckCircle className="w-3.5 h-3.5" /> LUNAS ✓
            </Badge>
          ) : (
            <Badge variant={financials.dp_paid ? 'outline' : 'secondary'} className="gap-1.5 px-3 py-1 shrink-0 font-semibold">
              {financials.dp_paid ? 'Belum Lunas' : 'Menunggu DP'}
            </Badge>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* Financial Dashboard Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-0">
              <span className="text-xs text-muted-foreground font-medium block truncate">Total Tagihan LoA</span>
              <span className="text-xl font-bold text-slate-900 font-heading block mt-0.5 truncate">
                {formatRp(financials.total_obligation)}
              </span>
            </div>
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 min-w-0">
              <span className="text-xs text-emerald-800 font-medium block truncate">Total Pembayaran Terverifikasi</span>
              <span className="text-xl font-bold text-emerald-700 font-heading block mt-0.5 truncate">
                {formatRp(financials.total_paid)}
              </span>
            </div>
            <div className={`p-3.5 rounded-xl border min-w-0 ${financials.is_lunas ? 'bg-emerald-100/60 border-emerald-300' : 'bg-amber-50/70 border-amber-200'}`}>
              <span className={`text-xs font-medium block truncate ${financials.is_lunas ? 'text-emerald-800' : 'text-amber-800'}`}>
                Sisa Tagihan
              </span>
              <span className={`text-xl font-bold font-heading block mt-0.5 truncate ${financials.is_lunas ? 'text-emerald-900' : 'text-amber-900'}`}>
                {formatRp(financials.remaining_balance)}
              </span>
            </div>
          </div>

          {/* Installment Payment Form or Lunas State */}
          {!financials.dp_paid ? (
            <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-xs text-muted-foreground text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">Pembayaran Cicilan Belum Terbuka</p>
              <p className="text-slate-500 max-w-md mx-auto">
                Pembayaran cicilan Tahap 2 akan terbuka secara otomatis setelah pembayaran Uang Muka (DP) Anda diverifikasi.
              </p>
            </div>
          ) : financials.is_lunas ? (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h5 className="font-bold text-emerald-900 text-lg font-heading">Alhamdulillah, Seluruh Tagihan Telah Lunas!</h5>
              <p className="text-xs sm:text-sm text-emerald-700 max-w-lg mx-auto leading-relaxed">
                Terima kasih telah menyelesaikan seluruh kewajiban biaya pendidikan. Calon santri telah memenuhi syarat administratif secara penuh untuk memulai masa studi di PTDARRAHMAN.
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-slate-200 space-y-4">
              <div>
                <h5 className="font-bold text-sm text-slate-900">Bayar Cicilan Tahap 2</h5>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan sendiri nominal cicilan yang ingin Anda bayarkan saat ini (maksimal: {formatRp(financials.remaining_balance)}):
                </p>
              </div>

              {/* Preset quick buttons */}
              <div className="flex flex-wrap gap-2">
                {[1000000, 2500000, 5000000].map(amt => {
                  if (amt > financials.remaining_balance) return null
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmount(String(amt))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                    >
                      {formatRp(amt)}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setCustomAmount(String(financials.remaining_balance))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Bayar Lunas Sisa ({formatRp(financials.remaining_balance)})
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    min={10000}
                    max={financials.remaining_balance}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Contoh: 2500000"
                    className="pl-10 h-11 text-base font-bold text-slate-900"
                  />
                </div>
                <Button
                  onClick={handlePayInstallment}
                  disabled={isCreating}
                  className="h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 shrink-0 px-5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  {isCreating ? 'Menyiapkan...' : 'Bayar Cicilan via QRIS'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Riwayat Transaksi & Kuitansi Digital */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
            <h4 className="font-semibold text-slate-900 text-base">Riwayat Transaksi & Kuitansi Resmi</h4>
          </div>
          <span className="text-xs text-muted-foreground font-medium">{recentTransactions.length} transaksi tercatat</span>
        </div>

        <div className="p-0 sm:p-4">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Belum ada transaksi pembayaran yang tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full text-xs text-left min-w-[560px]">
                <thead className="bg-slate-50 border-b text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Jenis Pembayaran</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Nominal</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx: any) => {
                    const isSuccess = tx.status === 'success' || tx.status === 'paid'
                    const isPending = tx.status === 'pending'
                    const isVerifying = tx.status === 'pending_verification'
                    const isOpen = isPending || isVerifying
                    const isActiveRow = isOpen && tx.id === activeTx?.id
                    const typeLabel =
                      tx.payment_type === 'form'
                        ? 'Formulir Pendaftaran'
                        : tx.payment_type === 'dp'
                        ? 'Uang Muka (DP)'
                        : `Cicilan ke-${tx.installment_number || 1}`

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                          {typeLabel}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.order_id || tx.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {formatRp(tx.amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <Badge
                            variant={
                              isSuccess
                                ? 'success'
                                : isVerifying
                                ? 'info'
                                : isPending
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px] uppercase font-semibold"
                          >
                            {isSuccess
                              ? 'Lunas ✓'
                              : isVerifying
                              ? 'Perlu Verifikasi'
                              : isPending
                              ? 'Pending'
                              : tx.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {isSuccess ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReceipt(tx)}
                              className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              Kuitansi
                            </Button>
                          ) : isOpen ? (
                            <div className="inline-flex gap-1.5">
                              {isActiveRow && isPending && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPaymentType(tx.payment_type || 'installment')
                                    setPaymentModalOpen(true)
                                  }}
                                  className="h-8 text-xs bg-emerald-700 text-white font-medium cursor-pointer"
                                >
                                  Buka QRIS
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCheckStatus(tx.id)}
                                disabled={checkingStatus}
                                className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Cek Status
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelTxMutation.mutate(tx.id)}
                                disabled={cancelTxMutation.isPending}
                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QRIS Active Payment Modal */}
      <QrisPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        activeTx={activeTx}
        state={viewState}
        secondsRemaining={secondsRemaining}
        checkingStatus={checkingStatus}
        syncMessage={syncOutcome?.message}
        onCheckStatus={() => handleCheckStatus()}
        onCancelTx={(txId) => cancelTxMutation.mutate(txId)}
        isCancelling={cancelTxMutation.isPending}
      />

      {/* Official Receipt Viewer Modal */}
      <OfficialReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={selectedReceipt}
      />
    </div>
  )
}

export default Stage2PaymentStep
