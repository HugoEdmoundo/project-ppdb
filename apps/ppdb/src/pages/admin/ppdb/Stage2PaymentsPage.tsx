import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, CheckCircle, XCircle, Waves, Eye, ArrowRight, Activity, Users } from 'lucide-react'
import { apiFetch } from '@/api/client'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import TabsBarCard from '@/components/shared/TabsBarCard'

export default function Stage2PaymentsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('payment', 'crud')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['stage2-bills', activeTab],
    queryFn: async () => {
      const q = new URLSearchParams()
      if (activeTab !== 'all') {
        q.append('status', activeTab)
      }
      const res = await apiFetch<any>(`/payment/stage2/bills?${q.toString()}`)
      return res
    }
  })

  const bills = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payment/stage2/bills/${id}/confirm`, { method: 'PUT' }),
    onSuccess: () => {
      toast('success', 'Pembayaran berhasil diverifikasi')
      queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal verifikasi'),
    onSettled: () => setConfirmId(null)
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/payment/stage2/bills/${id}/cancel`, { method: 'PUT' }),
    onSuccess: () => {
      toast('success', 'Verifikasi berhasil dibatalkan')
      queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
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
              <TableHead>Item Biaya</TableHead>
              <TableHead>Cicilan ke-</TableHead>
              <TableHead>Jumlah (Rp)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead>Admin & Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows cols={8} rows={5} />
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8">
                  <EmptyState
                    icon={hasActiveWave === false ? Waves : CreditCard}
                    title={hasActiveWave === false ? "Tidak Ada Gelombang Aktif" : "Tidak Ada Tagihan"}
                    description={
                      hasActiveWave === false
                        ? "Aktifkan gelombang terlebih dahulu untuk menampilkan data tagihan."
                        : "Belum ada data tagihan pembayaran yang sesuai kriteria."
                    }
                    className="bg-transparent border-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              bills.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.applicant_name}</div>
                  </TableCell>
                  <TableCell>{t.fee_item_name}</TableCell>
                  <TableCell>{t.installment_number}</TableCell>
                  <TableCell>Rp {t.amount?.toLocaleString('id-ID') || 0}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'paid' ? 'success' : t.status === 'cancelled' ? 'secondary' : 'warning'}>
                      {t.status === 'paid' ? 'LUNAS' : t.status === 'cancelled' ? 'BATAL' : 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.proof_url ? (
                      <a href={t.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        <Eye className="h-4 w-4" /> Lihat
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.confirmed_by_name || '-'}
                    {t.confirmed_at && <div className="text-xs text-muted-foreground">{new Date(t.confirmed_at).toLocaleDateString('id-ID')}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {canCrud && t.status === 'pending' && (
                      <Button size="sm" onClick={() => setConfirmId(t.id)} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Konfirmasi
                      </Button>
                    )}
                    {canCrud && t.status === 'paid' && (
                      <Button size="sm" variant="outline" onClick={() => setCancelId(t.id)} className="gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200">
                        <XCircle className="h-4 w-4" />
                        Batal
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Pembayaran Tahap 2"
        description="Manajemen transaksi pembayaran tahap 2 untuk pendaftar yang lulus."
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
          { icon: Users, label: 'Total Tagihan', value: `${bills.length} tagihan`, active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu." />
      )}

      <TabsBarCard value={activeTab} onValueChange={setActiveTab}>
        <TabsTrigger value="all" className="flex-1 rounded-full text-xs sm:text-sm">Semua</TabsTrigger>
        <TabsTrigger value="paid" className="flex-1 rounded-full text-xs sm:text-sm">Lunas</TabsTrigger>
        <TabsTrigger value="pending" className="flex-1 rounded-full text-xs sm:text-sm">Menunggu</TabsTrigger>
        <TabsTrigger value="cancelled" className="flex-1 rounded-full text-xs sm:text-sm">Batal</TabsTrigger>
      </TabsBarCard>

      <div className="mt-4">
        {renderTable()}
      </div>

      <ConfirmDialog
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmMutation.mutate(confirmId!)}
        loading={confirmMutation.isPending}
        title="Konfirmasi Pembayaran"
        message="Apakah Anda yakin ingin memverifikasi pembayaran ini secara manual?"
        confirmLabel="Ya, Verifikasi"
      />

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelMutation.mutate(cancelId!)}
        loading={cancelMutation.isPending}
        title="Batalkan Verifikasi"
        message="Apakah Anda yakin ingin membatalkan verifikasi pembayaran ini?"
        confirmLabel="Ya, Batalkan"
        variant="destructive"
      />
    </div>
  )
}
