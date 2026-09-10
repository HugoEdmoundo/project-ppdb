import { useState } from 'react'
import { ppdbService } from '@/services'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, ConfirmDialog, Sheet, SheetContent, SheetHeader, SheetTitle,
  EmptyState, Alert, CurrencyInput
} from '@/components/ui'
import { TableSkeletonRows } from "@/components/ui"
import { Plus, Edit, Trash2, CheckCircle, XCircle, Waves, DollarSign, Receipt } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
  registration_fee: z.number().min(0, 'Biaya tidak boleh negatif'),
}).refine(data => data.registration_end_date >= data.registration_start_date, {
  message: "Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai pendaftaran",
  path: ["registration_end_date"],
}).refine(data => data.document_upload_end_date >= data.registration_end_date, {
  message: "Batas upload dokumen tidak boleh sebelum tanggal akhir pendaftaran",
  path: ["document_upload_end_date"],
}).refine(data => data.selection_date >= data.document_upload_end_date, {
  message: "Jadwal seleksi tidak boleh sebelum batas upload dokumen",
  path: ["selection_date"],
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
  registration_fee: 0,
})

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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<WaveFormData>({
    resolver: zodResolver(waveSchema),
    defaultValues: emptyWaveForm()
  })

  const colCount = canCrud ? 8 : 7

  const [feeDialogWave, setFeeDialogWave] = useState<any>(null)
  const [feeItems, setFeeItems] = useState<any[]>([])
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeNominal, setNewFeeNominal] = useState(0)

  const openFeeDialog = async (w: any) => {
    setFeeDialogWave(w)
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
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items`, {
        method: 'POST',
        body: JSON.stringify({ name: newFeeName, nominal: newFeeNominal })
      })
      setNewFeeName('')
      setNewFeeNominal(0)
      fetchFeeItems(feeDialogWave.id)
    } catch (e: any) {
      toast('error', e.message || 'Gagal menambah item biaya')
    }
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
      registration_fee: w.registration_fee ?? 0,
    })
    setFormError(null)
    setShowForm(true)
  }

  const toggleScope = (key: 'allowed_paths' | 'allowed_levels', value: string) => {
    const list = watch(key)
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
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['waves', period.id] })
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
      queryClient.invalidateQueries({ queryKey: ['waves', period.id] })
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
      queryClient.invalidateQueries({ queryKey: ['waves', period.id] })
    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} gelombang`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <Sheet open={!!period} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Gelombang — {period?.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Daftar Gelombang</h3>
            {canCrud && (
              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12">Gel.</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Waktu Daftar</TableHead>
                  <TableHead>Waktu Lainnya</TableHead>
                  <TableHead>Kuota</TableHead>
                  <TableHead>Status</TableHead>
                  {canCrud && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeletonRows cols={colCount} rows={4} />
                ) : waves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="py-8">
                      <EmptyState
                        icon={Waves}
                        title="Belum Ada Gelombang"
                        description="Tambahkan gelombang pendaftaran untuk periode ini."
                        className="bg-transparent border-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  waves.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold text-center">{w.wave_number}</TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {parseCsv(w.allowed_paths).map((p: string) => (
                            <Badge key={p} variant={p === 'reguler' ? 'info' : 'warning'}>
                              {PATH_LABELS[p] || p}
                            </Badge>
                          ))}
                          {parseCsv(w.allowed_levels).map((l: string) => (
                            <Badge key={l} variant="gold">{l}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(w.registration_start_date).toLocaleDateString('id-ID')} <br/>
                        <span className="text-muted-foreground">s/d</span> <br/>
                        {new Date(w.registration_end_date).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        Upload: {new Date(w.document_upload_end_date).toLocaleDateString('id-ID')} <br/>
                        Seleksi: {new Date(w.selection_date).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>{w.quota}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'active' ? 'success' : 'secondary'} className={w.status === 'active' ? 'bg-emerald-bright text-white' : ''}>
                          {w.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      {canCrud && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {w.status === 'active' ? (
                              <Button variant="ghost" size="icon" onClick={() => setActionId({ id: w.id, type: 'deactivate' })} title="Nonaktifkan" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => setActionId({ id: w.id, type: 'activate' })} title="Aktifkan" className="h-8 w-8 text-emerald-primary hover:text-emerald-dark hover:bg-emerald-light">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEdit(w)} title="Edit" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openFeeDialog(w)} title="Item Biaya" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingId(w.id)} title="Hapus" className="h-8 w-8 text-rose-danger hover:text-rose-danger hover:bg-rose-light">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
                    const active = (watch('allowed_paths') || []).includes(opt.value)
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
                    const active = (watch('allowed_levels') || []).includes(lvl)
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-quota">Kuota *</Label>
                  <Input id="wave-quota" type="number" min={1} {...register('quota', { valueAsNumber: true })} placeholder="Contoh: 100" disabled={!canCrud} />
                  {errors.quota && <p className="text-xs text-red-500">{errors.quota.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-fee1">Biaya Formulir</Label>
                  <CurrencyInput id="wave-fee1" value={watch('registration_fee')}
                    onValueChange={(v: number) => setValue('registration_fee', v)}
                    placeholder="Contoh: 350.000" disabled={!canCrud} />
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Item Biaya Tahap 2</h3>

              <div className="flex gap-2 items-end">
                <div className="space-y-1.5 flex-1">
                  <Label>Nama Item</Label>
                  <Input value={newFeeName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFeeName(e.target.value)} placeholder="Misal: SPP Bulan Juli" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>Nominal (Rp)</Label>
                  <CurrencyInput value={newFeeNominal} onValueChange={setNewFeeNominal} placeholder="Misal: 500000" />
                </div>
                <Button onClick={handleAddFeeItem} disabled={!newFeeName || newFeeNominal <= 0} className="mb-0.5">Tambah</Button>
              </div>

              <div className="rounded-md border mt-3">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nama Item</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">Belum ada item biaya.</TableCell>
                      </TableRow>
                    ) : (
                      feeItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>Rp {item.nominal.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right">
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
