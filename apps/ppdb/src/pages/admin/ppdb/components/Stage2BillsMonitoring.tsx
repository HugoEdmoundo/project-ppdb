import { useState } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/api/client'
import PaginationControls from '@/components/shared/PaginationControls'

const formatRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

interface Stage2BillItem {
  id: string
  applicant_id: string
  full_name: string
  email: string
  phone: string
  fee_item_name: string
  installment_number: number
  amount: number
  due_date: string | null
  status: 'pending' | 'paid' | 'cancelled'
  proof_url: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  notes: string | null
}

export default function Stage2BillsMonitoring() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['stage2-bills', statusFilter, page],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      return await apiFetch<{ data: Stage2BillItem[]; total: number }>(`/payment/stage2/bills?${qs.toString()}`)
    },
  })

  const bills = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-4">
      {/* Banner Penjelasan Webhook Otomatis */}
      <div className="p-3.5 bg-muted/40 border rounded-lg flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground">
            Monitoring Pembayaran Otomatis (Webhook Payment Gateway)
          </p>
          <p>
            Status pembayaran DP dan cicilan terverifikasi secara otomatis saat dana masuk melalui webhook Pak Kasir. Admin hanya memantau data tanpa konfirmasi manual.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filter Status:</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-full"
              onClick={() => { setStatusFilter(''); setPage(1) }}
            >
              Semua
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-full"
              onClick={() => { setStatusFilter('pending'); setPage(1) }}
            >
              Menunggu Pembayaran
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-full"
              onClick={() => { setStatusFilter('paid'); setPage(1) }}
            >
              Lunas (Paid)
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{total}</span> tagihan
        </div>
      </div>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Santri</TableHead>
                <TableHead>Komponen Biaya / Cicilan</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead className="text-right">Waktu Masuk / Lunas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={6} rows={5} />
              ) : bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <EmptyState
                      icon={CreditCard}
                      title="Tidak Ada Tagihan Tahap 2"
                      description="Belum ada tagihan tahap 2 atau cicilan pada filter yang dipilih."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{bill.full_name}</div>
                      <div className="text-xs text-muted-foreground">{bill.phone || bill.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{bill.fee_item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {bill.installment_number === 0
                          ? 'Pembayaran Sekaligus / DP'
                          : `Cicilan ke-${bill.installment_number}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{formatRp(bill.amount)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {bill.due_date ? new Date(bill.due_date).toLocaleDateString('id-ID') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {bill.status === 'paid' ? (
                        <Badge variant="success" className="text-[10px] gap-1 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Lunas (Webhook)
                        </Badge>
                      ) : bill.status === 'cancelled' ? (
                        <Badge variant="destructive" className="text-[10px] py-0.5">
                          Batal
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] gap-1 py-0.5">
                          <Clock className="h-3 w-3" /> Menunggu Bayar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.confirmed_at ? (
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">
                            {new Date(bill.confirmed_at).toLocaleDateString('id-ID')}
                          </p>
                          <p className="text-[10px]">
                            {new Date(bill.confirmed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
    </div>
  )
}
