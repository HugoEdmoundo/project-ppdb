import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FileText, CreditCard, Activity, CalendarDays, CheckCircle2,
  AlertTriangle, ArrowRight, XCircle, Hourglass, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { Card } from "@/components/ui"
import { Button } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'
import { useToast } from '../../components/Toast'
import { apiFetch } from '@/api/client'
import RegistrationTrend, { type TrendPoint } from '@/components/shared/RegistrationTrend'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import { cn } from '@/lib/utils'

interface DashboardStats {
  active_wave: { id: string; name: string } | null
  active_period_name: string | null
  applicants: {
    total: number
    document_uploaded: number
    document_uploaded_pending: number
    document_rejected: number
    selection: number
    passed: number
    failed: number
    expired: number
  }
  payments: {
    pending: number
    success: number
    failed: number
    expired: number
    cancelled: number
    by_method: Record<string, Record<string, number>>
  }
  trend: TrendPoint[]
}

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  chip: string
  iconText: string
  to?: string
  actionable?: boolean
}

function StatCard({ label, value, icon: Icon, chip, iconText, to, actionable }: StatCardProps) {
  const card = (
    <Card className="group relative h-full overflow-hidden rounded-2xl border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.08]', chip)} />
      <div className="mb-4 flex items-start justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110', chip)}>
          <Icon className={cn('h-5 w-5', iconText)} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
        {actionable && typeof value === 'number' && value > 0 && (
          <span className="flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Perlu Proses
          </span>
        )}
      </div>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {card}
      </Link>
    )
  }
  return card
}

interface AttentionItem {
  label: string
  value: number
  icon: LucideIcon
  tone: 'amber' | 'red' | 'blue'
  href: string
}

const TONE = {
  amber: { chip: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-500' },
  red: { chip: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-500' },
  blue: { chip: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-500' },
} as const

export default function AdminDashboardPage() {
  const { toast } = useToast()

  const { data, isLoading: loading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch<DashboardStats>('/ppdb/dashboard/stats'),
  })
  useEffect(() => {
    if (isError) {
      toast('error', 'Gagal memuat data dashboard')
    }
  }, [isError, toast])

  const activeWaveName = data?.active_wave ? data.active_wave.name : null
  const activePeriodName = data?.active_period_name || null
  const hasWave = !!activeWaveName

  const statCards: StatCardProps[] = [
    {
      label: 'Total Pendaftar',
      value: data?.applicants.total ?? '—',
      icon: Users,
      chip: 'bg-blue-500',
      iconText: 'text-white',
      to: '/admin/data-pendaftar',
    },
    {
      label: 'Dokumen Menunggu',
      value: data?.applicants.document_uploaded ?? '—',
      icon: FileText,
      chip: 'bg-amber-500',
      iconText: 'text-white',
      to: '/admin/applicants?status=document_uploaded',
      actionable: true,
    },
    {
      label: 'Pembayaran Menunggu',
      value: data?.payments.pending ?? '—',
      icon: CreditCard,
      chip: 'bg-indigo-500',
      iconText: 'text-white',
      to: '/admin/payments?tab=pending',
      actionable: true,
    },
    {
      label: 'Status Sistem',
      value: hasWave ? 'Aktif' : 'Standby',
      icon: Activity,
      chip: hasWave ? 'bg-emerald-500' : 'bg-slate-400',
      iconText: 'text-white',
      to: '/admin/periods',
    },
  ]

  const attentionItems: AttentionItem[] = [
    { label: 'Pembayaran menunggu verifikasi', value: data?.payments.pending ?? 0, icon: CreditCard, tone: 'amber', href: '/admin/payments?tab=pending' },
    { label: 'Dokumen perlu review', value: data?.applicants.document_uploaded_pending ?? 0, icon: FileText, tone: 'blue', href: '/admin/applicants?status=document_uploaded' },
    { label: 'Dokumen ditolak', value: data?.applicants.document_rejected ?? 0, icon: XCircle, tone: 'red', href: '/admin/applicants?status=document_rejected' },
    { label: 'Pendaftar expired', value: data?.applicants.expired ?? 0, icon: AlertTriangle, tone: 'red', href: '/admin/data-pendaftar?status=expired' },
  ]
  const hasAttention = attentionItems.some((item) => item.value > 0)

  const selectionRows = [
    { label: 'Menunggu Seleksi', value: data?.applicants.selection ?? 0, icon: Hourglass, bar: 'bg-blue-500' },
    { label: 'Lulus', value: data?.applicants.passed ?? 0, icon: ShieldCheck, bar: 'bg-emerald-500' },
    { label: 'Tidak Lulus', value: data?.applicants.failed ?? 0, icon: XCircle, bar: 'bg-red-500' },
  ]
  const selectionTotal = (data?.applicants.selection || 0) + (data?.applicants.passed || 0) + (data?.applicants.failed || 0)

  return (
    <div className="space-y-8 pb-8">
      <PageHeaderCard
        title="Dashboard Admin"
        description="Ringkasan operasional PPDB pada gelombang yang aktif."
        loading={loading}
        action={
          !loading ? (
            <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
              <Link to="/admin/periods" className="gap-1.5">
                Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : undefined
        }
        blocks={[
          { icon: CalendarDays, label: 'Periode Aktif', value: activePeriodName || 'Tidak ada', active: hasWave },
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveName || 'Tidak ada', active: hasWave, pulse: hasWave },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="rounded-2xl border-slate-100 p-6 shadow-sm">
              <Skeleton className="mb-4 h-5 w-24" />
              <Skeleton className="h-10 w-16" />
            </Card>
          ))
        ) : (
          statCards.map((card) => <StatCard key={card.label} {...card} />)
        )}
      </div>

      {/* Main Grid: Trend + Right panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegistrationTrend data={data?.trend} loading={loading} />
        </div>

        {/* Perlu Perhatian */}
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <AlertTriangle className={cn('h-5 w-5', hasAttention ? 'text-amber-500' : 'text-slate-300')} />
              Perlu Perhatian
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">Item yang membutuhkan tindakan admin</p>
          </div>
          <div className="flex-1 p-2">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              attentionItems.map((item) => {
                const tone = TONE[item.tone]
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone.chip)}>
                      <Icon className={cn('h-4 w-4', tone.text)} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-600 group-hover:text-slate-900">{item.label}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold text-white', item.value > 0 ? tone.badge : 'bg-slate-200')}>
                      {item.value}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary" />
                  </Link>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* Status Seleksi */}
      {!loading && selectionTotal > 0 && (
        <Card className="rounded-2xl border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <Hourglass className="h-5 w-5 text-primary" />
              Status Seleksi
            </h2>
            <Link to="/admin/selection" className="flex items-center text-xs font-semibold text-primary transition-colors hover:text-primary/80">
              Buka Seleksi <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {selectionRows.map((row) => {
              const Icon = row.icon
              const pct = Math.round(((row.value || 0) / selectionTotal) * 100)
              return (
                <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Icon className={cn('h-4 w-4', row.bar)} />
                      {row.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{row.value}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full transition-all', row.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Empty State / No Active Wave */}
      {!loading && !hasWave && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Activity className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-amber-900">Sistem PPDB Sedang Standby</h3>
          <p className="mx-auto mb-6 max-w-md text-amber-700">
            Saat ini tidak ada Gelombang yang berstatus aktif. Pendaftaran baru dari publik ditutup. Silakan aktifkan
            gelombang pada menu pengaturan PPDB.
          </p>
          <Button asChild variant="outline" className="gap-1.5 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 hover:text-amber-900">
            <Link to="/admin/periods">
              Aktifkan Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
