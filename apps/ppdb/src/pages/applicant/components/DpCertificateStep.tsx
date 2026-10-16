import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useQrisPayment } from '../hooks/useQrisPayment'
import QrisPaymentModal from './QrisPaymentModal'
import OfficialReceiptModal from './OfficialReceiptModal'
import ApplicantSKDModal from '@/components/shared/ApplicantSKDModal'
import { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import {
  CheckCircle,
  CreditCard,
  QrCode,
  Receipt,
  FileSignature,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sparkles,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface DpCertificateStepProps {
  applicant: any
  loa?: any
}

export default function DpCertificateStep({ applicant, loa }: DpCertificateStepProps) {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [showSkdModal, setShowSkdModal] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  const isLoaSigned = Boolean(loa?.is_loa_signed || applicant?.is_loa_signed)

  const {
    paymentModalOpen,
    setPaymentModalOpen,
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
  } = useQrisPayment({ defaultType: 'dp', autoOpenOnOpenTransaction: true })

  // SKD & WhatsApp Group Query
  const { data: skdData } = useQuery({
    queryKey: ['applicant-skd', applicant?.id],
    queryFn: () => apiFetch<any>('/ppdb/applicants/me/skd'),
    enabled: !!applicant?.id && financials.dp_paid,
  })

  // Initiate DP Payment
  const handlePayDP = () => {
    if (!isLoaSigned) {
      toast('warning', 'Mohon tanda tangani dokumen LoA terlebih dahulu sebelum membayar DP.')
      navigate('/applicant/pengumuman')
      return
    }
    requestCreateQris('dp')
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
      {/* 1. Pembayaran Uang Muka (DP) Card */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-900 text-base">1. Pembayaran Uang Muka (DP)</h4>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50/80 rounded-xl border border-slate-200 gap-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block font-semibold">
                Nominal Ketetapan DP Gelombang
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading block mt-0.5">
                {formatRp(financials.minimum_dp)}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                {financials.dp_paid
                  ? `Lunas terverifikasi pada ${financials.dp_paid_at ? new Date(financials.dp_paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}`
                  : 'Nominal DP ditetapkan resmi oleh gelombang PPDB PTDARRAHMAN'}
              </span>
            </div>

            {!financials.dp_paid ? (
              <Button
                onClick={handlePayDP}
                disabled={isCreating || !isLoaSigned}
                className="w-full sm:w-auto h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-2 shadow-xs cursor-pointer px-5"
              >
                <QrCode className="w-4 h-4" />
                {isCreating ? 'Menyiapkan QRIS...' : 'Bayar DP via QRIS Pakasir'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    const dpTx = recentTransactions.find(t => t.payment_type === 'dp' && (t.status === 'success' || t.status === 'paid'))
                    if (dpTx) handleOpenReceipt(dpTx)
                    else toast('info', 'Data kuitansi DP sedang disiapkan.')
                  }}
                  className="gap-1.5 h-10 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold cursor-pointer w-full sm:w-auto"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Kuitansi Resmi DP
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Dokumen SKD (Format Sertifikat) & Komunikasi Resmi */}
      <div className="border border-emerald-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-emerald-50/80 p-4 sm:p-5 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <h4 className="font-semibold text-emerald-950 text-base">2. Dokumen Sertifikat SKD & Komunikasi Resmi</h4>
          </div>
          {financials.dp_paid ? (
            <Badge variant="success" className="bg-emerald-200 text-emerald-900 border-emerald-400 font-semibold">Aktif</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-300 gap-1 text-xs">
              <Lock className="w-3 h-3" /> Terkunci
            </Badge>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {financials.dp_paid ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                <div className="space-y-0.5">
                  <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>Surat Keterangan Diterima (SKD) - Format Sertifikat</span>
                    <Badge variant="success" className="text-[10px] bg-emerald-100 text-emerald-800">Resmi</Badge>
                  </h5>
                  <p className="text-xs text-slate-600">
                    Sertifikat resmi tanda kelulusan penerimaan santri baru lengkap dengan Nomor Registrasi permanen.
                  </p>
                </div>
                <Button
                  onClick={() => setShowSkdModal(true)}
                  className="w-full sm:w-auto h-10 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  <FileSignature className="w-4 h-4" />
                  Lihat / Cetak Sertifikat SKD
                </Button>
              </div>

              {skdData?.whatsapp_group_link && (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-teal-50/50 border border-teal-200 rounded-xl">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-sm text-teal-950">Grup WhatsApp Calon Santri Baru</h5>
                    <p className="text-xs text-teal-800">
                      Bergabung dengan komunitas komunikasi resmi sesama santri dan wali santri angkatan baru.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-10 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs shrink-0 cursor-pointer"
                    asChild
                  >
                    <a href={skdData.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" />
                      Gabung Grup WhatsApp
                    </a>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Dokumen Sertifikat SKD Masih Terkunci</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sertifikat SKD resmi (dengan nomor registrasi santri) dan tautan grup WhatsApp calon santri baru akan terbuka secara otomatis segera setelah Anda menyelesaikan pembayaran DP di atas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Next Step Action Banner (Pembayaran Tahap 2) */}
      {financials.dp_paid ? (
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Tahap Selanjutnya Aktif
              </span>
              <h4 className="font-bold text-slate-900 text-base sm:text-lg font-heading">
                Lanjut ke Pembayaran Tahap 2 (Cicilan & Pelunasan)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Uang Muka (DP) telah terverifikasi. Anda kini dapat memantau sisa kewajiban biaya pendidikan, melakukan pembayaran cicilan bertahap, serta mengunduh seluruh kuitansi digital.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/applicant/pembayaran-tahap2')}
            className="w-full md:w-auto h-11 px-5 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shrink-0 cursor-pointer shadow-md hover:scale-102 transition-transform"
          >
            <span>Pembayaran Tahap 2</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      {/* SKD Modal */}
      <ApplicantSKDModal
        open={showSkdModal}
        onOpenChange={setShowSkdModal}
        applicantId={applicant?.id}
        isApplicantPortal={true}
      />

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
