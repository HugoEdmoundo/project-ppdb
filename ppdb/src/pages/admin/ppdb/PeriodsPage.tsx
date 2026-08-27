import React, { useState, useEffect } from 'react'
import { ppdbService } from '@/services'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import {
  Card, CardContent,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, ConfirmDialog, Sheet, SheetContent, SheetHeader, SheetTitle,
  EmptyState, Alert, CurrencyInput
} from '@/components/ui'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { Plus, Edit, Trash2, CalendarDays, CheckCircle, XCircle, Layers, CalendarX2, Waves, DollarSign, Receipt } from 'lucide-react'

export default function PeriodsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')

  // -- Periods State --
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)
  
  // Waves Sheet
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null)

  const [formData, setFormData] = useState({ name: '', academic_year: '', description: '' })

  const fetchPeriods = async () => {
    setLoading(true)
    try {
      const res = await ppdbService.getPeriods({ perPage: 100 }) // Fetch all for simplicity
      setPeriods(res.data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat periode')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeriods()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCrud) return
    try {
      if (editingPeriod) {
        await ppdbService.updatePeriod(editingPeriod.id, formData)
        toast('success', 'Periode berhasil diperbarui')
      } else {
        await ppdbService.createPeriod(formData)
        toast('success', 'Periode berhasil ditambahkan')
      }
      setShowForm(false)
      fetchPeriods()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan periode')
    }
  }

  const handleDelete = async () => {
    if (!deletingId || !canCrud) return
    try {
      await ppdbService.deletePeriod(deletingId)
      toast('success', 'Periode berhasil dihapus')
      fetchPeriods()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus periode')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAction = async () => {
    if (!actionId || !canCrud) return
    try {
      if (actionId.type === 'activate') {
        await ppdbService.activatePeriod(actionId.id)
        toast('success', 'Periode berhasil diaktifkan')
      } else {
        await ppdbService.deactivatePeriod(actionId.id)
        toast('success', 'Periode berhasil dinonaktifkan')
      }
      fetchPeriods()
    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} periode`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-emerald-primary" />
            Periode PPDB
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data periode dan gelombang pendaftaran.</p>
        </div>
        {canCrud && (
          <Button onClick={() => { setEditingPeriod(null); setFormData({ name: '', academic_year: '', description: '' }); setShowForm(true) }} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Periode
          </Button>
        )}
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Periode</TableHead>
                <TableHead>Tahun Ajaran</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gelombang</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows cols={6} rows={5} />
              ) : periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <EmptyState
                      icon={CalendarX2}
                      title="Belum Ada Periode"
                      description="Mulai tambahkan periode pendaftaran PPDB agar gelombang dapat dibuat."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.academic_year}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={p.description}>{p.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'active' ? 'success' : 'secondary'} className={p.status === 'active' ? 'bg-emerald-bright text-white' : ''}>
                        {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPeriod(p)} className="gap-2 text-xs">
                        <Layers className="h-3 w-3" />
                        {p.wave_count || 0} Gelombang
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {canCrud && (
                        <div className="flex justify-end gap-2">
                          {p.status === 'active' ? (
                            <Button variant="outline" size="icon" onClick={() => setActionId({ id: p.id, type: 'deactivate' })} title="Nonaktifkan" className="text-amber-500 hover:text-amber-600 hover:bg-amber-50">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="icon" onClick={() => setActionId({ id: p.id, type: 'activate' })} title="Aktifkan" className="text-emerald-primary hover:text-emerald-dark hover:bg-emerald-light">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" onClick={() => { setEditingPeriod(p); setFormData({ name: p.name, academic_year: p.academic_year || '', description: p.description || '' }); setShowForm(true) }} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => setDeletingId(p.id)} title="Hapus" className="text-rose-danger hover:text-rose-danger hover:bg-rose-light">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Waves Sheet */}
      <WavesSheet period={selectedPeriod} onClose={() => setSelectedPeriod(null)} />

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPeriod ? 'Edit Periode' : 'Tambah Periode'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nama Periode</Label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: PPDB 2024/2025" disabled={!canCrud} />
            </div>
              <div className="space-y-2">
                <Label>Tahun Ajaran</Label>
                <Input required value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} placeholder="Contoh: 2024/2025" disabled={!canCrud} />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Keterangan singkat" disabled={!canCrud} />
              </div>
            {canCrud && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Hapus Periode"
        message="Apakah Anda yakin ingin menghapus periode ini? Semua gelombang di dalamnya juga akan terhapus secara permanen."
        onConfirm={handleDelete}
        confirmLabel="Ya, Hapus"
        variant="danger"
      />
      
      <ConfirmDialog
        isOpen={!!actionId}
        onClose={() => setActionId(null)}
        title={actionId?.type === 'activate' ? 'Aktifkan Periode' : 'Nonaktifkan Periode'}
        message={actionId?.type === 'activate' ? 'Mengaktifkan periode ini akan menonaktifkan periode lain yang sedang aktif.' : 'Apakah Anda yakin ingin menonaktifkan periode ini? Semua gelombang di dalamnya juga akan dinonaktifkan.'}
        onConfirm={handleAction}
        confirmLabel="Ya, Lanjutkan"
        variant={actionId?.type === 'activate' ? 'primary' : 'danger'}
      />
    </div>
  )
}

// ── Konstanta scope gelombang ───────────────────────────────────────────────
const PATH_OPTIONS = [
  { value: 'reguler', label: 'Reguler' },
  { value: 'pindahan', label: 'Pindahan' },
]
const LEVEL_OPTIONS = ['SMP', 'SMK']
const PATH_LABELS: Record<string, string> = { reguler: 'Reguler', pindahan: 'Pindahan' }

const parseCsv = (v?: string | null): string[] =>
  (v || '').split(',').map(s => s.trim()).filter(Boolean)

interface WaveFormData {
  name: string
  allowed_paths: string[]
  allowed_levels: string[]
  registration_start_date: string
  registration_end_date: string
  document_upload_end_date: string
  selection_date: string
  quota: number
  registration_fee: number
}

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

function validateWaveForm(f: WaveFormData): string | null {
  if (!f.name.trim()) return 'Nama gelombang wajib diisi'
  if (f.allowed_paths.length === 0) return 'Pilih minimal satu jalur pendaftaran'
  if (f.allowed_levels.length === 0) return 'Pilih minimal satu jenjang'
  if (!f.registration_start_date) return 'Tanggal mulai pendaftaran wajib diisi'
  if (!f.registration_end_date) return 'Tanggal akhir pendaftaran wajib diisi'
  if (!f.document_upload_end_date) return 'Batas upload dokumen wajib diisi'
  if (!f.selection_date) return 'Jadwal seleksi wajib diisi'
  if (f.registration_end_date < f.registration_start_date)
    return 'Tanggal akhir pendaftaran tidak boleh sebelum tanggal mulai pendaftaran'
  if (f.document_upload_end_date < f.registration_end_date)
    return 'Batas upload dokumen tidak boleh sebelum tanggal akhir pendaftaran'
  if (f.selection_date < f.document_upload_end_date)
    return 'Jadwal seleksi tidak boleh sebelum batas upload dokumen'
  if (!Number.isFinite(f.quota) || f.quota < 1) return 'Kuota harus diisi minimal 1'
  if (f.registration_fee < 0) return 'Biaya tidak boleh negatif'
  return null
}

function WavesSheet({ period, onClose }: { period: any, onClose: () => void }) {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const [waves, setWaves] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingWave, setEditingWave] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)

  const [formData, setFormData] = useState<WaveFormData>(emptyWaveForm())
  const colCount = canCrud ? 8 : 7

  const [feeDialogWave, setFeeDialogWave] = useState<any>(null)
  const [feeItems, setFeeItems] = useState<any[]>([])
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeNominal, setNewFeeNominal] = useState(0)
  const [mouTemplate, setMouTemplate] = useState('')

  const openFeeDialog = async (w: any) => {
    setFeeDialogWave(w)
    setMouTemplate(w.mou_template || '')
    fetchFeeItems(w.id)
  }

  const fetchFeeItems = async (waveId: string) => {
    try {
      const res = await apiFetch<any>(`/ppdb/waves/${waveId}/fee-items`)
      setFeeItems(res.data || [])
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
      toast('success', 'Item biaya ditambahkan')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menambah item biaya')
    }
  }

  const handleDeleteFeeItem = async (id: string) => {
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/fee-items/${id}`, { method: 'DELETE' })
      fetchFeeItems(feeDialogWave.id)
      toast('success', 'Item biaya dihapus')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus item biaya')
    }
  }

  const handleSaveMou = async () => {
    try {
      await apiFetch(`/ppdb/waves/${feeDialogWave.id}/mou-template`, {
        method: 'PUT',
        body: JSON.stringify({ mou_template: mouTemplate })
      })
      toast('success', 'Template MOU disimpan')
      setWaves(waves.map(w => w.id === feeDialogWave.id ? { ...w, mou_template: mouTemplate } : w))
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan MOU')
    }
  }

  const fetchWaves = async () => {
    setLoading(true)
    try {
      const res = await ppdbService.getWaves({ period_id: period.id })
      setWaves(res || []) // endpoint returns raw array for waves if not paginated or we handle appropriately
    } catch {
      toast('error', 'Gagal memuat gelombang')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (period?.id) {
      fetchWaves()
    } else {
      setWaves([])
    }
  }, [period])

  const openCreate = () => {
    setEditingWave(null)
    setFormData(emptyWaveForm())
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (w: any) => {
    setEditingWave(w)
    setFormData({
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
    setFormData(prev => {
      const list = prev[key]
      const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
      return { ...prev, [key]: next }
    })
  }

  // Ubah tanggal berantai: kalau tanggal di hilir jadi tidak valid, ikut dibersihkan
  const handleDateChange = (field: keyof WaveFormData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      if (next.registration_end_date && next.registration_end_date < next.registration_start_date) {
        next.registration_end_date = ''
        next.document_upload_end_date = ''
        next.selection_date = ''
      } else if (next.document_upload_end_date && next.document_upload_end_date < next.registration_end_date) {
        next.document_upload_end_date = ''
        next.selection_date = ''
      } else if (next.selection_date && next.selection_date < next.document_upload_end_date) {
        next.selection_date = ''
      }
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCrud || !period) return
    const error = validateWaveForm(formData)
    if (error) {
      setFormError(error)
      return
    }
    const payload = {
      ...formData,
      name: formData.name.trim(),
      allowed_paths: formData.allowed_paths.join(','),
      allowed_levels: formData.allowed_levels.join(','),
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
      fetchWaves()
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
      fetchWaves()
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
      fetchWaves()
    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} gelombang`)
    } finally {
      setActionId(null)
    }
  }

  return (
    <Sheet open={!!period} onOpenChange={(v) => !v && onClose()}>
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
                  waves.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold text-center">{w.wave_number}</TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {parseCsv(w.allowed_paths).map(p => (
                            <Badge key={p} variant={p === 'reguler' ? 'info' : 'warning'}>
                              {PATH_LABELS[p] || p}
                            </Badge>
                          ))}
                          {parseCsv(w.allowed_levels).map(l => (
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

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setFormError(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingWave ? 'Edit Gelombang' : 'Tambah Gelombang'}</DialogTitle>
            <DialogDescription>
              {editingWave
                ? `Ubah detail ${editingWave.name} pada periode ${period?.name}.`
                : `Nomor gelombang diisi otomatis untuk periode ${period?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 pt-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="wave-name">Nama Gelombang *</Label>
              <Input id="wave-name" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Gelombang 1" disabled={!canCrud} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jalur Pendaftaran *</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PATH_OPTIONS.map(opt => {
                    const active = formData.allowed_paths.includes(opt.value)
                    return (
                      <button key={opt.value} type="button" aria-pressed={active} disabled={!canCrud}
                        onClick={() => toggleScope('allowed_paths', opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Jalur yang dibuka pada gelombang ini.</p>
              </div>
              <div className="space-y-2">
                <Label>Jenjang *</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {LEVEL_OPTIONS.map(lvl => {
                    const active = formData.allowed_levels.includes(lvl)
                    return (
                      <button key={lvl} type="button" aria-pressed={active} disabled={!canCrud}
                        onClick={() => toggleScope('allowed_levels', lvl)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                        {lvl}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Jenjang yang dibuka pada gelombang ini.</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jadwal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-start">Tanggal Mulai Pendaftaran *</Label>
                  <Input id="wave-start" type="date" required value={formData.registration_start_date}
                    onChange={e => handleDateChange('registration_start_date', e.target.value)} disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-end">Tanggal Akhir Pendaftaran *</Label>
                  <Input id="wave-end" type="date" required value={formData.registration_end_date}
                    min={formData.registration_start_date || undefined}
                    onChange={e => handleDateChange('registration_end_date', e.target.value)} disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-upload">Batas Upload Dokumen *</Label>
                  <Input id="wave-upload" type="date" required value={formData.document_upload_end_date}
                    min={formData.registration_end_date || undefined}
                    onChange={e => handleDateChange('document_upload_end_date', e.target.value)} disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-selection">Jadwal Seleksi *</Label>
                  <Input id="wave-selection" type="date" required value={formData.selection_date}
                    min={formData.document_upload_end_date || undefined}
                    onChange={e => handleDateChange('selection_date', e.target.value)} disabled={!canCrud} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kuota &amp; Biaya</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wave-quota">Kuota *</Label>
                  <Input id="wave-quota" type="number" min={1} required value={formData.quota}
                    onChange={e => setFormData({ ...formData, quota: parseInt(e.target.value) || 0 })}
                    placeholder="Contoh: 100" disabled={!canCrud} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wave-fee1">Biaya Formulir (Tahap 1)</Label>
                  <CurrencyInput id="wave-fee1" value={formData.registration_fee}
                    onValueChange={v => setFormData({ ...formData, registration_fee: v })}
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
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!actionId}
        onClose={() => setActionId(null)}
        title={actionId?.type === 'activate' ? 'Aktifkan Gelombang' : 'Nonaktifkan Gelombang'}
        message={actionId?.type === 'activate' ? 'Mengaktifkan gelombang ini akan menonaktifkan gelombang lain yang sedang aktif.' : 'Apakah Anda yakin ingin menonaktifkan gelombang ini?'}
        onConfirm={handleAction}
        confirmLabel="Ya, Lanjutkan"
        variant={actionId?.type === 'activate' ? 'primary' : 'danger'}
      />

      <Dialog open={!!feeDialogWave} onOpenChange={(v) => !v && setFeeDialogWave(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Biaya & MOU — {feeDialogWave?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Item Biaya Tahap 2</h3>
              
              <div className="flex gap-2 items-end">
                <div className="space-y-1.5 flex-1">
                  <Label>Nama Item</Label>
                  <Input value={newFeeName} onChange={e => setNewFeeName(e.target.value)} placeholder="Misal: SPP Bulan Juli" />
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

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">Template MOU</h3>
              <p className="text-xs text-muted-foreground">Template perjanjian yang akan ditandatangani wali santri.</p>
              <textarea 
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder="Isi template MOU disini... Gunakan variabel seperti {nama_peserta}, {nisn}, dll."
                value={mouTemplate}
                onChange={e => setMouTemplate(e.target.value)}
              />
              <div className="rounded-md bg-muted/50 border p-3 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">Variabel yang tersedia:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-muted-foreground font-mono">
                  {[
                    ['{nama_peserta}', 'Nama lengkap'],
                    ['{nisn}', 'NISN'],
                    ['{nik}', 'NIK'],
                    ['{asal_sekolah}', 'Asal sekolah'],
                    ['{nama_ortu}', 'Nama orang tua'],
                    ['{email}', 'Email'],
                    ['{nomor_wa}', 'No. WhatsApp'],
                    ['{jalur}', 'Jalur pendaftaran'],
                    ['{jenjang}', 'Jenjang (SMP/SMK)'],
                    ['{alamat}', 'Alamat'],
                    ['{tanggal}', 'Tanggal hari ini'],
                  ].map(([v, label]) => (
                    <span key={v}><span className="text-primary">{v}</span> = {label}</span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveMou}>Simpan Template</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
