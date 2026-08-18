import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { CreditCard, CheckCircle } from 'lucide-react'
import { apiFetch } from '@/api/client'

export default function PaymentsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('payment', 'crud')
  
  const [activeTab, setActiveTab] = useState('all')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTransactions = async (statusFilter = activeTab) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (statusFilter !== 'all') {
        q.append('status', statusFilter)
      }
      
      const res = await apiFetch<any>(`/payment/transactions?${q.toString()}`)
      setTransactions(res.data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat transaksi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(activeTab)
  }, [activeTab])

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin memverifikasi pembayaran ini secara manual?')) return
    
    try {
      await apiFetch(`/payment/transactions/${id}/confirm`, { method: 'PUT' })
      toast('success', 'Pembayaran berhasil diverifikasi')
      fetchTransactions()
    } catch (e: any) {
      toast('error', e.message || 'Gagal verifikasi')
    }
  }

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
                    icon={CreditCard}
                    title="Tidak Ada Transaksi"
                    description="Belum ada data transaksi pembayaran yang sesuai kriteria."
                    className="bg-transparent border-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.applicant_name}</div>
                    <div className="text-xs text-muted-foreground">{t.applicant_email}</div>
                  </TableCell>
                  <TableCell className="uppercase">{t.method}</TableCell>
                  <TableCell>Rp {t.amount?.toLocaleString('id-ID') || 0}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(t.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'success' ? 'success' : t.status === 'expired' || t.status === 'failed' ? 'destructive' : 'warning'}>
                      {t.status === 'success' ? 'LUNAS' : t.status === 'expired' ? 'EXPIRED' : 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canCrud && t.status === 'pending' && (
                      <Button size="sm" onClick={() => handleConfirm(t.id)} className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Konfirmasi
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
          Pembayaran PPDB
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manajemen transaksi pembayaran pendaftaran calon santri/murid baru.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="success">Lunas</TabsTrigger>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="expired">Expired/Gagal</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="all">{renderTable()}</TabsContent>
          <TabsContent value="success">{renderTable()}</TabsContent>
          <TabsContent value="pending">{renderTable()}</TabsContent>
          <TabsContent value="expired">{renderTable()}</TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
