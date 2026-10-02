import { useState } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Download, FileText, CreditCard, Filter } from 'lucide-react'
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
  const { toast } = useToast()
  const queryClient = useQueryClient()
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

  const confirmMutation = useMutation({
    mutationFn: async (billId: string) => {
      return await apiFetch(`/payment/stage2/bills/${billId}/confirm`, {
        method: 'PUT',
      })
    },
    onSuccess: () => {
      toast('success', 'Pembayaran tahap 2 berhasil dikonfirmasi! Notifikasi WhatsApp telah dikirim.')
      queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
      queryClient.invalidateQueries({ queryKey: ['stage2-applicants'] })
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal mengonfirmasi pembayaran')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (billId: string) => {
      return await apiFetch(`/payment/stage2/bills/${billId}/cancel`, {
        method: 'PUT',
      })
    },
    onSuccess: () => {
      toast('success', 'Konfirmasi pembayaran dibatalkan')
      queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
      queryClient.invalidateQueries({ queryKey: ['stage2-applicants'] })
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal membatalkan konfirmasi')
    },
  })

  const bills = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-4">
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
              Pending (Belum Bayar)
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
                <TableHead>Status</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-right">Aksi Kasir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={7} rows={5} />
              ) : bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
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
                      <Badge
                        variant={
                          bill.status === 'paid'
                            ? 'success'
                            : bill.status === 'cancelled'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="uppercase text-[10px]"
                      >
                        {bill.status === 'paid' ? 'Lunas' : bill.status === 'cancelled' ? 'Batal' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.proof_url ? (
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2 gap-1">
                          <a href={bill.proof_url} target="_blank" rel="noreferrer">
                            <Download className="h-3 w-3" /> Lihat
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Tanpa Bukti</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.status === 'pending' && (
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                          disabled={confirmMutation.isPending}
                          onClick={() => {
                            if (confirm(`Konfirmasi pembayaran ${bill.fee_item_name} (${formatRp(bill.amount)}) untuk ${bill.full_name}?`)) {
                              confirmMutation.mutate(bill.id)
                            }
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Konfirmasi Masuk
                        </Button>
                      )}

                      {bill.status === 'paid' && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Terverifikasi
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-muted-foreground hover:text-destructive px-2"
                            disabled={cancelMutation.isPending}
                            onClick={() => {
                              if (confirm(`Batalkan konfirmasi pembayaran untuk tagihan ini?`)) {
                                cancelMutation.mutate(bill.id)
                              }
                            }}
                          >
                            Batalkan
                          </Button>
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
    </div>
  )
}
