import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import ApplicantSKDModal from '@/components/shared/ApplicantSKDModal'
import ApplicantLoAModal from '@/components/shared/ApplicantLoAModal'
import ApplicantSignLoAModal from '@/components/shared/ApplicantSignLoAModal'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import { QRCodeSVG } from 'qrcode.react'
import {
  CheckCircle,
  MessageCircle,
  X,
  FileSignature,
  Receipt,
  AlertTriangle,
  ShieldCheck,
  QrCode,
  RefreshCw,
  XCircle,
  Smartphone,
  CreditCard,
  CheckCircle2,
  DollarSign,
  PenTool,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@/components/ui'
import { useToast } from '@/components/Toast'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface ResultStepProps {
  applicant: any
  selectionResult: any
  loa?: any
  stage2Bills?: any[]
  onUploadProof?: (billId: string, e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ResultStep({ applicant, selectionResult, loa }: ResultStepProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showSkdModal, setShowSkdModal] = useState(false)
  const [showLoaModal, setShowLoaModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)

  // QRIS Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [, setPaymentType] = useState<'dp' | 'installment'>('dp')
  const [customAmount, setCustomAmount] = useState<string>('')
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900)

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  // Query my transaction to get centralized financials & active transaction
  const myTxQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const financials = myTxQuery.data?.financials || {
    total_obligation: 15000000,
    minimum_dp: 5000000,
    dp_paid: false,
    dp_amount_paid: 0,
    total_paid: 0,
    remaining_balance: 15000000,
    is_lunas: false,
    successful_installments_count: 0
  }

  const activeTx = myTxQuery.data?.active_transaction
  const recentTransactions: any[] = myTxQuery.data?.recent_transactions || []

  // SKD Query
  const { data: skdData } = useQuery({
    queryKey: ['applicant-skd', applicant?.id],
    queryFn: () => apiFetch<any>('/ppdb/applicants/me/skd'),
    enabled: !!applicant?.id && financials.dp_paid,
  })

  // Set default custom amount when opening installment payment
  useEffect(() => {
    if (financials?.remaining_balance) {
      setCustomAmount(String(financials.remaining_balance))
    }
  }, [financials?.remaining_balance])

  // Countdown timer for active QRIS
  useEffect(() => {
    if (activeTx?.expires_in_seconds !== undefined) {
      setSecondsRemaining(Math.max(0, activeTx.expires_in_seconds))
    } else if (activeTx?.expired_at) {
      const exp = new Date(activeTx.expired_at).getTime()
      const now = new Date().getTime()
      setSecondsRemaining(Math.max(0, Math.floor((exp - now) / 1000)))
    }
  }, [activeTx])

  useEffect(() => {
    if (secondsRemaining <= 0) return
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsRemaining])

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Create QRIS Mutation
  const createQrisMutation = useMutation({
    mutationFn: ({ pType, amt }: { pType: string, amt?: number }) => apiFetch<any>('/payment/create-qris', {
      method: 'POST',
      body: JSON.stringify({ payment_type: pType, amount: amt })
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      setPaymentModalOpen(true)
      if (data.expires_in_seconds) {
        setSecondsRemaining(data.expires_in_seconds)
      }
      toast('success', 'Kode QRIS Pakasir berhasil diterbitkan!')
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal membuat QRIS')
    }
  })

  // Cancel Transaction Mutation
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

  // Manual Status Sync
  const handleCheckStatus = async (txId?: string) => {
    const targetId = txId || activeTx?.id
    if (!targetId) return
    setCheckingStatus(true)
    try {
      const res = await apiFetch<any>(`/payment/transactions/${targetId}/sync-status`, {
        method: 'POST'
      })
      if (res.status === 'success') {
        toast('success', 'Alhamdulillah! Pembayaran Anda berhasil diverifikasi.')
        await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
        setPaymentModalOpen(false)
      } else if (res.status === 'expired') {
        toast('warning', 'Batas waktu pembayaran QRIS telah kedaluwarsa.')
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

  // Periodic polling every 7 seconds when active QRIS modal is open
  useEffect(() => {
    if (!paymentModalOpen || !activeTx?.id || activeTx.status !== 'pending' || secondsRemaining <= 0) return
    const interval = setInterval(() => {
      apiFetch<any>(`/payment/transactions/${activeTx.id}/sync-status`, { method: 'POST' })
        .then(res => {
          if (res.status === 'success') {
            toast('success', 'Pembayaran berhasil diverifikasi!')
            queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
            setPaymentModalOpen(false)
          }
        })
        .catch(() => {})
    }, 7000)

    return () => clearInterval(interval)
  }, [paymentModalOpen, activeTx?.id, activeTx?.status, secondsRemaining, queryClient, toast])

  // Initiate DP Payment
  const handlePayDP = () => {
    if (!loa?.is_loa_signed) {
      toast('warning', 'Mohon tanda tangani dokumen LoA terlebih dahulu sebelum membayar DP.')
      setShowLoaModal(true)
      return
    }
    setPaymentType('dp')
    createQrisMutation.mutate({ pType: 'dp' })
  }

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
    createQrisMutation.mutate({ pType: 'installment', amt })
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

  const isLoaSigned = Boolean(loa?.is_loa_signed || applicant?.is_loa_signed)

  return (
    <div className="space-y-6">
      {applicant?.status === 'passed' ? (
        <div className="space-y-6">
          {/* Pass Banner */}
          <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-12 h-12 shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-800">Selamat! Anda Dinyatakan Lulus</h3>
                  <p className="text-emerald-700 text-sm mt-1">
                    Selamat, Anda telah lulus seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Arrahman.
                  </p>
                </div>
              </div>

              {selectionResult?.scores && selectionResult.scores.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-4 sm:mt-6">
                  {selectionResult.scores.map((sc: any, idx: number) => (
                    <div key={idx} className="bg-white border border-emerald-100 rounded-xl p-3 flex justify-between items-center shadow-2xs gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{sc.category_name}</p>
                        <p className="text-sm font-medium text-emerald-900 break-words">{sc.criteria_name}</p>
                      </div>
                      <div className="text-xl font-bold text-emerald-700 shrink-0">{sc.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 1. LoA Section (Prerequisite) */}
          <div className="border border-emerald-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-emerald-50/70 p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-emerald-950 text-base">1. Dokumen Letter of Acceptance (LoA)</h4>
                  <p className="text-xs text-emerald-700 truncate">Surat Resmi Penerimaan Santri Baru & Persetujuan Orang Tua/Wali</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isLoaSigned ? (
                  <>
                    <Badge variant="success" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sudah Ditandatangani
                    </Badge>
                    <Button onClick={() => setShowLoaModal(true)} className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-semibold text-xs cursor-pointer">
                      <FileSignature className="w-4 h-4" />
                      Buka / Unduh LoA
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="warning" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Wajib Ditandatangani
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={() => setShowLoaModal(true)}
                      className="w-full sm:w-auto h-9 gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0 font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      <FileSignature className="w-4 h-4 text-slate-600" />
                      Lihat Dokumen LoA
                    </Button>
                    <Button
                      onClick={() => setShowSignModal(true)}
                      className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <PenTool className="w-4 h-4" />
                      Tanda Tangani LoA
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {!isLoaSigned && (
                <div className="p-4 sm:p-5 bg-amber-50/95 border-2 border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950 text-sm">
                        Konfirmasi Dua Pihak: Tanda Tangan Digital Orang Tua / Wali di Aplikasi
                      </p>
                      <p className="text-amber-900 leading-relaxed text-xs">
                        Calon santri yang dinyatakan lulus wajib melakukan konfirmasi dengan cara membubuhkan <strong>Tanda Tangan Digital Orang Tua / Wali secara langsung di aplikasi ini</strong> sebelum pembayaran Uang Muka (DP) dapat dilakukan. Tanda tangan dan nama orang tua/wali akan otomatis tercantum pada dokumen Letter of Acceptance (LoA).
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => setShowLoaModal(true)}
                      className="w-full sm:w-auto h-10 px-4 gap-2 bg-white hover:bg-amber-100/50 border-amber-300 text-amber-950 font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      <FileSignature className="w-4 h-4 text-amber-700" />
                      Lihat Dokumen LoA
                    </Button>
                    <Button
                      onClick={() => setShowSignModal(true)}
                      className="w-full sm:w-auto h-10 px-5 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      <PenTool className="w-4 h-4" />
                      Tanda Tangani LoA Sekarang
                    </Button>
                  </div>
                </div>
              )}
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">Klausul Resmi PPDB:</p>
                  <p className="mt-0.5 font-medium text-slate-800 italic">
                    "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ApplicantLoAModal open={showLoaModal} onOpenChange={setShowLoaModal} applicantId={applicant?.id} isApplicantPortal={true} />
          <ApplicantSignLoAModal open={showSignModal} onOpenChange={setShowSignModal} applicantId={applicant?.id} isApplicantPortal={true} />

          {/* 2. Pembayaran Uang Muka (DP) */}
          <div className="border border-slate-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900 text-base">2. Pembayaran Uang Muka (DP)</h4>
                  <p className="text-xs text-muted-foreground truncate">Syarat utama pengesahan calon santri dan pembagian kelas</p>
                </div>
              </div>
              {financials.dp_paid ? (
                <Badge variant="success" className="gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border-emerald-300 self-start sm:self-center shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> DP Terverifikasi
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 border-amber-300 self-start sm:self-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Menunggu Pembayaran DP
                </Badge>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50/80 rounded-xl border border-slate-200 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block">Nominal Ketetapan DP Gelombang</span>
                  <span className="text-2xl font-bold text-slate-900 font-heading">
                    {formatRp(financials.minimum_dp)}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {financials.dp_paid
                      ? `Lunas terverifikasi pada ${financials.dp_paid_at ? new Date(financials.dp_paid_at).toLocaleDateString('id-ID') : '-'}`
                      : 'Nominal DP ditetapkan oleh gelombang PPDB PTDARRAHMAN'}
                  </span>
                </div>

                {!financials.dp_paid ? (
                  <Button
                    onClick={handlePayDP}
                    disabled={createQrisMutation.isPending || !isLoaSigned}
                    className="w-full sm:w-auto h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    {createQrisMutation.isPending ? 'Menyiapkan QRIS...' : 'Bayar DP via QRIS Pakasir'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dpTx = recentTransactions.find(t => t.payment_type === 'dp' && t.status === 'success')
                        if (dpTx) handleOpenReceipt(dpTx)
                      }}
                      className="gap-1.5 h-9 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                    >
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Kuitansi DP
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Post-DP Rewards: SKD & WA Group Link */}
          {financials.dp_paid && (
            <div className="border border-emerald-200 rounded-2xl bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
              <div className="bg-emerald-50/80 p-4 sm:p-5 border-b border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h4 className="font-semibold text-emerald-950 text-base">3. Dokumen SKD & Komunikasi Resmi</h4>
                </div>
                <Badge variant="success" className="bg-emerald-200 text-emerald-900 border-emerald-400">Aktif</Badge>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3.5 bg-white border border-emerald-100 rounded-xl">
                  <div>
                    <h5 className="font-semibold text-sm text-slate-900">Surat Keterangan Diterima (SKD)</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">Surat resmi penerimaan santri baru lengkap dengan Nomor Registrasi.</p>
                  </div>
                  <Button onClick={() => setShowSkdModal(true)} className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs">
                    <FileSignature className="w-4 h-4" />
                    Lihat Dokumen SKD
                  </Button>
                </div>

                {skdData?.whatsapp_group_link && (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                    <div>
                      <h5 className="font-semibold text-sm text-emerald-950">Grup WhatsApp Calon Santri Baru</h5>
                      <p className="text-xs text-emerald-800 mt-0.5">Bergabung dengan grup komunikasi resmi sesama santri angkatan baru.</p>
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto h-9 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs" asChild>
                      <a href={skdData.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4" />
                        Gabung Grup WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
                <ApplicantSKDModal open={showSkdModal} onOpenChange={setShowSkdModal} applicantId={applicant?.id} isApplicantPortal={true} />
              </div>
            </div>
          )}

          {/* 4. Pembayaran Cicilan Tahap 2 */}
          <div className="border border-slate-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900 text-base">4. Cicilan Biaya Pendidikan Tahap 2</h4>
                  <p className="text-xs text-muted-foreground truncate">Monitoring kewajiban total tagihan LoA dan pembayaran cicilan bertahap</p>
                </div>
              </div>
              {financials.is_lunas ? (
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 gap-1.5 px-3 py-1 font-bold shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" /> LUNAS ✓
                </Badge>
              ) : (
                <Badge variant={financials.dp_paid ? "outline" : "secondary"} className="gap-1.5 px-3 py-1 shrink-0">
                  {financials.dp_paid ? 'Belum Lunas' : 'Menunggu DP'}
                </Badge>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              {/* Financial Dashboard Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-muted-foreground font-medium block">Total Tagihan LoA</span>
                  <span className="text-xl font-bold text-slate-900 font-heading block mt-0.5">
                    {formatRp(financials.total_obligation)}
                  </span>
                </div>
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-medium block">Total Pembayaran Terverifikasi</span>
                  <span className="text-xl font-bold text-emerald-700 font-heading block mt-0.5">
                    {formatRp(financials.total_paid)}
                  </span>
                </div>
                <div className={`p-3.5 rounded-xl border ${financials.is_lunas ? 'bg-emerald-100/60 border-emerald-300' : 'bg-amber-50/70 border-amber-200'}`}>
                  <span className={`text-xs font-medium block ${financials.is_lunas ? 'text-emerald-800' : 'text-amber-800'}`}>
                    Sisa Tagihan
                  </span>
                  <span className={`text-xl font-bold font-heading block mt-0.5 ${financials.is_lunas ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {formatRp(financials.remaining_balance)}
                  </span>
                </div>
              </div>

              {/* Installment Payment Form or Lunas State */}
              {!financials.dp_paid ? (
                <div className="p-4 bg-slate-50 border rounded-xl text-xs text-muted-foreground text-center">
                  Pembayaran cicilan Tahap 2 akan terbuka secara otomatis setelah pembayaran Uang Muka (DP) Anda terverifikasi.
                </div>
              ) : financials.is_lunas ? (
                <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h5 className="font-bold text-emerald-900 text-base">Alhamdulillah, Seluruh Tagihan Telah Lunas!</h5>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                    Terima kasih telah menyelesaikan seluruh kewajiban biaya pendidikan. Calon santri telah memenuhi syarat administratif penuh.
                  </p>
                </div>
              ) : (
                <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-slate-200 space-y-4">
                  <div>
                    <h5 className="font-semibold text-sm text-slate-900">Bayar Cicilan Tahap 2</h5>
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
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                        >
                          {formatRp(amt)}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setCustomAmount(String(financials.remaining_balance))}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
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
                      disabled={createQrisMutation.isPending}
                      className="h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 shrink-0 px-5"
                    >
                      <QrCode className="w-4 h-4" />
                      {createQrisMutation.isPending ? 'Menyiapkan...' : 'Bayar Cicilan via QRIS'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Riwayat Transaksi & Kuitansi Digital */}
          <div className="border border-slate-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-semibold text-slate-900 text-base">5. Riwayat Transaksi & Kuitansi Resmi</h4>
              </div>
              <span className="text-xs text-muted-foreground">{recentTransactions.length} transaksi</span>
            </div>

            <div className="p-0 sm:p-4">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Belum ada transaksi pembayaran yang tercatat.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
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
                        const typeLabel = tx.payment_type === 'form'
                          ? 'Formulir Pendaftaran'
                          : tx.payment_type === 'dp'
                          ? 'Uang Muka (DP)'
                          : `Cicilan ke-${tx.installment_number || 1}`

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 whitespace-nowrap text-slate-600">
                              {tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
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
                                variant={isSuccess ? 'success' : isPending ? 'warning' : 'secondary'}
                                className="text-[10px] uppercase font-semibold"
                              >
                                {isSuccess ? 'Lunas ✓' : isPending ? 'Pending' : tx.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              {isSuccess ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReceipt(tx)}
                                  className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                  Kuitansi
                                </Button>
                              ) : isPending ? (
                                <div className="inline-flex gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setPaymentType(tx.payment_type || 'dp')
                                      setPaymentModalOpen(true)
                                    }}
                                    className="h-8 text-xs bg-emerald-700 text-white font-medium"
                                  >
                                    Buka QRIS
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => cancelTxMutation.mutate(tx.id)}
                                    disabled={cancelTxMutation.isPending}
                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
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
        </div>
      ) : applicant?.status === 'failed' ? (
        <div className="p-6 sm:p-8 border rounded-2xl text-center bg-red-50/70 border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
          <p className="text-red-700 text-sm max-w-md mx-auto leading-relaxed">
            Terima kasih telah berpartisipasi dalam proses seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Arrahman.
          </p>
        </div>
      ) : (
        <div className="p-6 sm:p-8 border rounded-2xl text-center bg-muted/10">
          <p className="text-muted-foreground text-sm">Belum ada pengumuman hasil seleksi. Silakan cek kembali nanti.</p>
        </div>
      )}

      {/* QRIS Active Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Pembayaran QRIS Pak Kasir</span>
              <Badge variant={secondsRemaining > 0 ? "warning" : "destructive"} className="text-xs font-mono">
                {secondsRemaining > 0 ? formatTimer(secondsRemaining) : 'KEDALUWARSA'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-800 uppercase font-semibold">Total yang Harus Dibayar</span>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-heading">
                {formatRp(activeTx?.amount || 0)}
              </div>
              <span className="text-[11px] text-emerald-600">
                {activeTx?.payment_type === 'dp' ? 'Pembayaran Uang Muka (DP)' : 'Cicilan Biaya Pendidikan'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-inner">
              {activeTx?.qr_string && secondsRemaining > 0 ? (
                <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-sm">
                  <QRCodeSVG
                    value={activeTx.qr_string}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              ) : (
                <div className="w-52 h-52 bg-slate-50 rounded-xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <XCircle className="w-10 h-10 text-red-500" />
                  <p className="text-xs font-semibold text-slate-700">Kode QRIS Telah Kedaluwarsa</p>
                  <p className="text-[11px] text-muted-foreground">Silakan tutup modal dan buat transaksi baru.</p>
                </div>
              )}
              <span className="text-[11px] font-mono text-slate-400 mt-2">
                Order ID: {activeTx?.order_id || activeTx?.id || '-'}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Petunjuk Pembayaran:</span>
              </p>
              <p>1. Buka aplikasi M-Banking atau E-Wallet yang mendukung QRIS.</p>
              <p>2. Scan kode QR di atas dan pastikan nama penerima adalah PTDARRAHMAN.</p>
              <p>3. Konfirmasi pembayaran. Status akan diperbarui secara otomatis.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                className="flex-1 h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs"
                onClick={() => handleCheckStatus()}
                disabled={checkingStatus}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                {checkingStatus ? 'Memeriksa...' : 'Cek Status Pembayaran'}
              </Button>
              {activeTx?.id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelTxMutation.mutate(activeTx.id)
                    setPaymentModalOpen(false)
                  }}
                  disabled={cancelTxMutation.isPending}
                  className="h-10 text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  Batalkan Transaksi
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Receipt Viewer Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
          {selectedReceipt && (
            <div className="relative">
              <OfficialReceiptCard receipt={selectedReceipt} />
              <div className="p-3 bg-white border-t rounded-b-2xl flex justify-end gap-2 print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  Cetak Dokumen
                </Button>
                <Button
                  size="sm"
                  onClick={() => setReceiptModalOpen(false)}
                  className="text-xs bg-slate-800 text-white"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
