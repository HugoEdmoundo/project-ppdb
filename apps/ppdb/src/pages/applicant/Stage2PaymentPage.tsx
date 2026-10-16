import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import { Stage2PaymentStep } from './components/Stage2PaymentStep'
import { Skeleton, Button } from '@/components/ui'
import { AlertTriangle, Lock, ArrowLeft } from 'lucide-react'

export default function Stage2PaymentPage() {
  const navigate = useNavigate()

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const applicant = transactionQuery.data?.applicant
  const financials = transactionQuery.data?.financials
  const isLoading = transactionQuery.isLoading

  const isPassed = applicant?.status === 'passed'
  const isDpPaid = Boolean(financials?.dp_paid)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Pembayaran Tahap 2"
          description="Monitoring tagihan pendidikan LoA, pembayaran cicilan bertahap via QRIS Pak Kasir, dan riwayat kuitansi resmi."
          docKey="applicant-stage2"
        />

        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !isPassed ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Tahap Masih Terkunci</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Tahap Pembayaran Tahap 2 hanya dapat diakses setelah pendaftar dinyatakan lulus seleksi dan menyelesaikan pembayaran Uang Muka (DP).
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/applicant')}
              className="gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Button>
          </div>
        ) : !isDpPaid ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm border border-amber-200 text-center space-y-4 bg-amber-50/30">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-amber-950 font-heading">Uang Muka (DP) Belum Diselesaikan</h3>
              <p className="text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">
                Pembayaran cicilan dan pelunasan Tahap 2 baru akan terbuka secara otomatis setelah Anda menyelesaikan pembayaran Uang Muka (DP) gelombang terlebih dahulu.
              </p>
            </div>
            <Button
              onClick={() => navigate('/applicant/bayar-dp')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-5 gap-2"
            >
              <span>Ke Halaman Bayar DP & Sertifikat</span>
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <Stage2PaymentStep />
          </div>
        )}
      </main>
    </div>
  )
}
