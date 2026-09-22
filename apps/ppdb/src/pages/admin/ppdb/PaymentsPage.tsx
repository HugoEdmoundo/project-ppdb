import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { TabsTrigger } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { CreditCard, CheckCircle, XCircle, Waves, ArrowRight, Activity, Users } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Transaction } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import TabsBarCard from '@/components/shared/TabsBarCard'

export default function PaymentsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()

  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'all')
  const [page, setPage] = useState(1)
  const limit = 20

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['transactions', activeTab, page, limit],
    queryFn: async () => {
      const q = new URLSearchParams()
      if (activeTab !== 'all') {
        q.append('status', activeTab)
      }
      q.append('page', page.toString())
      q.append('perPage', limit.toString())

      const res = await apiFetch<{ data: Transaction[], total: number, active_wave: any }>(`/payment/transactions?${q.toString()}`)
      return res
    }
  })

  const transactions = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payment/transactions/${id}/confirm`, { method: 'PUT' }),
    onSuccess: () => {
      toast('success', 'Pembayaran berhasil diverifikasi')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal verifikasi'),
    onSettled: () => setConfirmId(null)
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payment/transactions/${id}/cancel-confirm`, { method: 'PUT' }),
    onSuccess: () => {
      toast('success', 'Verifikasi berhasil dibatalkan')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal membatalkan verifikasi'),
    onSettled: () => setCancelId(null)
  })

  const renderTable = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead>Nama Pendaftar</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows cols={6} rows={5} />
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <EmptyState
                    icon={hasActiveWave === false ? Waves : CreditCard}
                    title={hasActiveWave === false ? "Tidak Ada Gelombang Aktif" : "Belum Ada Transaksi"}
                    description={
                      hasActiveWave === false
                        ? "Aktifkan gelombang terlebih dahulu untuk melihat data pembayaran."
                        : "Data pembayaran tahap 1 belum tersedia."
                    }
                    className="bg-transparent border-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((trx: Transaction) => (
                <TableRow 
                  key={trx.id}
                  className={trx.method === 'offline' && trx.status === 'pending' ? 'bg-amber-50/50 hover:bg-amber-50/80' : ''}
                >
                  <TableCell className="font-medium">
                    {trx.full_name || trx.applicant_name || '-'}
                    <div className="text-xs text-muted-foreground font-normal">{trx.wave_name || activeWaveData?.name || '-'}</div>
                  </TableCell>
                  <TableCell>
                    {trx.method === 'offline' ? (
                      <Badge variant="outline">Manual/Transfer</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Gateway</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    Rp {trx.amount.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(trx.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={trx.status === 'success' ? 'success' : trx.status === 'expired' ? 'destructive' : 'warning'}
                    >
                      {trx.status === 'success' ? 'LUNAS' : trx.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canCrud && (
                      <div className="flex justify-end gap-2">
                        {trx.method === 'offline' && trx.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => setConfirmId(trx.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verifikasi
                          </Button>
                        )}
                        {trx.method === 'offline' && trx.status === 'success' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => setCancelId(trx.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Batalkan
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Pembayaran PPDB"
        description="Kelola pembayaran formulir pendaftaran (Tahap 1)."
        loading={loading}
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveData?.name || 'Tidak ada', active: hasActiveWave, pulse: hasActiveWave },
          { icon: Users, label: 'Total Transaksi', value: data?.total != null ? `${data.total} transaksi` : '—', active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data pembayaran." />
      )}

      <TabsBarCard
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          setPage(1)
        }}
        className="max-w-md"
      >
        <TabsTrigger value="all" className="flex-1 rounded-full text-xs sm:text-sm">Semua</TabsTrigger>
        <TabsTrigger value="pending" className="flex-1 rounded-full text-xs sm:text-sm">Pending</TabsTrigger>
        <TabsTrigger value="success" className="flex-1 rounded-full text-xs sm:text-sm">Lunas</TabsTrigger>
        <TabsTrigger value="expired" className="flex-1 rounded-full text-xs sm:text-sm">Expired</TabsTrigger>
      </TabsBarCard>

      <div className="mt-4">
        {renderTable()}
      </div>

      <ConfirmDialog
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Verifikasi Pembayaran"
        message="Apakah Anda yakin ingin memverifikasi pembayaran ini? Pendaftar akan mendapatkan akses ke dashboard."
        onConfirm={() => confirmId && confirmMutation.mutate(confirmId)}
        confirmLabel="Ya, Verifikasi"
        variant="primary"
        loading={confirmMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Batalkan Verifikasi"
        message="Apakah Anda yakin ingin membatalkan verifikasi pembayaran ini? Status akan kembali menjadi pending."
        onConfirm={() => cancelId && cancelMutation.mutate(cancelId)}
        confirmLabel="Ya, Batalkan"
        variant="destructive"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
