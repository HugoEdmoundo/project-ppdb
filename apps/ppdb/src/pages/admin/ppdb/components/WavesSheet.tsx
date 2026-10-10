import { useState, Fragment, useMemo } from 'react'
import { ppdbService } from '@/services'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { cn } from '@/lib/utils'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, ConfirmDialog, Sheet, SheetContent, SheetHeader, SheetTitle,
  EmptyState, Alert, CurrencyInput
} from '@/components/ui'
import {
  Plus, Edit, Trash2, CheckCircle, XCircle, Waves, Receipt, Check, Users, Banknote, Layers,
  Percent, Tag, Calculator, Sparkles, Save
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const PATH_OPTIONS = [
  { value: 'reguler', label: 'Reguler' },
  { value: 'prestasi', label: 'Prestasi' },
  { value: 'tahfidz', label: 'Tahfidz' },
  { value: 'rapot', label: 'Rapor' },
]
const PATH_LABELS: Record<string, string> = {
  reguler: 'Reguler',
  prestasi: 'Prestasi',
  tahfidz: 'Tahfidz',
  rapot: 'Rapor',
}

const parseCsv = (v?: string | null): string[] =>
  (v || '').split(',').map(s => s.trim()).filter(Boolean)

const localIso = (d: string): string => {
  const dt = new Date(d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

const todayIso = (): string => localIso(new Date().toString())

const getNextDayIso = (dStr?: string) => {
  if (!dStr) return todayIso()
  const dt = new Date(dStr)
  dt.setDate(dt.getDate() + 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

const waveSchema = z.object({
  name: z.string().min(1, 'Nama gelombang wajib diisi'),
  allowed_paths: z.array(z.string()).min(1, 'Pilih minimal satu jalur pendaftaran'),
  registration_start_date: z.string().min(1, 'Tanggal mulai pendaftaran wajib diisi'),
  registration_end_date: z.string().min(1, 'Tanggal akhir pendaftaran wajib diisi'),
  quota: z.number().min(1, 'Kuota harus diisi minimal 1'),
  early_discount_quota: z.number().min(0, 'Jumlah harus nol atau lebih'),
  registration_fee: z.number().min(0, 'Biaya tidak boleh negatif'),
}).refine(data => data.registration_end_date > data.registration_start_date, {
  message: "Tanggal akhir pendaftaran harus setelah tanggal mulai pendaftaran",
  path: ["registration_end_date"],
}).refine(data => data.early_discount_quota <= data.quota, {
  message: 'Jumlah diskon pendaftar awal tidak boleh melebihi kuota',
  path: ['early_discount_quota'],
});

type WaveFormData = z.infer<typeof waveSchema>;

const emptyWaveForm = (): WaveFormData => ({
  name: '',
  allowed_paths: ['reguler', 'prestasi', 'tahfidz', 'rapot'],
  registration_start_date: '',
  registration_end_date: '',
  quota: 0,
  early_discount_quota: 0,
  registration_fee: 0,
})

const fmtDateShort = (d: string): string =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const WAVE_MILESTONES: { step: string; label: string; get: (w: any) => string }[] = [
  { step: 'registration_start_date', label: 'Mulai Daftar', get: (w) => w.registration_start_date },
  { step: 'registration_end_date', label: 'Akhir Daftar', get: (w) => w.registration_end_date },
]

export default function WavesSheet({ period, onClose }: { period: any, onClose: () => void }) {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()

  const { data: waves = [], isLoading: loading } = useQuery({
    queryKey: ['waves', period?.id],
    queryFn: () => ppdbService.getWaves({ period_id: period.id }),
    enabled: !!period?.id
  })

  const [showForm, setShowForm] = useState(false)
  const [editingWave, setEditingWave] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)

  const { register, handleSubmit, setValue, getValues, control, reset, formState: { errors } } = useForm<WaveFormData>({
    resolver: zodResolver(waveSchema),
    defaultValues: emptyWaveForm()
  })

  const allowedPaths = useWatch({ control, name: 'allowed_paths' }) ?? []
  const registrationFee = useWatch({ control, name: 'registration_fee' })
  const startDateWatch = useWatch({ control, name: 'registration_start_date' })

  // ---------------------------------------------------------------------------
  // Dialog Rincian Biaya & Diskon (3 Tab)
  // ---------------------------------------------------------------------------
  const [feeDialogWave, setFeeDialogWave] = useState<any>(null)
  const [feeActiveTab, setFeeActiveTab] = useState<'components' | 'early_discount' | 'engine'>('components')
  const [feeItems, setFeeItems] = useState<any[]>([])
  const [feeWaveMinimumDp, setFeeWaveMinimumDp] = useState<number>(0)
  const [savingMinimumDp, setSavingMinimumDp] = useState(false)

  // Form Tambah/Edit Item di Tab 1
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeNominal, setNewFeeNominal] = useState(0)
  const [newFeeDescription, setNewFeeDescription] = useState('')
  const [feeDiscountType, setFeeDiscountType] = useState<'' | 'percent' | 'nominal'>('')
  const [feeDiscountValue, setFeeDiscountValue] = useState(0)
  const [editingFeeItem, setEditingFeeItem] = useState<any>(null)

  // Edit Diskon Pendaftar Awal di Tab 2
  const [earlyEditingItem, setEarlyEditingItem] = useState<any>(null)
  const [earlyDiscountType, setEarlyDiscountType] = useState<'' | 'percent' | 'nominal'>('')
  const [earlyDiscountValue, setEarlyDiscountValue] = useState(0)

  const openFeeDialog = async (w: any) => {
    setFeeDialogWave(w)
    setFeeWaveMinimumDp(w.minimum_dp || 0)
    setFeeActiveTab('components')
    resetFeeItemForm()
    fetchFeeItems(w.id)
  }

  const fetchFeeItems = async (wave_id: string) => {
    try {
      const res = await apiFetch<any>(`/ppdb/waves/${wave_id}/fee-items`)
      setFeeItems(res.items || [])
    } catch {
      toast('error', 'Gagal memuat item biaya')
    }
  }

  const handleSaveMinimumDp = async () => {
    if (!feeDialogWave || !canCrud) return
    setSavingMinimumDp(true)
    try {
      await ppdbService.updateWave(feeDialogWave.id, { minimum_dp: feeWaveMinimumDp })
      setFeeDialogWave((prev: any) => ({ ...prev, minimum_dp: feeWaveMinimumDp }))
      await queryClient.invalidateQueries({ queryKey: ['waves', period.id] })
      toast('success', 'Minimal DP berhasil diperbarui')
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui minimal DP')
    } finally {
      setSavingMinimumDp(false)
    }
  }

  const handleAddFeeItem = async () => {
    if (!newFeeName.trim() || newFeeNominal <= 0) {
      toast('error', 'Nama komponen dan nominal wajib diisi')
      return
    }
    if (feeDiscountType && (feeDiscountValue <= 0 || (feeDiscountType === 'percent' && feeDiscountValue > 100))) {
      toast('error', 'Nilai diskon reguler harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items`, {
        method: 'POST',
        body: JSON.stringify({
          name: newFeeName.trim(),
          nominal: newFeeNominal,
          description: newFeeDescription.trim() || null,
          order_index: feeItems.length + 1,
          discount_type: feeDiscountType || null,
          discount_value: feeDiscountType ? feeDiscountValue : null,
          discount_scope: 'all',
          early_discount_type: null,
          early_discount_value: null
        })
      })
      resetFeeItemForm()
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Komponen biaya berhasil ditambahkan')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menambah komponen biaya')
    }
  }

  const handleEditFeeItem = async (item: any) => {
    if (!newFeeName.trim() || newFeeNominal <= 0) {
      toast('error', 'Nama komponen dan nominal wajib diisi')
      return
    }
    if (feeDiscountType && (feeDiscountValue <= 0 || (feeDiscountType === 'percent' && feeDiscountValue > 100))) {
      toast('error', 'Nilai diskon reguler harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: newFeeName.trim(),
          nominal: newFeeNominal,
          description: newFeeDescription.trim() || null,
          order_index: item.order_index || 0,
          discount_type: feeDiscountType || null,
          discount_value: feeDiscountType ? feeDiscountValue : null,
          discount_scope: 'all',
          early_discount_type: item.early_discount_type || null,
          early_discount_value: item.early_discount_value || null,
        })
      })
      resetFeeItemForm()
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Komponen biaya berhasil diperbarui')
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui komponen biaya')
    }
  }

  const startEditFeeItem = (item: any) => {
    setEditingFeeItem(item)
    setNewFeeName(item.name)
    setNewFeeNominal(Number(item.nominal))
    setNewFeeDescription(item.description || '')
    setFeeDiscountType(item.discount_type || '')
    setFeeDiscountValue(Number(item.discount_value || 0))
  }

  const resetFeeItemForm = () => {
    setEditingFeeItem(null)
    setNewFeeName('')
    setNewFeeNominal(0)
    setNewFeeDescription('')
    setFeeDiscountType('')
    setFeeDiscountValue(0)
  }

  const handleDeleteFeeItem = async (id: string) => {
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${id}`, { method: 'DELETE' })
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Komponen biaya berhasil dihapus')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus komponen biaya')
    }
  }

  // Handle Update Diskon Tambahan Pendaftar Awal (Tab 2)
  const handleSaveEarlyDiscount = async (item: any) => {
    if (earlyDiscountType && (earlyDiscountValue <= 0 || (earlyDiscountType === 'percent' && earlyDiscountValue > 100))) {
      toast('error', 'Nilai diskon tambahan harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    if (earlyDiscountType && !(feeDialogWave?.early_discount_quota > 0)) {
      toast('error', 'Atur kuota pendaftar awal pada gelombang terlebih dahulu')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name,
          nominal: item.nominal,
          description: item.description,
          order_index: item.order_index || 0,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          discount_scope: 'all',
          early_discount_type: earlyDiscountType || null,
          early_discount_value: earlyDiscountType ? earlyDiscountValue : null,
        })
      })
      setEarlyEditingItem(null)
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Diskon pendaftar awal berhasil diperbarui')
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui diskon pendaftar awal')
    }
  }

  // ---------------------------------------------------------------------------
  // Mesin Perhitungan Biaya Helpers
  // ---------------------------------------------------------------------------
  const calcRegularDiscount = (item: any): number => {
    const nom = Number(item.nominal) || 0
    if (!item.discount_type || !item.discount_value) return 0
    if (item.discount_type === 'percent') {
      return Math.min(nom, Math.floor((nom * Number(item.discount_value)) / 100))
    }
    return Math.min(nom, Number(item.discount_value))
  }

  const calcRegularNet = (item: any): number => {
    const nom = Number(item.nominal) || 0
    return Math.max(0, nom - calcRegularDiscount(item))
  }

  const calcEarlyDiscount = (item: any): number => {
    const baseNominal = calcRegularNet(item)
    if (!item.early_discount_type || !item.early_discount_value) return 0
    if (item.early_discount_type === 'percent') {
      return Math.min(baseNominal, Math.floor((baseNominal * Number(item.early_discount_value)) / 100))
    }
    return Math.min(baseNominal, Number(item.early_discount_value))
  }

  const calcEarlyNet = (item: any): number => {
    const baseNominal = calcRegularNet(item)
    return Math.max(0, baseNominal - calcEarlyDiscount(item))
  }

  const engineTotals = useMemo(() => {
    let totalGross = 0
    let totalRegDiscount = 0
    let totalRegNet = 0
    let totalEarlyDiscount = 0
    let totalEarlyNet = 0

    feeItems.forEach(item => {
      const nom = Number(item.nominal) || 0
      const regDisc = calcRegularDiscount(item)
      const regNet = calcRegularNet(item)
      const earlyDisc = calcEarlyDiscount(item)
      const earlyNet = calcEarlyNet(item)

      totalGross += nom
      totalRegDiscount += regDisc
      totalRegNet += regNet
      totalEarlyDiscount += earlyDisc
      totalEarlyNet += earlyNet
    })

    return {
      totalGross,
      totalRegDiscount,
      totalRegNet,
      totalEarlyDiscount,
      totalEarlyNet,
      totalEarlyCombinedDiscount: totalRegDiscount + totalEarlyDiscount,
    }
  }, [feeItems])

  // ---------------------------------------------------------------------------
  // Gelombang Form Handlers
  // ---------------------------------------------------------------------------
  const openCreate = () => {
    setEditingWave(null)
    reset(emptyWaveForm())
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (w: any) => {
    setEditingWave(w)
    reset({
      name: w.name || '',
      allowed_paths: parseCsv(w.allowed_paths),
      registration_start_date: (w.registration_start_date || '').split('T')[0],
      registration_end_date: (w.registration_end_date || '').split('T')[0],
      quota: w.quota ?? 0,
      early_discount_quota: w.early_discount_quota ?? 0,
      registration_fee: w.registration_fee ?? 0,
    })
    setFormError(null)
    setShowForm(true)
  }

  const toggleScope = (key: 'allowed_paths', value: string) => {
    const list = getValues(key) ?? []
    const next = list.includes(value) ? list.filter((v: string) => v !== value) : [...list, value]
    setValue(key, next, { shouldValidate: true })
  }

  const handleSave = async (data: WaveFormData) => {
    if (!canCrud || !period) return
    const payload = {
      ...data,
      name: data.name.trim(),
      allowed_paths: data.allowed_paths.join(','),
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingWave) {
        await ppdbService.updateWave(editingWave.id, payload)
        toast('success', 'Gelombang berhasil diperbarui')
      } else {
        await ppdbService.createWave({ ...payload, period_id: period.id })
        toast('success', 'Gelombang berhasil ditambahkan')
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] })
      ])
      setShowForm(false)
    } catch (e: any) {
      const msg = e.message || 'Gagal menyimpan gelombang'
      setFormError(msg)
      toast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId || !canCrud) return
    try {
      await ppdbService.deleteWave(deletingId)
      toast('success', 'Gelombang berhasil dihapus')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] })
      ])
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus gelombang')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAction = async () => {
    if (!actionId || !canCrud) return
    try {
      if (actionId.type === 'activate') {
        await ppdbService.activateWave(actionId.id)
        toast('success', 'Gelombang berhasil diaktifkan')
      } else {
        await ppdbService.deactivateWave(actionId.id)
        toast('success', 'Gelombang berhasil dinonaktifkan')
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waves', period.id] }),
        queryClient.invalidateQueries({ queryKey: ['waves'] }),
        queryClient.invalidateQueries({ queryKey: ['periods'] }),
        queryClient.invalidateQueries({ queryKey: ['applicants'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['stage2-bills'] })
      ])
      queryClient.invalidateQueries({ queryKey: ['stage2-applicants'] })
      queryClient.invalidateQueries({ queryKey: ['mou-applicants'] })
    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} gelombang`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <Sheet open={!!period} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl sm:w-[720px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Gelombang — {period?.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Daftar Gelombang</h3>
            {canCrud && (
              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
                      <div className="h-3 w-64 rounded bg-slate-50 animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((j) => <div key={j} className="h-20 rounded-xl bg-slate-50 animate-pulse" />)}
                  </div>
                  <div className="h-12 rounded-lg bg-slate-50 animate-pulse" />
                </div>
              ))}
            </div>
          ) : waves.length === 0 ? (
            <EmptyState
              icon={Waves}
              title="Belum Ada Gelombang"
              description="Tambahkan gelombang pertama agar pendaftaran PPDB dapat berjalan untuk periode ini."
              actionLabel={canCrud ? 'Tambah Gelombang' : undefined}
              onAction={canCrud ? openCreate : undefined}
              className="bg-transparent border-transparent"
            />
          ) : (
            <div className="space-y-4">
              {waves.map((w: any) => {
                const filled = w.filled ?? 0
                const pct = w.quota > 0 ? Math.round((filled / w.quota) * 100) : 0
                const remaining = Math.max(0, w.quota - filled)
                const today = todayIso()
                const resolved = WAVE_MILESTONES.map((m) => {
                  const iso = localIso(m.get(w))
                  return { ...m, iso, done: today >= iso }
                })
                const lastDoneIdx = resolved.reduce((acc, m, i) => (m.done ? i : acc), -1)
                const activeStep = lastDoneIdx + 1 < resolved.length ? lastDoneIdx + 1 : resolved.length

                return (
                  <div
                    key={w.id}
                    className={cn(
                      'rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md',
                      w.status === 'active'
                        ? 'border-emerald-primary/40 ring-1 ring-emerald-primary/10 bg-white'
                        : 'border-slate-100 bg-white'
                    )}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl font-heading text-xs font-bold leading-none',
                          w.status === 'active' ? 'bg-emerald-primary text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                        )}>
                          <span className="text-[9px] uppercase opacity-80">Gel</span>
                          {w.wave_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-base font-bold text-foreground">{w.name}</h3>
                            <Badge variant={w.status === 'active' ? 'success' : 'secondary'} className={w.status === 'active' ? 'bg-emerald-bright text-white' : ''}>
                              {w.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {w.status === 'active'
                              ? 'Data pendaftar, pembayaran & seleksi mengacu pada gelombang ini'
                              : 'Gelombang tidak aktif — belum menerima pendaftar'}
                          </p>
                        </div>
                      </div>

                      {canCrud && (
                        <div className="flex items-center gap-1.5">
                          {w.status === 'active' ? (
                            <Button variant="ghost" size="sm" onClick={() => setActionId({ id: w.id, type: 'deactivate' })} className="h-8 gap-1 px-2.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                              <XCircle className="h-4 w-4" /> Nonaktifkan
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => setActionId({ id: w.id, type: 'activate' })} className="h-8 gap-1 bg-emerald-primary px-2.5 text-white hover:bg-emerald-dark shadow-sm">
                              <CheckCircle className="h-4 w-4" /> Aktifkan
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openFeeDialog(w)}
                            title="Rincian Biaya & Diskon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Percent className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)} title="Edit" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingId(w.id)} title="Hapus" className="h-8 w-8 text-rose-danger hover:bg-rose-light">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Metrics grid */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Kuota Formulir
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900 leading-tight">
                          {filled} <span className="text-sm font-medium text-slate-400">/ {w.quota}</span>
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct >= 90 ? 'bg-rose-danger' : 'bg-gradient-to-r from-emerald-primary to-emerald-bright'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {remaining > 0 ? `${remaining} pembayaran tersisa` : 'Penuh'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" /> Biaya Formulir
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-900 leading-tight">
                          {w.registration_fee
                            ? `Rp ${Number(w.registration_fee).toLocaleString('id-ID')}`
                            : 'Gratis'}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Ditarik saat pendaftaran awal</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> Jalur Pendaftaran
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {parseCsv(w.allowed_paths).map((p: string) => (
                            <Badge key={p} variant={p === 'reguler' ? 'info' : 'warning'}>
                              {PATH_LABELS[p] || p}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                          {parseCsv(w.allowed_paths).length} jalur dibuka
                        </p>
                      </div>
                    </div>

                    {/* Timeline strip */}
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-start">
                        {resolved.map((m, i) => (
                          <Fragment key={m.step}>
                            {i > 0 && (
                              <div className={cn(
                                'mx-1 mt-1 h-px flex-1 min-w-[8px]',
                                i <= activeStep ? 'bg-emerald-primary/40' : 'bg-slate-200'
                              )} />
                            )}
                            <div className="flex flex-col items-center gap-1 text-center" style={{ minWidth: 0, flex: 1 }}>
                              <span className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none shadow-sm',
                                m.done
                                  ? 'bg-emerald-primary text-white'
                                  : i === activeStep
                                    ? 'bg-gold-accent text-white'
                                    : 'bg-slate-100 text-slate-400'
                              )}>
                                {m.done ? <Check className="h-3 w-3" /> : i + 1}
                              </span>
                              <span className={cn(
                                'text-[10px] leading-tight px-0.5',
                                m.done || i === activeStep ? 'text-slate-700 font-medium' : 'text-slate-400'
                              )}>
                                {m.label}
                              </span>
                              <span className={cn(
                                'text-[10px] leading-tight whitespace-nowrap px-0.5',
                                m.done || i === activeStep ? 'text-slate-500' : 'text-slate-300'
                              )}>
                                {fmtDateShort(m.get(w))}
                              </span>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Modal Form Tambah / Edit Gelombang */}
      <Dialog open={showForm} onOpenChange={(v: boolean) => { setShowForm(v); if (!v) setFormError(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingWave ? 'Edit Gelombang' : 'Tambah Gelombang'}</DialogTitle>
            <DialogDescription>
              {editingWave
                ? `Ubah konfigurasi ${editingWave.name} pada periode ${period?.name}.`
                : `Konfigurasi gelombang baru untuk periode ${period?.name}. Rincian biaya diatur di panel Rincian Biaya.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-5 pt-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="wave-name">Nama Gelombang *</Label>
              <Input id="wave-name" {...register('name')} placeholder="Contoh: Gelombang 1" disabled={!canCrud} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Jalur Pendaftaran Dibuka *</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PATH_OPTIONS.map(opt => {
                  const active = (allowedPaths || []).includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      disabled={!canCrud}
                      onClick={() => toggleScope('allowed_paths', opt.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {errors.allowed_paths && <p className="text-xs text-red-500">{errors.allowed_paths.message}</p>}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jadwal Pendaftaran</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-start">Tanggal Mulai *</Label>
                  <Input
                    id="wave-start"
                    type="date"
                    min={editingWave ? undefined : todayIso()}
                    {...register('registration_start_date')}
                    disabled={!canCrud}
                  />
                  {errors.registration_start_date && <p className="text-xs text-red-500">{errors.registration_start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-end">Tanggal Akhir *</Label>
                  <Input
                    id="wave-end"
                    type="date"
                    min={startDateWatch ? getNextDayIso(startDateWatch) : getNextDayIso(todayIso())}
                    {...register('registration_end_date')}
                    disabled={!canCrud}
                  />
                  {errors.registration_end_date && <p className="text-xs text-red-500">{errors.registration_end_date.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kuota &amp; Biaya Formulir</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-quota">Kuota Pendaftar *</Label>
                  <Input
                    id="wave-quota"
                    type="number"
                    min={1}
                    {...register('quota', { valueAsNumber: true })}
                    placeholder="Contoh: 100"
                    disabled={!canCrud}
                  />
                  {errors.quota && <p className="text-xs text-red-500">{errors.quota.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-fee1">Biaya Formulir (Rp)</Label>
                  <CurrencyInput
                    id="wave-fee1"
                    value={registrationFee}
                    onValueChange={(v: number) => setValue('registration_fee', v)}
                    placeholder="Contoh: 350.000"
                    disabled={!canCrud}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-early-discount-quota">Kuota Diskon Pendaftar Awal</Label>
                  <Input
                    id="wave-early-discount-quota"
                    type="number"
                    min={0}
                    {...register('early_discount_quota', { valueAsNumber: true })}
                    placeholder="0 = tidak ada"
                    disabled={!canCrud}
                  />
                  {errors.early_discount_quota && <p className="text-xs text-red-500">{errors.early_discount_quota.message}</p>}
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    * Dihitung dari {'{x}'} pembayaran formulir pertama yang berhasil.
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <Alert type="error" title="Periksa kembali data Anda">{formError}</Alert>
            )}

            {canCrud && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Hapus Gelombang"
        message="Apakah Anda yakin ingin menghapus gelombang ini secara permanen?"
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={!!actionId}
        onClose={() => setActionId(null)}
        title={actionId?.type === 'activate' ? 'Aktifkan Gelombang' : 'Nonaktifkan Gelombang'}
        message={actionId?.type === 'activate' ? 'Mengaktifkan gelombang ini akan menonaktifkan gelombang lain yang sedang aktif.' : 'Apakah Anda yakin ingin menonaktifkan gelombang ini?'}
        onConfirm={handleAction}
        confirmLabel="Ya, Lanjutkan"
        variant={actionId?.type === 'activate' ? 'primary' : 'destructive'}
      />

      {/* ===================================================================== */}
      {/* DIALOG RINCIAN BIAYA & DISKON (3 TAB) */}
      {/* ===================================================================== */}
      <Dialog open={!!feeDialogWave} onOpenChange={(v: boolean) => !v && setFeeDialogWave(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <DialogTitle className="text-lg">
                Rincian Biaya &amp; Diskon — {feeDialogWave?.name}
              </DialogTitle>
            </div>
            <DialogDescription>
              Kelola komponen biaya pendidikan, diskon reguler gelombang, diskon tambahan untuk pendaftar awal, dan simulasi perhitungan biaya.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mt-2 gap-1">
            <button
              type="button"
              onClick={() => setFeeActiveTab('components')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
                feeActiveTab === 'components'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              1. Komponen Biaya
            </button>
            <button
              type="button"
              onClick={() => setFeeActiveTab('early_discount')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
                feeActiveTab === 'early_discount'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              2. Diskon Awal
            </button>
            <button
              type="button"
              onClick={() => setFeeActiveTab('engine')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
                feeActiveTab === 'engine'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Calculator className="h-3.5 w-3.5" />
              3. Hitung Biaya
            </button>
          </div>

          <div className="pt-3">
            {/* --------------------------------------------------------------- */}
            {/* TAB 1: KOMPONEN & DISKON REGULER */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'components' && (
              <div className="space-y-5">
                {/* Minimal DP Setting Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      Minimal DP Pendaftaran Ulang
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Batas minimal pembayaran uang muka (DP) pertama yang wajib dilunasi pendaftar gelombang ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CurrencyInput
                      value={feeWaveMinimumDp}
                      onValueChange={setFeeWaveMinimumDp}
                      placeholder="Contoh: 1.000.000"
                      className="w-36 sm:w-44 bg-white"
                      disabled={!canCrud || savingMinimumDp}
                    />
                    {canCrud && (
                      <Button
                        size="sm"
                        onClick={handleSaveMinimumDp}
                        disabled={savingMinimumDp}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingMinimumDp ? 'Menyimpan...' : 'Simpan DP'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Form Tambah/Edit Komponen */}
                {canCrud && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {editingFeeItem ? 'Edit Komponen Biaya' : 'Tambah Komponen Biaya Baru'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nama Komponen *</Label>
                        <Input
                          value={newFeeName}
                          onChange={(e) => setNewFeeName(e.target.value)}
                          placeholder="Misal: Uang Gedung / DP3"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nominal Normal (Rp) *</Label>
                        <CurrencyInput
                          value={newFeeNominal}
                          onValueChange={setNewFeeNominal}
                          placeholder="Misal: 5.000.000"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Deskripsi / Keterangan</Label>
                        <Input
                          value={newFeeDescription}
                          onChange={(e) => setNewFeeDescription(e.target.value)}
                          placeholder="Opsional: Misal fasilitas santri"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Diskon Reguler Gelombang</Label>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                          value={feeDiscountType}
                          onChange={(e) => setFeeDiscountType(e.target.value as '' | 'percent' | 'nominal')}
                        >
                          <option value="">Tanpa Diskon Reguler</option>
                          <option value="percent">Persentase (%)</option>
                          <option value="nominal">Nominal Rupiah (Rp)</option>
                        </select>
                      </div>
                      {feeDiscountType && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {feeDiscountType === 'percent' ? 'Besaran Diskon (%)' : 'Besaran Diskon (Rp)'}
                          </Label>
                          {feeDiscountType === 'percent' ? (
                            <Input
                              type="number"
                              min={0.01}
                              max={100}
                              step="0.01"
                              value={feeDiscountValue || ''}
                              onChange={(e) => setFeeDiscountValue(Number(e.target.value))}
                              className="bg-white"
                            />
                          ) : (
                            <CurrencyInput
                              value={feeDiscountValue}
                              onValueChange={setFeeDiscountValue}
                              placeholder="Nominal diskon"
                              className="bg-white"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      {editingFeeItem ? (
                        <>
                          <Button variant="outline" size="sm" onClick={resetFeeItemForm}>Batal</Button>
                          <Button size="sm" onClick={() => handleEditFeeItem(editingFeeItem)} disabled={!newFeeName.trim() || newFeeNominal <= 0}>
                            Simpan Perubahan
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={handleAddFeeItem} disabled={!newFeeName.trim() || newFeeNominal <= 0} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Plus className="h-4 w-4" /> Tambah Komponen
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabel Komponen */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center">No</TableHead>
                        <TableHead>Komponen</TableHead>
                        <TableHead>Biaya Normal</TableHead>
                        <TableHead>Potongan</TableHead>
                        <TableHead>Diskon Reguler</TableHead>
                        <TableHead className="w-20 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                            Belum ada komponen biaya yang ditambahkan untuk gelombang ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const regDisc = calcRegularDiscount(item)
                          const regNet = calcRegularNet(item)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                              <TableCell>
                                <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700">
                                Rp {Number(item.nominal).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {item.discount_type ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {item.discount_type === 'percent'
                                      ? `${item.discount_value}% (Rp ${regDisc.toLocaleString('id-ID')})`
                                      : `Rp ${Number(item.discount_value).toLocaleString('id-ID')}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-900">
                                Rp {regNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                                    onClick={() => startEditFeeItem(item)}
                                    title="Edit Komponen"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                    onClick={() => handleDeleteFeeItem(item.id)}
                                    title="Hapus Komponen"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 2: DISKON PENDAFTAR PERTAMA */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'early_discount' && (
              <div className="space-y-4">
                {/* Banner Info Kuota Pendaftar Awal */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-900">
                      Diskon Khusus {feeDialogWave?.early_discount_quota || 0} Pendaftar Pertama
                    </p>
                    <p className="text-amber-800">
                      Diskon ini dihitung dari <strong>sisa biaya setelah diskon reguler</strong>. Calon santri yang masuk dalam kuota awal akan mendapatkan diskon dobel (Diskon Reguler Gelombang + Diskon Tambahan Pendaftar Awal).
                    </p>
                    {!(feeDialogWave?.early_discount_quota > 0) && (
                      <p className="font-semibold text-rose-700 pt-1">
                        * Perhatian: Kuota pendaftar awal saat ini 0. Harap atur kuota diskon pendaftar awal pada gelombang terlebih dahulu.
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Diskon Tambahan Pendaftar Awal Inline */}
                {earlyEditingItem && (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-950">
                        Atur Diskon Pendaftar Awal: <span className="text-emerald-700">{earlyEditingItem.name}</span>
                      </p>
                      <span className="text-[11px] text-slate-500">
                        Diskon Reguler: Rp {calcRegularNet(earlyEditingItem).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipe Diskon Tambahan</Label>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                          value={earlyDiscountType}
                          onChange={(e) => setEarlyDiscountType(e.target.value as '' | 'percent' | 'nominal')}
                        >
                          <option value="">Tanpa Diskon Tambahan</option>
                          <option value="percent">Persentase (%) dari Sisa Reguler</option>
                          <option value="nominal">Nominal Rupiah (Rp)</option>
                        </select>
                      </div>
                      {earlyDiscountType && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {earlyDiscountType === 'percent' ? 'Nilai Persentase (%)' : 'Nilai Potongan (Rp)'}
                          </Label>
                          {earlyDiscountType === 'percent' ? (
                            <Input
                              type="number"
                              min={0.01}
                              max={100}
                              step="0.01"
                              value={earlyDiscountValue || ''}
                              onChange={(e) => setEarlyDiscountValue(Number(e.target.value))}
                              className="bg-white"
                            />
                          ) : (
                            <CurrencyInput
                              value={earlyDiscountValue}
                              onValueChange={setEarlyDiscountValue}
                              placeholder="Nominal potongan"
                              className="bg-white"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                      <Button variant="outline" size="sm" onClick={() => setEarlyEditingItem(null)}>Batal</Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEarlyDiscount(earlyEditingItem)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Simpan Diskon Pendaftar Awal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabel Diskon Pendaftar Awal */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center">No</TableHead>
                        <TableHead>Komponen</TableHead>
                        <TableHead>Diskon Reguler</TableHead>
                        <TableHead>Diskon Awal</TableHead>
                        <TableHead>Pendaftar Awal</TableHead>
                        <TableHead className="w-20 text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                            Belum ada komponen biaya. Tambahkan komponen di Tab 1 terlebih dahulu.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const regNet = calcRegularNet(item)
                          const earlyDisc = calcEarlyDiscount(item)
                          const earlyNet = calcEarlyNet(item)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                              <TableCell>
                                <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700">
                                Rp {regNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {item.early_discount_type ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {item.early_discount_type === 'percent'
                                      ? `+${item.early_discount_value}% (Rp ${earlyDisc.toLocaleString('id-ID')})`
                                      : `+Rp ${Number(item.early_discount_value).toLocaleString('id-ID')}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">— (Sama dgn Reguler)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-emerald-700">
                                Rp {earlyNet.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEarlyEditingItem(item)
                                    setEarlyDiscountType(item.early_discount_type || '')
                                    setEarlyDiscountValue(Number(item.early_discount_value || 0))
                                  }}
                                  className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                                >
                                  <Edit className="h-3 w-3 mr-1" /> Set
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 3: MESIN PERHITUNGAN BIAYA (TABEL KOMPARASI LENGKAP) */}
            {/* --------------------------------------------------------------- */}
            {feeActiveTab === 'engine' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold text-slate-700">
                      Simulasi Perhitungan Biaya
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Kuota Awal: {feeDialogWave?.early_discount_quota || 0} Santri
                  </Badge>
                </div>

                {/* Tabel Simpel 5 Kolom: No, Komponen, Biaya Normal, Diskon Reguler, Pendaftar Awal */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10 text-center font-bold text-xs">No</TableHead>
                        <TableHead className="font-bold text-xs">Komponen</TableHead>
                        <TableHead className="text-right font-bold text-xs">Biaya Normal</TableHead>
                        <TableHead className="text-right font-bold text-xs bg-slate-100/50">Diskon Reguler</TableHead>
                        <TableHead className="text-right font-bold text-xs text-emerald-950 bg-emerald-50/60">
                          {feeDialogWave?.early_discount_quota ? `{${feeDialogWave.early_discount_quota}} ` : ''}Pendaftar Awal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                            Belum ada data komponen biaya.
                          </TableCell>
                        </TableRow>
                      ) : (
                        feeItems.map((item, idx) => {
                          const nom = Number(item.nominal) || 0
                          const regDisc = calcRegularDiscount(item)
                          const regNet = calcRegularNet(item)
                          const earlyDisc = calcEarlyDiscount(item)
                          const earlyNet = calcEarlyNet(item)
                          return (
                            <TableRow key={item.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-center text-xs text-slate-400 font-medium">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                                {item.description && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs font-medium text-slate-600">
                                Rp {nom.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-right text-xs bg-slate-50/60">
                                <p className="font-bold text-slate-900">
                                  Rp {regNet.toLocaleString('id-ID')}
                                </p>
                                {regDisc > 0 && (
                                  <p className="text-[10px] text-emerald-600 font-medium">
                                    Diskon Rp {regDisc.toLocaleString('id-ID')}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs bg-emerald-50/40">
                                <p className="font-extrabold text-emerald-800">
                                  Rp {earlyNet.toLocaleString('id-ID')}
                                </p>
                                {earlyDisc > 0 && (
                                  <p className="text-[10px] text-amber-700 font-medium">
                                    Diskon Rp {earlyDisc.toLocaleString('id-ID')}
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>

                    {/* Baris Total Simpel */}
                    {feeItems.length > 0 && (
                      <tfoot>
                        <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <TableCell colSpan={2} className="text-xs uppercase tracking-wider text-slate-800 font-extrabold py-3">
                            TOTAL BAYAR
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-700 py-3">
                            <p>Rp {engineTotals.totalGross.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-slate-500 font-normal">Normal</p>
                          </TableCell>
                          <TableCell className="text-right text-xs font-extrabold text-slate-900 bg-slate-200/50 py-3">
                            <p>Rp {engineTotals.totalRegNet.toLocaleString('id-ID')}</p>
                            {engineTotals.totalRegDiscount > 0 ? (
                              <p className="text-[10px] text-emerald-700 font-medium">
                                Hemat Rp {engineTotals.totalRegDiscount.toLocaleString('id-ID')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-normal">Tanpa diskon</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-black text-emerald-800 bg-emerald-100/70 py-3">
                            <p>Rp {engineTotals.totalEarlyNet.toLocaleString('id-ID')}</p>
                            {engineTotals.totalEarlyCombinedDiscount > 0 ? (
                              <p className="text-[10px] text-emerald-800 font-medium">
                                Hemat Rp {engineTotals.totalEarlyCombinedDiscount.toLocaleString('id-ID')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-normal">Tanpa diskon</p>
                            )}
                          </TableCell>
                        </TableRow>
                      </tfoot>
                    )}
                  </Table>
                </div>

                {/* 3 Ringkasan Kartu: Biaya Normal, Diskon Reguler, Pendaftar Awal */}
                {feeItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Biaya Normal
                      </p>
                      <p className="text-lg font-extrabold text-slate-900">
                        Rp {engineTotals.totalGross.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Total seluruh komponen tanpa diskon
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Diskon Reguler
                      </p>
                      <p className="text-lg font-extrabold text-emerald-900">
                        Rp {engineTotals.totalRegNet.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Total bayar (Hemat Rp {engineTotals.totalRegDiscount.toLocaleString('id-ID')})
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-600" />
                        {feeDialogWave?.early_discount_quota ? `{${feeDialogWave.early_discount_quota}} ` : ''}Pendaftar Awal
                      </p>
                      <p className="text-lg font-extrabold text-amber-950">
                        Rp {engineTotals.totalEarlyNet.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Total bayar (Hemat Rp {engineTotals.totalEarlyCombinedDiscount.toLocaleString('id-ID')})
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
