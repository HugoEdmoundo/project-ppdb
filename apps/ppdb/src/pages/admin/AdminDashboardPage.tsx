import { useEffect } from 'react'
import { Users, FileText, CreditCard, Activity, CalendarDays, CheckCircle2 } from 'lucide-react'
import { applicantService, paymentService, ppdbService } from '../../services/index'
import { useToast } from '../../components/Toast'
import { Card } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'

export default function AdminDashboardPage() {
  const { toast } = useToast()

  const { data: applicantsRes, isLoading: loadingApplicants, isError: errorApplicants } = useQuery({
    queryKey: ['applicants', 'dashboard'],
    queryFn: () => applicantService.getApplicants({ perPage: 1000 }),
    // TODO: Backend should provide a /stats endpoint to avoid fetching 1000 rows
  })

  const { data: paymentsRes, isLoading: loadingPayments, isError: errorPayments } = useQuery({
    queryKey: ['payments', 'dashboard', 'pending'],
    queryFn: () => paymentService.getTransactions({ status: 'pending', perPage: 1000 }),
  })

  const { data: periodsRes, isLoading: loadingPeriods, isError: errorPeriods } = useQuery({
    queryKey: ['periods', 'all'],
    queryFn: () => ppdbService.getAllPeriods(),
  })

  const loading = loadingApplicants || loadingPayments || loadingPeriods
  const isError = errorApplicants || errorPayments || errorPeriods

  useEffect(() => {
    if (isError) {
      toast('error', 'Gagal memuat data dashboard')
    }
  }, [isError, toast])

  const activePeriod = Array.isArray(periodsRes) ? periodsRes.find((p: any) => p.status === 'active') : null
  const activeWaveId = applicantsRes?.active_wave || null

  const applicantsList = applicantsRes?.data || []
  const totalApplicants = applicantsList.length
  const pendingDocuments = applicantsList.filter((a: any) => a.status === 'document_uploaded_pending').length

  const paymentsList = paymentsRes?.data || []
  const pendingPayments = paymentsList.length

  const stats = {
    total_applicants: totalApplicants,
    pending_documents: pendingDocuments,
    pending_payments: pendingPayments,
    active_wave_name: activeWaveId ? 'Aktif' : null,
    active_period_name: activePeriod?.name || null,
  }

  const statCards = [
    { label: 'Total Pendaftar', value: stats.total_applicants ?? '—', icon: Users, color: 'bg-blue-500' },
    { label: 'Dokumen Menunggu', value: stats.pending_documents ?? '—', icon: FileText, color: 'bg-amber-500' },
    { label: 'Pembayaran Menunggu', value: stats.pending_payments ?? '—', icon: CreditCard, color: 'bg-indigo-500' },
    { label: 'Status Sistem', value: stats.active_wave_name ? 'Aktif' : 'Standby', icon: Activity, color: stats.active_wave_name ? 'bg-emerald-500' : 'bg-slate-400' },
  ]

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Ringkasan operasional PPDB saat ini.</p>
        </div>
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Periode:</span>
              <span className="text-sm font-bold text-slate-900">{stats.active_period_name || 'Tidak ada'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Gelombang:</span>
              <span className="text-sm font-bold text-slate-900">{activeWaveId ? 'Aktif' : 'Tidak ada'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-6 border-slate-100 shadow-sm rounded-2xl">
              <Skeleton className="mb-4 h-5 w-24" />
              <Skeleton className="h-10 w-16" />
            </Card>
          ))
        ) : (
          statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className="p-6 border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-semibold text-slate-500">{card.label}</span>
                  <div className={`p-2.5 rounded-xl ${card.color.replace('500', '100')} bg-opacity-100`}>
                    <Icon className={`h-5 w-5 ${card.color.replace('bg-', 'text-').replace('500', '600')}`} />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-slate-900">{card.value}</h3>
                  {typeof card.value === 'number' && card.value > 0 && (
                     <span className="text-xs font-medium text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded-full">
                       <CheckCircle2 className="w-3 h-3 mr-1" /> Perlu Proses
                     </span>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Empty State / Notice */}
      {!loading && !stats.active_wave_name && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-4">
            <Activity className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-amber-900 mb-2">Sistem PPDB Sedang Standby</h3>
          <p className="text-amber-700 max-w-md mx-auto">
            Saat ini tidak ada Gelombang yang berstatus aktif. Pendaftaran baru dari publik akan ditutup. Silakan masuk ke menu Pengaturan PPDB untuk mengaktifkan gelombang.
          </p>
        </div>
      )}
    </div>
  )
}
