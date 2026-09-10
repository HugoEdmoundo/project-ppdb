import { useState } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { CreditCard, CheckCircle, XCircle, Waves, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Transaction } from '@/types/ppdb'

export default function PaymentsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('payment', 'crud')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('all')
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
  const hasActiveWave = data?.active_wave !== null && data?.active_wave !== undefined
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
                <TableRow key={trx.id}>
                  <TableCell className="font-medium">
                    {trx.full_name || trx.applicant_name || '-'}
                    <div className="text-xs text-muted-foreground font-normal">{trx.wave_name || '-'}</div>
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
                      variant={trx.status === 'paid' ? 'success' : trx.status === 'expired' ? 'destructive' : 'warning'}
                    >
                      {trx.status.toUpperCase()}
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
                        {trx.method === 'offline' && trx.status === 'paid' && (
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Pembayaran PPDB
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola pembayaran formulir pendaftaran (Tahap 1).
        </p>
      </div>

      {!loading && hasActiveWave === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Waves className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data pembayaran.
          </span>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          setPage(1)
        }}
        className="w-full"
      >
        <TabsList className="grid w-full sm:w-[400px] grid-cols-4">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Lunas</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {renderTable()}
        </div>
      </Tabs>

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
