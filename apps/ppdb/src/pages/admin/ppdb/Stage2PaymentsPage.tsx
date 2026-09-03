import { useState, useEffect } from 'react'
import { Card, CardContent } from "@repo/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@repo/ui"
import { Badge } from "@repo/ui"
import { Button } from "@repo/ui"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui"
import { EmptyState } from "@repo/ui"
import { ConfirmDialog } from "@repo/ui"
import { TableSkeletonRows } from "@repo/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { CreditCard, CheckCircle, XCircle, Waves, Eye } from 'lucide-react'
import { apiFetch } from '@/api/client'

export default function Stage2PaymentsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('payment', 'crud')

  const [activeTab, setActiveTab] = useState('all')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasActiveWave, setHasActiveWave] = useState<boolean | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchBills = async (statusFilter = activeTab) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (statusFilter !== 'all') {
        q.append('status', statusFilter)
      }

      const res = await apiFetch<any>(`/payment/stage2/bills?${q.toString()}`)
      setBills(res.data || [])
      setHasActiveWave(res.active_wave !== null && res.active_wave !== undefined)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat tagihan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills(activeTab)
  }, [activeTab])

  const handleConfirm = async () => {
    if (!confirmId) return
    setConfirming(true)
    try {
      await apiFetch(`/payment/stage2/bills/${confirmId}/confirm`, { method: 'PUT' })
      toast('success', 'Pembayaran berhasil diverifikasi')
      fetchBills()
    } catch (e: any) {
      toast('error', e.message || 'Gagal verifikasi')
    } finally {
      setConfirming(false)
      setConfirmId(null)
    }
  }

  const handleCancel = async () => {
    if (!cancelId) return
    setCancelling(true)
    try {
      await apiFetch(`/payment/stage2/bills/${cancelId}/cancel`, { method: 'PUT' })
      toast('success', 'Verifikasi berhasil dibatalkan')
      fetchBills()
    } catch (e: any) {
      toast('error', e.message || 'Gagal membatalkan verifikasi')
    } finally {
      setCancelling(false)
      setCancelId(null)
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Pembayaran Tahap 2
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manajemen transaksi pembayaran tahap 2 untuk pendaftar yang lulus.
        </p>
      </div>

      {!loading && hasActiveWave === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Waves className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu.
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto">
        <TabsList className="inline-flex w-max sm:w-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">Semua</TabsTrigger>
          <TabsTrigger value="paid" className="text-xs sm:text-sm">Lunas</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">Menunggu</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Batal</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="all">{renderTable()}</TabsContent>
          <TabsContent value="paid">{renderTable()}</TabsContent>
          <TabsContent value="pending">{renderTable()}</TabsContent>
          <TabsContent value="cancelled">{renderTable()}</TabsContent>
        </div>
      </Tabs>

      <ConfirmDialog
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirm}
        loading={confirming}
        title="Konfirmasi Pembayaran"
        message="Apakah Anda yakin ingin memverifikasi pembayaran ini secara manual?"
        confirmLabel="Ya, Verifikasi"
      />

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Batalkan Verifikasi"
        message="Apakah Anda yakin ingin membatalkan verifikasi pembayaran ini?"
        confirmLabel="Ya, Batalkan"
        variant="danger"
      />
    </div>
  )
}
