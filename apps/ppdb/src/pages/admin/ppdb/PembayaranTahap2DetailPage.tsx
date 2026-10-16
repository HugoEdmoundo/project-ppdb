import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  EmptyState,
} from '@/components/ui'
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Receipt,
  DollarSign,
  Wallet,
  Phone,
  Mail,
  FileCheck2,
  User,
} from 'lucide-react'
import { apiFetch } from '@/api/client'

const formatRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

interface TransactionItem {
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

interface ApplicantDetailResponse {
  applicant_id: string
  applicant?: {
    id: string
    full_name: string
    registration_number: string
    phone: string
    email?: string | null
    wave_id?: string | null
    wave_name?: string | null
    is_loa_signed?: boolean
    loa_signed_at?: string | null
    dp_status?: 'paid' | 'pending'
    dp_paid_at?: string | null
    status?: string
  }
  financials: {
    total_obligation: number
    total_paid: number
    remaining_balance: number
    dp_paid: boolean
    dp_paid_at: string | null
    successful_installments_count: number
    is_lunas: boolean
  }
  transactions: TransactionItem[]
}

export default function PembayaranTahap2DetailPage() {
  const { applicantId } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useQuery<ApplicantDetailResponse>({
    queryKey: ['applicant-transactions-detail', applicantId],
    queryFn: async () => {
      if (!applicantId) throw new Error('ID Pendaftar tidak valid')
      return await apiFetch<ApplicantDetailResponse>(
        `/payment/applicants/${applicantId}/transactions`
      )
    },
    enabled: !!applicantId,
  })

  const applicant = data?.applicant
  const financials = data?.financials || {
    total_obligation: 0,
    total_paid: 0,
    remaining_balance: 0,
    dp_paid: false,
    dp_paid_at: null,
    successful_installments_count: 0,
    is_lunas: false,
  }
  const transactions = data?.transactions || []

  const progressPercent =
    financials.total_obligation > 0
      ? Math.min(
          100,
          Math.round((financials.total_paid / financials.total_obligation) * 100)
        )
      : 0

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-card rounded-2xl border animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card rounded-2xl border animate-pulse" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/admin/pembayaran-tahap2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Pembayaran Tahap 2
          </Link>
        </Button>
        <Card className="rounded-2xl border-rose-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-foreground">Data Tidak Ditemukan</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {(error as any)?.message || 'Gagal memuat rincian pembayaran untuk santri ini.'}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Coba Lagi
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Breadcrumb & Tombol Kembali ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground w-fit -ml-2"
        >
          <Link to="/admin/pembayaran-tahap2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Monitoring Pembayaran Tahap 2
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 px-3 text-xs rounded-xl gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* ─── Header Profil Santri ─── */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {applicant?.full_name || 'Santri'}
                </h1>
                {financials.is_lunas ? (
                  <Badge className="bg-emerald-600 text-white gap-1 py-0.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Lunas Penuh
                  </Badge>
                ) : financials.dp_paid ? (
                  <Badge className="bg-amber-500 text-white gap-1 py-0.5 text-xs">
                    <Clock className="w-3.5 h-3.5" /> Mencicil ({financials.successful_installments_count}x)
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500 text-white gap-1 py-0.5 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> Belum Bayar DP
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                  {applicant?.registration_number || '-'}
                </span>
                <span>•</span>
                <span className="font-medium text-foreground">{applicant?.wave_name || 'Gelombang'}</span>
                {applicant?.phone && (
                  <>
                    <span>•</span>
                    <a
                      href={`https://wa.me/${applicant.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {applicant.phone}
                    </a>
                  </>
                )}
                {applicant?.email && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {applicant.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status LoA & DP pill */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>LoA Resmi:</span>
              <span className="font-medium text-foreground">
                {applicant?.is_loa_signed ? 'Sudah Ditandatangani' : 'Menunggu Tanda Tangan'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status Uang Muka:</span>
              <span className="font-medium text-foreground">
                {financials.dp_paid ? 'DP Terverifikasi' : 'Belum Bayar DP'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Section */}
        <div className="px-5 py-3.5 bg-muted/30 border-t border-border/60">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span className="text-muted-foreground">Progres Pembayaran Tahap 2</span>
            <span className="font-bold text-foreground">
              {progressPercent}% Terbayar ({formatRp(financials.total_paid)} dari {formatRp(financials.total_obligation)})
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent > 0
                  ? 'bg-amber-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* ─── Metric Cards Finansial ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tagihan LoA */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Tagihan LoA</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatRp(financials.total_obligation)}
            </div>
            <p className="text-[11px] text-slate-400">
              Kewajiban biaya pendidikan
            </p>
          </CardContent>
        </Card>

        {/* Total Terbayar */}
        <Card className="rounded-2xl border-emerald-200/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Total Terbayar</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {formatRp(financials.total_paid)}
            </div>
            <p className="text-[11px] text-emerald-600">
              DP & cicilan yang berhasil
            </p>
          </CardContent>
        </Card>

        {/* Sisa Tagihan */}
        <Card className="rounded-2xl border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
              <span>Sisa Tagihan</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-bold tracking-tight ${financials.remaining_balance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {financials.remaining_balance === 0 ? 'Lunas' : formatRp(financials.remaining_balance)}
            </div>
            <p className="text-[11px] text-amber-600">
              {financials.remaining_balance === 0 ? 'Tidak ada sisa kewajiban' : 'Menunggu pelunasan cicilan'}
            </p>
          </CardContent>
        </Card>

        {/* Status DP */}
        <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Status Uang Muka</span>
              <CreditCard className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              {financials.dp_paid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">Terverifikasi</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="text-rose-600">Belum DP</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {financials.dp_paid_at
                ? `Lunas pada ${new Date(financials.dp_paid_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : 'Uang muka belum dibayar'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Riwayat Transaksi Pembayaran ─── */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden bg-card">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Riwayat Transaksi Pembayaran
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Semua invoice formulir, DP, dan cicilan Tahap 2 yang diterbitkan untuk calon santri ini.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {transactions.length} Transaksi
          </Badge>
        </div>

        <CardContent className="p-0">
          <Table className="w-full min-w-[620px] md:min-w-0">
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="font-semibold text-xs whitespace-nowrap">Waktu & Order ID</TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">Jenis Pembayaran</TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">Nominal</TableHead>
                <TableHead className="font-semibold text-xs whitespace-nowrap">Status Transaksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12">
                    <EmptyState
                      icon={CreditCard}
                      title="Belum Ada Transaksi"
                      description="Belum ada riwayat transaksi pembayaran yang tercatat untuk calon santri ini."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => navigate(`/admin/kuitansi/${tx.id}`)}
                    className="hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Klik untuk melihat kuitansi resmi"
                  >
                    {/* Waktu & Order ID */}
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
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {tx.order_id} {tx.txn_id ? `• Txn: ${tx.txn_id}` : ''}
                      </div>
                    </TableCell>

                    {/* Jenis Pembayaran */}
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">
                        {tx.payment_type === 'dp'
                          ? 'Uang Muka (DP)'
                          : tx.payment_type === 'installment'
                          ? `Cicilan ke-${tx.installment_number || 1}`
                          : 'Formulir Pendaftaran'}
                      </span>
                    </TableCell>

                    {/* Nominal */}
                    <TableCell>
                      <span className="text-xs font-bold text-foreground">
                        {formatRp(tx.amount)}
                      </span>
                    </TableCell>

                    {/* Status Transaksi */}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
