import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import DpCertificateStep from './components/DpCertificateStep'
import { Skeleton, Button } from '@/components/ui'
import { AlertTriangle, Lock, ArrowLeft } from 'lucide-react'

export default function DpStagePage() {
  const navigate = useNavigate()

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const loaQuery = useQuery({
    queryKey: ['my-loa'],
    queryFn: async () => {
      const res = await apiFetch<any>('/ppdb/applicants/me/loa').catch(() => null)
      return res?.letter_number ? res : (res?.loa || null)
    },
  })

  const applicant = transactionQuery.data?.applicant
  const loa = loaQuery.data
  const isLoading = transactionQuery.isLoading || loaQuery.isLoading

  const isPassed = applicant?.status === 'passed'
  const isLoaSigned = Boolean(loa?.is_loa_signed || applicant?.is_loa_signed)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Pembayaran DP & Sertifikat"
          description="Pembayaran Uang Muka (DP) penerimaan santri dan penerbitan Sertifikat SKD resmi beserta grup komunikasi sekolah."
          docKey="applicant-dp"
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
                Tahap Pembayaran Uang Muka (DP) dan penerbitan Sertifikat SKD hanya dapat diakses setelah pendaftar dinyatakan lulus dalam tahap evaluasi seleksi PPDB.
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
        ) : !isLoaSigned ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm border border-amber-200 text-center space-y-4 bg-amber-50/30">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-amber-950 font-heading">Dokumen LoA Belum Ditandatangani</h3>
              <p className="text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">
                Sebelum melakukan pembayaran Uang Muka (DP), Anda diwajibkan untuk menelaah dan membubuhkan tanda tangan digital orang tua/wali pada dokumen Letter of Acceptance (LoA) terlebih dahulu.
              </p>
            </div>
            <Button
              onClick={() => navigate('/applicant/pengumuman')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-5 gap-2"
            >
              <span>Buka & Tanda Tangani Dokumen LoA</span>
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <DpCertificateStep
              applicant={applicant}
              loa={loa}
            />
          </div>
        )}
      </main>
    </div>
  )
}
