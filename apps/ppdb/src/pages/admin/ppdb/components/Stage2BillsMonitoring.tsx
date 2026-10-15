import { useState } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Receipt,
  Search,
  Users,
  Wallet,
  DollarSign,
  Printer,
  ChevronRight,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import PaginationControls from '@/components/shared/PaginationControls'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'

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

interface ApplicantTransactionItem {
  id: string
  order_id: string
  txn_id?: string
  payment_type: 'form' | 'dp' | 'installment'
  installment_number?: number | null
  amount: number
  status: 'pending' | 'paid' | 'settlement' | 'success' | 'expired' | 'canceled' | 'failed'
  provider_status?: string | null
  method: string
  created_at: string
  paid_at?: string | null
  receipt_number?: string | null
  receipt_token?: string | null
  receipt_url?: string | null
}

interface ApplicantTransactionsResponse {
  applicant_id: string
  financials: {
    total_obligation: number
    total_paid: number
    remaining_balance: number
    dp_paid: boolean
    dp_paid_at: string | null
    successful_installments_count: number
    is_lunas: boolean
  }
  transactions: ApplicantTransactionItem[]
}

export default function Stage2BillsMonitoring() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [waveFilter, setWaveFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  // State for modals
  const [selectedApplicant, setSelectedApplicant] = useState<MonitoringApplicantItem | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [syncingTxId, setSyncingTxId] = useState<string | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  // Fetch Waves for wave selector
  const { data: waves = [] } = useQuery({
    queryKey: ['waves-list'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/waves')
      return res || []
    },
  })

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

  // Fetch applicant transactions when history modal is opened
  const {
    data: applicantData,
    isLoading: loadingApplicantData,
    refetch: refetchApplicantTx,
  } = useQuery<ApplicantTransactionsResponse>({
    queryKey: ['applicant-transactions', selectedApplicant?.applicant_id],
    queryFn: async () => {
      if (!selectedApplicant?.applicant_id) throw new Error('No applicant selected')
      return await apiFetch<ApplicantTransactionsResponse>(
        `/payment/applicants/${selectedApplicant.applicant_id}/transactions`
      )
    },
    enabled: !!selectedApplicant?.applicant_id && historyModalOpen,
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

  const handleSyncStatus = async (txId: string) => {
    try {
      setSyncingTxId(txId)
      const res = await apiFetch<{ status: string; message?: string }>(
        `/payment/transactions/${txId}/sync-status`,
        { method: 'POST' }
      )
      toast('success', `Status berhasil diperbarui: ${res.status.toUpperCase()}`)
      await Promise.all([
        refetchApplicantTx(),
        queryClient.invalidateQueries({ queryKey: ['stage2-monitoring'] }),
      ])
    } catch (err: any) {
      toast('error', err.message || 'Gagal menyinkronkan status dengan payment gateway')
    } finally {
      setSyncingTxId(null)
    }
  }

  const handleViewReceipt = async (txId: string) => {
    try {
      setLoadingReceipt(true)
      const res = await apiFetch<ReceiptData>(`/payment/receipt/${txId}`)
      setSelectedReceipt(res)
      setReceiptModalOpen(true)
    } catch (err: any) {
      toast('error', err.message || 'Kuitansi belum tersedia atau gagal dimuat')
    } finally {
      setLoadingReceipt(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Penjelasan Otomasi & Sinkronisasi ─── */}
      <div className="p-4 bg-muted/40 border rounded-2xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm">
            Monitoring Finansial & Pembayaran Otomatis PPDB (Pakasir v2)
          </p>
          <p>
            Sistem memantau seluruh kewajiban LoA santri yang dinyatakan lulus, setoran DP (Uang Muka),
            serta riwayat cicilan Tahap 2 secara real-time. Status pembayaran terverifikasi otomatis via webhook QRIS Pakasir.
            Nomor kuitansi resmi diterbitkan secara permanen dan immutable.
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
                <option value="">Semua Gelombang</option>
                {waves.map((w: any) => (
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

      {/* ─── Tabel Monitoring Santri ─── */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardContent className="p-0">
          <Table className="min-w-[850px]">
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="whitespace-nowrap font-semibold">Nama Santri & Kontak</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">No. Registrasi</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Gelombang</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Status DP</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Total Tagihan LoA</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Terbayar</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Sisa Tagihan</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Cicilan</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Status Akhir</TableHead>
                <TableHead className="text-right whitespace-nowrap font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={10} rows={5} />
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12">
                    <EmptyState
                      icon={CreditCard}
                      title="Tidak Ada Data Santri"
                      description="Tidak ada data pembayaran yang sesuai dengan kriteria filter yang dipilih."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.applicant_id} className="hover:bg-muted/30">
                    {/* Nama & Kontak */}
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">{item.full_name}</div>
                      <div className="text-xs text-muted-foreground">{item.phone || '-'}</div>
                    </TableCell>

                    {/* No Registrasi */}
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
                        {item.registration_number}
                      </span>
                    </TableCell>

                    {/* Gelombang */}
                    <TableCell>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.wave_name}
                      </span>
                    </TableCell>

                    {/* Status DP */}
                    <TableCell>
                      {item.dp_status === 'paid' ? (
                        <Badge variant="success" className="text-[10px] gap-1 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> DP Terverifikasi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0.5 text-muted-foreground">
                          <Clock className="h-3 w-3" /> Belum DP
                        </Badge>
                      )}
                    </TableCell>

                    {/* Total Tagihan LoA */}
                    <TableCell>
                      <span className="font-medium text-xs text-foreground">
                        {formatRp(item.total_obligation)}
                      </span>
                    </TableCell>

                    {/* Terbayar */}
                    <TableCell>
                      <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatRp(item.total_paid)}
                      </span>
                    </TableCell>

                    {/* Sisa Tagihan */}
                    <TableCell>
                      <span className={`font-semibold text-xs ${item.remaining_balance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatRp(item.remaining_balance)}
                      </span>
                    </TableCell>

                    {/* Cicilan Count */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {item.installments_count > 0 ? `${item.installments_count}x cicilan` : '—'}
                      </span>
                    </TableCell>

                    {/* Status Akhir */}
                    <TableCell>
                      {item.overall_status === 'lunas' ? (
                        <Badge className="text-[10px] gap-1 py-0.5 bg-emerald-600 text-white hover:bg-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> LUNAS
                        </Badge>
                      ) : item.overall_status === 'belum_lunas' ? (
                        <Badge className="text-[10px] gap-1 py-0.5 bg-amber-500 text-white hover:bg-amber-600">
                          <Clock className="h-3 w-3" /> BELUM LUNAS
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] gap-1 py-0.5 bg-slate-500 text-white hover:bg-slate-600">
                          <AlertCircle className="h-3 w-3" /> BELUM DP
                        </Badge>
                      )}
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-xl px-3 gap-1 hover:border-emerald-500 hover:text-emerald-700"
                        onClick={() => {
                          setSelectedApplicant(item)
                          setHistoryModalOpen(true)
                        }}
                      >
                        Detail Transaksi <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* ─── Modal Detail Riwayat Transaksi Santri ─── */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Detail Pembayaran: {selectedApplicant?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              No. Registrasi: <span className="font-mono font-semibold text-foreground">{selectedApplicant?.registration_number}</span> • Gelombang: {selectedApplicant?.wave_name}
            </DialogDescription>
          </DialogHeader>

          {/* Snapshot Finansial Santri */}
          {selectedApplicant && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-2xl border border-border/60">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Total Tagihan LoA</span>
                <p className="font-bold text-sm text-foreground">
                  {formatRp(applicantData?.financials.total_obligation ?? selectedApplicant.total_obligation)}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Total Terbayar</span>
                <p className="font-bold text-sm text-emerald-600">
                  {formatRp(applicantData?.financials.total_paid ?? selectedApplicant.total_paid)}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Sisa Tagihan</span>
                <p className="font-bold text-sm text-amber-600">
                  {formatRp(applicantData?.financials.remaining_balance ?? selectedApplicant.remaining_balance)}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Status Pembayaran</span>
                <div>
                  {(applicantData?.financials.is_lunas ?? selectedApplicant.is_lunas) ? (
                    <Badge className="text-[10px] bg-emerald-600 text-white py-0.5">LUNAS</Badge>
                  ) : (applicantData?.financials.dp_paid ?? selectedApplicant.dp_status === 'paid') ? (
                    <Badge className="text-[10px] bg-amber-500 text-white py-0.5">Mencicil Tahap 2</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-slate-500 text-white py-0.5">Belum Bayar DP</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Daftar Transaksi */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Riwayat Transaksi Pembayaran</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => refetchApplicantTx()}
                disabled={loadingApplicantData}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loadingApplicantData ? 'animate-spin' : ''}`} />
                Segarkan
              </Button>
            </h4>

            <div className="border rounded-2xl overflow-hidden">
              <Table className="min-w-[600px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Waktu / Order ID</TableHead>
                    <TableHead className="text-xs font-semibold">Jenis Pembayaran</TableHead>
                    <TableHead className="text-xs font-semibold">Nominal</TableHead>
                    <TableHead className="text-xs font-semibold">Status Transaksi</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingApplicantData ? (
                    <TableSkeletonRows cols={5} rows={3} />
                  ) : !applicantData?.transactions || applicantData.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada riwayat transaksi pembayaran.
                      </TableCell>
                    </TableRow>
                  ) : (
                    applicantData.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground">
                            {new Date(tx.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {tx.order_id} {tx.txn_id ? `• Txn: ${tx.txn_id}` : ''}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-medium">
                            {tx.payment_type === 'dp'
                              ? 'Uang Muka (DP)'
                              : tx.payment_type === 'installment'
                              ? `Cicilan ke-${tx.installment_number || 1}`
                              : 'Formulir Pendaftaran'}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-bold text-foreground">
                            {formatRp(tx.amount)}
                          </span>
                        </TableCell>

                        <TableCell>
                          {tx.status === 'paid' || tx.status === 'settlement' || tx.status === 'success' ? (
                            <Badge variant="success" className="text-[10px] py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 mr-1" /> Sukses
                            </Badge>
                          ) : tx.status === 'pending' ? (
                            <Badge variant="warning" className="text-[10px] py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                              <Clock className="h-3 w-3 text-amber-600 mr-1" /> Pending
                            </Badge>
                          ) : tx.status === 'expired' ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 text-muted-foreground">
                              Kedaluwarsa
                            </Badge>
                          ) : tx.status === 'canceled' ? (
                            <Badge variant="outline" className="text-[10px] py-0.5 text-rose-600 border-rose-300">
                              Dibatalkan
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] py-0.5">
                              {tx.status}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If pending, admin can sync with Pakasir gateway */}
                            {tx.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 rounded-lg gap-1 text-slate-700 hover:text-emerald-700"
                                onClick={() => handleSyncStatus(tx.id)}
                                disabled={syncingTxId === tx.id}
                              >
                                <RefreshCw className={`h-3 w-3 ${syncingTxId === tx.id ? 'animate-spin' : ''}`} />
                                Cek Status
                              </Button>
                            )}

                            {/* If paid/success, show official receipt */}
                            {(tx.status === 'paid' || tx.status === 'settlement' || tx.status === 'success') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-2 rounded-lg gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleViewReceipt(tx.id)}
                                disabled={loadingReceipt}
                              >
                                <Receipt className="h-3 w-3 text-emerald-600" />
                                Kuitansi
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Kuitansi Resmi ─── */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Kuitansi Resmi Pembayaran
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl px-3 gap-1.5 print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                Cetak / Simpan PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt && (
            <div className="py-2">
              <OfficialReceiptCard receipt={selectedReceipt} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
