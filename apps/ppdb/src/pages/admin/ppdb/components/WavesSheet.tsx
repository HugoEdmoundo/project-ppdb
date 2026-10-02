import { useState, Fragment } from 'react'
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
import { Plus, Edit, Trash2, CheckCircle, XCircle, Waves, DollarSign, Receipt, Check, Users, Banknote, Layers } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const PATH_OPTIONS = [
  { value: 'reguler', label: 'Reguler' },
  { value: 'pindahan', label: 'Pindahan' },
]
const LEVEL_OPTIONS = ['SMP', 'SMK']
const PATH_LABELS: Record<string, string> = { reguler: 'Reguler', pindahan: 'Pindahan' }

const parseCsv = (v?: string | null): string[] =>
  (v || '').split(',').map(s => s.trim()).filter(Boolean)

const waveSchema = z.object({
  name: z.string().min(1, 'Nama gelombang wajib diisi'),
  allowed_paths: z.array(z.string()).min(1, 'Pilih minimal satu jalur pendaftaran'),
  allowed_levels: z.array(z.string()).min(1, 'Pilih minimal satu jenjang'),
  registration_start_date: z.string().min(1, 'Tanggal mulai pendaftaran wajib diisi'),
  registration_end_date: z.string().min(1, 'Tanggal akhir pendaftaran wajib diisi'),
  document_upload_end_date: z.string().min(1, 'Batas upload dokumen wajib diisi'),
  selection_date: z.string().min(1, 'Jadwal seleksi wajib diisi'),
  quota: z.number().min(1, 'Kuota harus diisi minimal 1'),
  early_discount_quota: z.number().min(0, 'Jumlah harus nol atau lebih'),
  registration_fee: z.number().min(0, 'Biaya tidak boleh negatif'),
  second_stage_fee: z.number().min(0, 'Biaya tidak boleh negatif'),
  minimum_dp: z.number().min(0, 'Minimal DP tidak boleh negatif'),
}).refine(data => data.registration_end_date >= data.registration_start_date, {
  message: "Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai pendaftaran",
  path: ["registration_end_date"],
}).refine(data => data.document_upload_end_date >= data.registration_end_date, {
  message: "Batas upload dokumen tidak boleh sebelum tanggal akhir pendaftaran",
  path: ["document_upload_end_date"],
}).refine(data => data.selection_date >= data.document_upload_end_date, {
  message: "Jadwal seleksi tidak boleh sebelum batas upload dokumen",
  path: ["selection_date"],
}).refine(data => data.early_discount_quota <= data.quota, {
  message: 'Jumlah diskon pendaftar awal tidak boleh melebihi kuota',
  path: ['early_discount_quota'],
});

type WaveFormData = z.infer<typeof waveSchema>;

const emptyWaveForm = (): WaveFormData => ({
  name: '',
  allowed_paths: ['reguler', 'pindahan'],
  allowed_levels: ['SMP', 'SMK'],
  registration_start_date: '',
  registration_end_date: '',
  document_upload_end_date: '',
  selection_date: '',
  quota: 0,
  early_discount_quota: 0,
  registration_fee: 0,
  second_stage_fee: 0,
  minimum_dp: 0,
})

const fmtDateShort = (d: string): string =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

const localIso = (d: string): string => {
  const dt = new Date(d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

const todayIso = (): string => localIso(new Date().toString())

const WAVE_MILESTONES: { step: string; label: string; get: (w: any) => string }[] = [
  { step: 'registration_start_date', label: 'Mulai Daftar', get: (w) => w.registration_start_date },
  { step: 'registration_end_date', label: 'Akhir Daftar', get: (w) => w.registration_end_date },
  { step: 'document_upload_end_date', label: 'Upload Dok', get: (w) => w.document_upload_end_date },
  { step: 'selection_date', label: 'Seleksi', get: (w) => w.selection_date },
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

  // Subscribe ke field yang dirender sebagai tombol toggle — pakai useWatch
  // (bukan watch()) agar kompatibel dengan React Compiler.
  const allowedPaths = useWatch({ control, name: 'allowed_paths' }) ?? []
  const allowedLevels = useWatch({ control, name: 'allowed_levels' }) ?? []
  const registrationFee = useWatch({ control, name: 'registration_fee' })
  const secondStageFee = useWatch({ control, name: 'second_stage_fee' })
  const minimumDp = useWatch({ control, name: 'minimum_dp' })

  const [feeDialogWave, setFeeDialogWave] = useState<any>(null)
  const [feeItems, setFeeItems] = useState<any[]>([])
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeNominal, setNewFeeNominal] = useState(0)
  const [feeDiscountType, setFeeDiscountType] = useState<'' | 'percent' | 'nominal'>('')
  const [feeDiscountValue, setFeeDiscountValue] = useState(0)
  const [feeDiscountScope, setFeeDiscountScope] = useState<'all' | 'first_x'>('all')
  const [editingFeeItem, setEditingFeeItem] = useState<any>(null)

  const openFeeDialog = async (w: any) => {
    setFeeDialogWave(w)
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

  const handleAddFeeItem = async () => {
    if (!newFeeName || newFeeNominal <= 0) return
    if (feeDiscountType && (feeDiscountValue <= 0 || (feeDiscountType === 'percent' && feeDiscountValue > 100))) {
      toast('error', 'Nilai diskon harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    if (feeDiscountType && feeDiscountScope === 'first_x' && !(feeDialogWave?.early_discount_quota > 0)) {
      toast('error', 'Atur jumlah pendaftar awal pada form gelombang terlebih dahulu')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items`, {
        method: 'POST',
        body: JSON.stringify({ name: newFeeName, nominal: newFeeNominal,
          order_index: 0,
          discount_type: feeDiscountType || null,
          discount_value: feeDiscountType ? feeDiscountValue : null,
          discount_scope: feeDiscountType ? feeDiscountScope : 'all' })
      })
      setNewFeeName('')
      setNewFeeNominal(0)
      setFeeDiscountType('')
      setFeeDiscountValue(0)
      setFeeDiscountScope('all')
      fetchFeeItems(feeDialogWave.id)
    } catch (e: any) {
      toast('error', e.message || 'Gagal menambah item biaya')
    }
  }

  const handleEditFeeItem = async (item: any) => {
    if (!newFeeName || newFeeNominal <= 0) return
    if (feeDiscountType && (feeDiscountValue <= 0 || (feeDiscountType === 'percent' && feeDiscountValue > 100))) {
      toast('error', 'Nilai diskon harus lebih dari 0 dan persentase maksimal 100%')
      return
    }
    if (feeDiscountType && feeDiscountScope === 'first_x' && !(feeDialogWave?.early_discount_quota > 0)) {
      toast('error', 'Atur jumlah pendaftar awal pada form gelombang terlebih dahulu')
      return
    }
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newFeeName, nominal: newFeeNominal,
          order_index: item.order_index || 0,
          discount_type: feeDiscountType || null,
          discount_value: feeDiscountType ? feeDiscountValue : null,
          discount_scope: feeDiscountType ? feeDiscountScope : 'all' })
      })
      setEditingFeeItem(null)
      setNewFeeName('')
      setNewFeeNominal(0)
      setFeeDiscountType('')
      setFeeDiscountValue(0)
      setFeeDiscountScope('all')
      fetchFeeItems(feeDialogWave.id)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memperbarui item biaya')
    }
  }

  const startEditFeeItem = (item: any) => {
    setEditingFeeItem(item)
    setNewFeeName(item.name)
    setNewFeeNominal(Number(item.nominal))
    setFeeDiscountType(item.discount_type || '')
    setFeeDiscountValue(Number(item.discount_value || 0))
    setFeeDiscountScope(item.discount_scope || 'all')
  }

  const resetFeeItemForm = () => {
    setEditingFeeItem(null)
    setNewFeeName('')
    setNewFeeNominal(0)
    setFeeDiscountType('')
    setFeeDiscountValue(0)
    setFeeDiscountScope('all')
  }

  const handleDeleteFeeItem = async (id: string) => {
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${id}`, { method: 'DELETE' })
      fetchFeeItems(feeDialogWave.id)
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus item biaya')
    }
  }

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
      allowed_levels: parseCsv(w.allowed_levels),
      registration_start_date: (w.registration_start_date || '').split('T')[0],
      registration_end_date: (w.registration_end_date || '').split('T')[0],
      document_upload_end_date: (w.document_upload_end_date || '').split('T')[0],
      selection_date: (w.selection_date || '').split('T')[0],
      quota: w.quota ?? 0,
      early_discount_quota: w.early_discount_quota ?? 0,
      registration_fee: w.registration_fee ?? 0,
      second_stage_fee: w.second_stage_fee ?? 0,
      minimum_dp: w.minimum_dp ?? 0,
    })
    setFormError(null)
    setShowForm(true)
  }

  const toggleScope = (key: 'allowed_paths' | 'allowed_levels', value: string) => {
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
      allowed_levels: data.allowed_levels.join(','),
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
                          <Button variant="ghost" size="icon" onClick={() => openFeeDialog(w)} title="Item Biaya" className="h-8 w-8 text-primary hover:bg-primary/10">
                            <DollarSign className="h-4 w-4" />
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
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Kuota Pembayaran Formulir</p>
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
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Biaya Formulir</p>
                        <p className="mt-1 text-lg font-bold text-slate-900 leading-tight">
                          {w.registration_fee
                            ? `Rp ${Number(w.registration_fee).toLocaleString('id-ID')}`
                            : 'Gratis'}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Ditarik saat pendaftar terdaftar</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Jalur & Jenjang</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {parseCsv(w.allowed_paths).map((p: string) => (
                            <Badge key={p} variant={p === 'reguler' ? 'info' : 'warning'}>
                              {PATH_LABELS[p] || p}
                            </Badge>
                          ))}
                          {parseCsv(w.allowed_levels).map((l: string) => (
                            <Badge key={l} variant="gold">{l}</Badge>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                          {parseCsv(w.allowed_paths).length} jalur · {parseCsv(w.allowed_levels).length} jenjang
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

      <Dialog open={showForm} onOpenChange={(v: boolean) => { setShowForm(v); if (!v) setFormError(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingWave ? 'Edit Gelombang' : 'Tambah Gelombang'}</DialogTitle>
            <DialogDescription>
              {editingWave
                ? `Ubah detail ${editingWave.name} pada periode ${period?.name}.`
                : `Nomor gelombang diisi otomatis untuk periode ${period?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-5 pt-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="wave-name">Nama Gelombang *</Label>
              <Input id="wave-name" {...register('name')} placeholder="Contoh: Gelombang 1" disabled={!canCrud} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jalur Pendaftaran *</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PATH_OPTIONS.map(opt => {
                    const active = (allowedPaths || []).includes(opt.value)
                    return (
                      <button key={opt.value} type="button" aria-pressed={active} disabled={!canCrud}
                        onClick={() => toggleScope('allowed_paths', opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {errors.allowed_paths && <p className="text-xs text-red-500">{errors.allowed_paths.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jenjang *</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {LEVEL_OPTIONS.map(lvl => {
                    const active = (allowedLevels || []).includes(lvl)
                    return (
                      <button key={lvl} type="button" aria-pressed={active} disabled={!canCrud}
                        onClick={() => toggleScope('allowed_levels', lvl)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                        {lvl}
                      </button>
                    )
                  })}
                </div>
                {errors.allowed_levels && <p className="text-xs text-red-500">{errors.allowed_levels.message}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jadwal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-start">Tanggal Mulai Pendaftaran *</Label>
                  <Input id="wave-start" type="date" {...register('registration_start_date')} disabled={!canCrud} />
                  {errors.registration_start_date && <p className="text-xs text-red-500">{errors.registration_start_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-end">Tanggal Akhir Pendaftaran *</Label>
                  <Input id="wave-end" type="date" {...register('registration_end_date')} disabled={!canCrud} />
                  {errors.registration_end_date && <p className="text-xs text-red-500">{errors.registration_end_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-upload">Batas Upload Dokumen *</Label>
                  <Input id="wave-upload" type="date" {...register('document_upload_end_date')} disabled={!canCrud} />
                  {errors.document_upload_end_date && <p className="text-xs text-red-500">{errors.document_upload_end_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-selection">Jadwal Seleksi *</Label>
                  <Input id="wave-selection" type="date" {...register('selection_date')} disabled={!canCrud} />
                  {errors.selection_date && <p className="text-xs text-red-500">{errors.selection_date.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kuota &amp; Biaya</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-quota">Kuota *</Label>
                  <Input id="wave-quota" type="number" min={1} {...register('quota', { valueAsNumber: true })} placeholder="Contoh: 100" disabled={!canCrud} />
                  {errors.quota && <p className="text-xs text-red-500">{errors.quota.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-fee1">Biaya Formulir</Label>
                  <CurrencyInput id="wave-fee1" value={registrationFee}
                    onValueChange={(v: number) => setValue('registration_fee', v)}
                    placeholder="Contoh: 350.000" disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-fee2">Biaya Daftar Ulang (Tahap 2)</Label>
                  <CurrencyInput id="wave-fee2" value={secondStageFee}
                    onValueChange={(v: number) => setValue('second_stage_fee', v)}
                    placeholder="Contoh: 2.500.000" disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-early-discount-quota">Kuota diskon pendaftar awal</Label>
                  <Input id="wave-early-discount-quota" type="number" min={0} {...register('early_discount_quota', { valueAsNumber: true })} placeholder="0 = tidak ada" disabled={!canCrud} />
                  {errors.early_discount_quota && <p className="text-xs text-red-500">{errors.early_discount_quota.message}</p>}
                  <p className="text-xs text-muted-foreground">Dihitung dari pembayaran formulir yang berhasil.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-minimum-dp">Minimal DP</Label>
                  <CurrencyInput id="wave-minimum-dp" value={minimumDp}
                    onValueChange={(v: number) => setValue('minimum_dp', v)}
                    placeholder="Contoh: 1.000.000" disabled={!canCrud} />
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

      <Dialog open={!!feeDialogWave} onOpenChange={(v: boolean) => !v && setFeeDialogWave(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Biaya Daftar Ulang (Tahap 2) - {feeDialogWave?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Diskon mengikuti komponen biaya. Diskon dengan cakupan pendaftar awal hanya berlaku untuk X pembayaran formulir sukses pertama sesuai kuota pada gelombang.
            </p>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Item Biaya Tahap 2</h3>

              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
                <div className="space-y-1.5 flex-1">
                  <Label>Nama Item</Label>
                  <Input value={newFeeName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFeeName(e.target.value)} placeholder="Misal: SPP Bulan Juli" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>Nominal (Rp)</Label>
                  <CurrencyInput value={newFeeNominal} onValueChange={setNewFeeNominal} placeholder="Misal: 500000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Diskon Komponen</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={feeDiscountType} onChange={e => setFeeDiscountType(e.target.value as '' | 'percent' | 'nominal')}>
                    <option value="">Tanpa diskon</option><option value="percent">Persentase</option><option value="nominal">Nominal rupiah</option>
                  </select>
                </div>
                {feeDiscountType && <div className="space-y-1.5">
                  <Label>{feeDiscountType === 'percent' ? 'Diskon (%)' : 'Diskon (Rp)'}</Label>
                  {feeDiscountType === 'percent'
                    ? <Input type="number" min={0.01} max={100} step="0.01" value={feeDiscountValue || ''} onChange={e => setFeeDiscountValue(Number(e.target.value))} />
                    : <CurrencyInput value={feeDiscountValue} onValueChange={setFeeDiscountValue} placeholder="Nominal diskon" />}
                </div>}
                {feeDiscountType && <div className="space-y-1.5">
                  <Label>Berlaku untuk</Label>
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={feeDiscountScope} onChange={e => setFeeDiscountScope(e.target.value as 'all' | 'first_x')}>
                    <option value="all">Semua pendaftar</option><option value="first_x">Pendaftar awal sesuai kuota diskon</option>
                  </select>
                </div>}
                <div className="flex gap-2 sm:col-span-2">
                  {editingFeeItem ? <Button onClick={() => handleEditFeeItem(editingFeeItem)} disabled={!newFeeName || newFeeNominal <= 0}>Simpan Perubahan</Button> : <Button onClick={handleAddFeeItem} disabled={!newFeeName || newFeeNominal <= 0}>Tambah Item</Button>}
                  {editingFeeItem && <Button variant="outline" onClick={resetFeeItemForm}>Batal</Button>}
                </div>
              </div>

              <div className="rounded-md border mt-3">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nama Item</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Diskon Gelombang</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">Belum ada item biaya.</TableCell>
                      </TableRow>
                    ) : (
                      feeItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>Rp {item.nominal.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-xs">
                            {item.discount_type ? `${item.discount_type === 'percent' ? `${item.discount_value}%` : `Rp ${Number(item.discount_value).toLocaleString('id-ID')}`} · ${item.discount_scope === 'first_x' ? 'Pendaftar awal' : 'Semua pendaftar'}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditFeeItem(item)} disabled={item.has_bills} title={item.has_bills ? 'Item dengan tagihan tidak bisa diedit' : 'Edit item'}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteFeeItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
