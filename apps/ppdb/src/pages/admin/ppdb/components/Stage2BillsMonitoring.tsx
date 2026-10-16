import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'
import {
  CreditCard,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  Wallet,
  DollarSign,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import PaginationControls from '@/components/shared/PaginationControls'

const formatRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

interface MonitoringApplicantItem {
  applicant_id: string
  user_id: string
  full_name: string
  registration_number: string
  phone: string
  wave_id: string
  wave_name: string
  is_loa_signed: boolean
  dp_status: 'paid' | 'pending'
  dp_paid_at: string | null
  total_obligation: number
  total_paid: number
  remaining_balance: number
  installments_count: number
  is_lunas: boolean
  overall_status: 'lunas' | 'belum_lunas' | 'belum_dp'
}

interface MonitoringSummary {
  total_applicants: number
  lunas_count: number
  belum_lunas_count: number
  belum_dp_count: number
  total_obligation_sum: number
  total_paid_sum: number
  total_remaining_sum: number
}

interface MonitoringResponse {
  data: MonitoringApplicantItem[]
  total: number
  page: number
  per_page: number
  summary: MonitoringSummary
}

export default function Stage2BillsMonitoring() {
  const navigate = useNavigate()

  const [waveFilter, setWaveFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch Waves for wave selector
  const { data: waves = [] } = useQuery({
    queryKey: ['waves-list'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/waves')
      return res || []
    },
  })

  // Periode aktif — hanya memuat gelombang dalam periode tersebut.
  const { data: periods = [] } = useQuery({
    queryKey: ['periods-all'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/periods/all')
      return res || []
    },
  })
  const activePeriod = periods.find((p) => p.status === 'active') || null
  const periodWaves = activePeriod
    ? waves.filter((w: any) => w.period_id === activePeriod.id)
    : []

  // Fetch Stage 2 Monitoring data
  const { data, isLoading, isFetching, refetch } = useQuery<MonitoringResponse>({
    queryKey: ['stage2-monitoring', waveFilter, statusFilter, searchQuery, page],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (waveFilter) qs.append('wave_id', waveFilter)
      if (statusFilter && statusFilter !== 'all') qs.append('status', statusFilter)
      if (searchQuery.trim()) qs.append('search', searchQuery.trim())
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      return await apiFetch<MonitoringResponse>(`/payment/stage2/monitoring?${qs.toString()}`)
    },
  })

  const items = data?.data || []
  const total = data?.total || 0
  const summary = data?.summary || {
    total_applicants: 0,
    lunas_count: 0,
    belum_lunas_count: 0,
    belum_dp_count: 0,
    total_obligation_sum: 0,
    total_paid_sum: 0,
    total_remaining_sum: 0,
  }
  const totalPages = Math.ceil(total / limit) || 1

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* ─── Penjelasan Otomasi & Sinkronisasi ─── */}
      <div className="p-4 bg-muted/40 border rounded-2xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm">
            Tracking Progres Pembayaran Tahap 2 Santri (Pakasir v2)
          </p>
          <p>
            Pantau progres penyelesaian biaya LoA, pembayaran DP, dan riwayat cicilan seluruh calon santri. Klik pada baris santri untuk melihat rincian detail pembayaran dan riwayat transaksi lengkap.
          </p>
        </div>
      </div>

      {/* ─── Ringkasan Metrik Finansial ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Kewajiban */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Tagihan LoA</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatRp(summary.total_obligation_sum)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> {summary.total_applicants} santri lulus
            </div>
          </CardContent>
        </Card>

        {/* Total Terkumpul */}
        <Card className="rounded-2xl border-emerald-200/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Dana Terkumpul</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {formatRp(summary.total_paid_sum)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {summary.lunas_count} santri lunas penuh
            </div>
          </CardContent>
        </Card>

        {/* Sisa Piutang */}
        <Card className="rounded-2xl border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
              <span>Sisa Piutang</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
              {formatRp(summary.total_remaining_sum)}
            </div>
            <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> {summary.belum_lunas_count} sedang mencicil
            </div>
          </CardContent>
        </Card>

        {/* Belum Bayar DP */}
        <Card className="rounded-2xl border-rose-200/80 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
              <span>Belum Bayar DP</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">
              {summary.belum_dp_count} <span className="text-sm font-normal text-rose-500">santri</span>
            </div>
            <div className="text-[11px] text-rose-500 flex items-center gap-1">
              Menunggu pembayaran uang muka
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter & Toolbar ─── */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Gelombang Dropdown & Search Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="w-full sm:w-56 shrink-0">
              <select
                value={waveFilter}
                onChange={(e) => {
                  setWaveFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 h-9"
              >
                <option value="">Semua Gelombang (Periode Aktif)</option>
                {periodWaves.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.status === 'active' ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari nama santri, no. registrasi, no. HP..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 h-9"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9 px-3 text-xs rounded-xl">
                Cari
              </Button>
              {searchQuery && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchInput('')
                    setSearchQuery('')
                    setPage(1)
                  }}
                >
                  Reset
                </Button>
              )}
            </form>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs rounded-xl gap-1.5 self-end md:self-auto shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">Filter Status:</span>
          </div>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3 rounded-full"
            onClick={() => { setStatusFilter('all'); setPage(1) }}
          >
            Semua ({summary.total_applicants})
          </Button>
          <Button
            variant={statusFilter === 'lunas' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3 rounded-full border-emerald-300 text-emerald-800 dark:text-emerald-200"
            onClick={() => { setStatusFilter('lunas'); setPage(1) }}
          >
            Lunas ({summary.lunas_count})
          </Button>
          <Button
            variant={statusFilter === 'belum_lunas' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3 rounded-full border-amber-300 text-amber-800 dark:text-amber-200"
            onClick={() => { setStatusFilter('belum_lunas'); setPage(1) }}
          >
            Belum Lunas ({summary.belum_lunas_count})
          </Button>
          <Button
            variant={statusFilter === 'belum_dp' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-3 rounded-full border-rose-300 text-rose-800 dark:text-rose-200"
            onClick={() => { setStatusFilter('belum_dp'); setPage(1) }}
          >
            Belum DP ({summary.belum_dp_count})
          </Button>
        </div>
      </div>

      {/* ─── Tabel Tracking Progres Santri (Tanpa Horizontal Scroll Desktop) ─── */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardContent className="p-0">
          <Table className="w-full min-w-[560px] md:min-w-0">
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="font-semibold text-xs py-3.5">Santri</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Progres Pembayaran</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Sisa Tagihan</TableHead>
                <TableHead className="font-semibold text-xs py-3.5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={4} rows={5} />
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12">
                    <EmptyState
                      icon={CreditCard}
                      title="Tidak Ada Data Santri"
                      description="Tidak ada data pembayaran yang sesuai dengan kriteria filter yang dipilih."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const pct =
                    item.total_obligation > 0
                      ? Math.min(
                          100,
                          Math.round((item.total_paid / item.total_obligation) * 100)
                        )
                      : 0

                  return (
                    <TableRow
                      key={item.applicant_id}
                      onClick={() => navigate(`/admin/pembayaran-tahap2/${item.applicant_id}`)}
                      title="Klik untuk melihat detail pembayaran"
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      {/* Santri: Nama & No. Registrasi / Gelombang */}
                      <TableCell className="py-3.5">
                        <div className="font-semibold text-sm text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {item.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded font-medium text-foreground">
                            {item.registration_number}
                          </span>
                          <span>•</span>
                          <span>{item.wave_name}</span>
                          {item.phone && (
                            <>
                              <span>•</span>
                              <span>{item.phone}</span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      {/* Progres Pembayaran */}
                      <TableCell className="py-3.5">
                        <div className="space-y-1.5 min-w-[160px] max-w-[280px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                              {formatRp(item.total_paid)}
                            </span>
                            <span className="text-muted-foreground text-[11px] font-medium">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct >= 100
                                  ? 'bg-emerald-500'
                                  : pct > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total LoA: {formatRp(item.total_obligation)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Sisa Tagihan */}
                      <TableCell className="py-3.5">
                        {item.remaining_balance === 0 ? (
                          <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                            Lunas
                          </span>
                        ) : (
                          <span className="font-semibold text-xs text-amber-600 dark:text-amber-400">
                            {formatRp(item.remaining_balance)}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5">
                        {item.overall_status === 'lunas' ? (
                          <Badge className="text-[10px] gap-1 py-0.5 bg-emerald-600 text-white hover:bg-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> LUNAS
                          </Badge>
                        ) : item.overall_status === 'belum_lunas' ? (
                          <Badge className="text-[10px] gap-1 py-0.5 bg-amber-500 text-white hover:bg-amber-600">
                            <Clock className="h-3 w-3" /> MENCICIL {item.installments_count > 0 ? `(${item.installments_count}x)` : ''}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] gap-1 py-0.5 bg-slate-500 text-white hover:bg-slate-600">
                            <AlertCircle className="h-3 w-3" /> BELUM DP
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
