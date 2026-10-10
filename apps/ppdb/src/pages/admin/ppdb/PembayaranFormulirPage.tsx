import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Badge } from "@/components/ui"
import { ArrowRight, Activity, CreditCard, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import PaymentStatusBadge from '@/components/shared/PaymentStatusBadge'

const formatRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

interface TransactionItem {
  id: string
  invoice_no: string
  amount: number
  status: string
  payment_method?: string
  created_at: string
  paid_at?: string | null
  applicant_name?: string
  applicant_email?: string
}

export default function PembayaranFormulirPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['form-payments', statusFilter, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())

      const res = await api.apiFetch<{ data: TransactionItem[]; total: number; active_wave: any }>(`/payment/transactions?${qs.toString()}`)
      return res
    }
  })

  const transactions = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleFilterChange = (status: string) => {
    if (status) {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Pembayaran Formulir"
        description="Monitoring transaksi pembayaran formulir pendaftaran calon santri pada gelombang aktif."
        loading={loading}
        docKey="ppdb-pembayaran-formulir"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveData?.name || 'Tidak ada', active: hasActiveWave, pulse: hasActiveWave },
          { icon: CreditCard, label: 'Total Transaksi', value: data?.total != null ? `${data.total} transaksi` : '—', active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk memantau pembayaran formulir." />
      )}

      {/* Filter and Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3"
            onClick={() => handleFilterChange('')}
          >
            Semua
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3 gap-1"
            onClick={() => handleFilterChange('paid')}
          >
            <CheckCircle2 className="h-3 w-3" /> Lunas
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3 gap-1"
            onClick={() => handleFilterChange('pending')}
          >
            <Clock className="h-3 w-3" /> Menunggu Bayar
          </Button>
          <Button
            variant={statusFilter === 'expired' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3 gap-1"
            onClick={() => handleFilterChange('expired')}
          >
            <XCircle className="h-3 w-3" /> Kadaluarsa
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-3 rounded-lg gap-1.5 ml-auto"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Segarkan
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-primary/5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left">No. Invoice</th>
                  <th className="py-3 px-4 text-left">Nama Pendaftar</th>
                  <th className="py-3 px-4 text-left">Nominal</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Metode</th>
                  <th className="py-3 px-4 text-right">Waktu Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      Belum ada transaksi pembayaran formulir pada filter ini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {tx.invoice_no || tx.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{tx.applicant_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{tx.applicant_email || '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {formatRp(tx.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={tx.status} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {tx.payment_method || 'Payment Gateway'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                        {tx.paid_at ? (
                          <div>
                            <span className="text-emerald-700 font-medium">
                              Lunas: {new Date(tx.paid_at).toLocaleDateString('id-ID')}
                            </span>
                            <div className="text-[10px]">
                              {new Date(tx.paid_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                          </div>
                        ) : tx.created_at ? (
                          <div>
                            <span>{new Date(tx.created_at).toLocaleDateString('id-ID')}</span>
                            <div className="text-[10px]">
                              {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
