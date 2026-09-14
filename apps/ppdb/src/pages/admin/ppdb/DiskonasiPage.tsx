import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Percent, Waves, Settings2, ArrowRight, Activity, Users } from 'lucide-react'
import { apiFetch } from '@/api/client'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

interface DiscountItem {
  fee_item_id: string
  fee_item_name: string
  nominal: number
  discount_type: '' | 'percent' | 'nominal'
  discount_value: number
  installment_count: number
}

export default function DiskonasiPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('payment', 'crud')
  const queryClient = useQueryClient()

  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [discountItems, setDiscountItems] = useState<DiscountItem[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['stage2-applicants'],
    queryFn: async () => {
      const res = await apiFetch<any>(`/payment/stage2/applicants`)
      return res
    }
  })

  const applicants = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData

  const openDiscountSheet = async (applicant: any) => {
    setSelectedApplicant(applicant)
    setSheetLoading(true)
    try {
      const res = await apiFetch<any>(`/payment/stage2/${applicant.id}/discounts`)
      // Initialize with default values if they don't exist yet
      const items = (res.fee_items || []).map((item: any) => ({
        fee_item_id: item.id,
        fee_item_name: item.name,
        nominal: item.nominal,
        discount_type: (item.discount?.discount_type || '') as '' | 'percent' | 'nominal',
        discount_value: item.discount?.discount_value || 0,
        installment_count: item.discount?.installment_count || 0
      }))
      setDiscountItems(items)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat diskon')
    } finally {
      setSheetLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof DiscountItem, value: any) => {
    setDiscountItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'discount_type' && value === '') {
        next[index].discount_value = 0
      }
      return next
    })
  }

  const saveDiscountsMutation = useMutation({
    mutationFn: async ({ applicantId, items }: { applicantId: string, items: any[] }) => {
      await apiFetch(`/payment/stage2/${applicantId}/discounts`, {
        method: 'POST',
        body: JSON.stringify({ items })
      })
    },
    onSuccess: () => {
      toast('success', 'Diskon disimpan & tagihan dibuat.')
      setSelectedApplicant(null)
      queryClient.invalidateQueries({ queryKey: ['stage2-applicants'] })
      queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
      queryClient.invalidateQueries({ queryKey: ['mou-applicants'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan diskon')
  })

  const handleSaveDiscounts = async () => {
    if (!selectedApplicant) return
    setSaving(true)
    try {
      await saveDiscountsMutation.mutateAsync({
        applicantId: selectedApplicant.id,
        items: discountItems.map(d => ({
          fee_item_id: d.fee_item_id,
          discount_type: d.discount_type || null,
          discount_value: d.discount_value || null,
          installment_count: d.installment_count
        }))
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Diskonasi & Cicilan"
        description="Pengaturan diskon dan cicilan pembayaran tahap 2 untuk pendaftar yang lulus."
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
          { icon: Users, label: 'Total Pendaftar', value: `${applicants.length} pendaftar`, active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu." />
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama & Email</TableHead>
                <TableHead>Jenjang/Jalur</TableHead>
                <TableHead>Total Tagihan</TableHead>
                <TableHead>Status Diskon</TableHead>
                <TableHead>Status Tagihan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows cols={6} rows={5} />
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <EmptyState
                      icon={hasActiveWave === false ? Waves : Percent}
                      title={hasActiveWave === false ? "Tidak Ada Gelombang Aktif" : "Tidak Ada Data"}
                      description={
                        hasActiveWave === false
                          ? "Aktifkan gelombang terlebih dahulu."
                          : "Belum ada pendaftar yang lulus di gelombang ini."
                      }
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell>
                      {a.registration_level} / {a.registration_path}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{a.total_bills} tagihan</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.discount_configured ? 'success' : 'warning'}>
                        {a.discount_configured ? 'Sudah Dikonfig' : 'Belum'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {a.total_paid_bills} / {a.total_bills} Lunas
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCrud && (
                        <Button size="sm" onClick={() => openDiscountSheet(a)} className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Atur Diskon & Cicilan
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

      <Sheet open={!!selectedApplicant} onOpenChange={(v) => !v && setSelectedApplicant(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Diskonasi: {selectedApplicant?.full_name}</SheetTitle>
          </SheetHeader>

          {sheetLoading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />)}
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {discountItems.map((item, i) => {
                const discAmt = item.discount_type === 'percent'
                  ? Math.floor(item.nominal * (item.discount_value / 100))
                  : item.discount_type === 'nominal' ? Math.min(item.discount_value, item.nominal) : 0;

                const finalAmt = item.nominal - discAmt;
                const perCicilan = item.installment_count > 0 ? Math.ceil(finalAmt / item.installment_count) : finalAmt;

                return (
                  <div key={item.fee_item_id} className="p-4 border rounded-xl bg-card space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{item.fee_item_name}</div>
                      <div className="text-sm font-semibold text-muted-foreground">{formatRp(item.nominal)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipe Diskon</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={item.discount_type}
                          onChange={(e) => handleItemChange(i, 'discount_type', e.target.value)}
                        >
                          <option value="">Tidak ada</option>
                          <option value="percent">Persentase (%)</option>
                          <option value="nominal">Nominal (Rp)</option>
                        </select>
                      </div>

                      {item.discount_type !== '' && (
                        <div className="space-y-2">
                          <Label>Nilai Diskon</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.discount_value}
                            onChange={(e) => handleItemChange(i, 'discount_value', Number(e.target.value))}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Jumlah Cicilan</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.installment_count}
                          onChange={(e) => handleItemChange(i, 'installment_count', Number(e.target.value))}
                          placeholder="0 = Lunas 1x"
                        />
                        <p className="text-[10px] text-muted-foreground">Isi 0 untuk lump sum.</p>
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                        <div className="text-sm p-2 bg-primary/5 rounded-md">
                          <div className="text-xs text-muted-foreground">Total Setelah Diskon:</div>
                          <div className="font-semibold text-primary">{formatRp(finalAmt)}</div>
                          {item.installment_count > 0 && (
                            <div className="text-xs mt-1 text-amber-600">
                              {item.installment_count}x @ {formatRp(perCicilan)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveDiscounts} disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Menyimpan...' : 'Simpan Diskon & Cicilan'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
