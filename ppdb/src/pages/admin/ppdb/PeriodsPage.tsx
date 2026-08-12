import React, { useState, useEffect } from 'react'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import {
  Card, CardContent,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, ConfirmDialog, Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui'
import { Plus, Edit, Trash2, CalendarDays, CheckCircle, XCircle, Layers } from 'lucide-react'

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

  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' })

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
          <Button onClick={() => { setEditingPeriod(null); setFormData({ name: '', start_date: '', end_date: '' }); setShowForm(true) }} className="gap-2">
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
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gelombang</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : periods.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data periode.</TableCell></TableRow>
              ) : (
                periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{new Date(p.start_date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{new Date(p.end_date).toLocaleDateString('id-ID')}</TableCell>
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
                          <Button variant="outline" size="icon" onClick={() => { setEditingPeriod(p); setFormData({ name: p.name, start_date: p.start_date.split('T')[0], end_date: p.end_date.split('T')[0] }); setShowForm(true) }} title="Edit">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} disabled={!canCrud} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} disabled={!canCrud} />
              </div>
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

function WavesSheet({ period, onClose }: { period: any, onClose: () => void }) {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const [waves, setWaves] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingWave, setEditingWave] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)

  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' })

  useEffect(() => {
    if (period?.id) {
      fetchWaves()
    } else {
      setWaves([])
    }
  }, [period])

  const fetchWaves = async () => {
    setLoading(true)
    try {
      const res = await ppdbService.getWaves({ period_id: period.id })
      setWaves(res || []) // endpoint returns raw array for waves if not paginated or we handle appropriately
    } catch (e: any) {
      toast('error', 'Gagal memuat gelombang')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCrud || !period) return
    try {
      if (editingWave) {
        await ppdbService.updateWave(editingWave.id, formData)
        toast('success', 'Gelombang berhasil diperbarui')
      } else {
        await ppdbService.createWave({ ...formData, period_id: period.id })
        toast('success', 'Gelombang berhasil ditambahkan')
      }
      setShowForm(false)
      fetchWaves()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan gelombang')
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
              <Button size="sm" onClick={() => { setEditingWave(null); setFormData({ name: '', start_date: '', end_date: '' }); setShowForm(true) }} className="gap-1">
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
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status</TableHead>
                  {canCrud && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">Memuat...</TableCell></TableRow>
                ) : waves.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Belum ada gelombang.</TableCell></TableRow>
                ) : (
                  waves.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-semibold text-center">{w.wave_number}</TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(w.start_date).toLocaleDateString('id-ID')} <br/> 
                        <span className="text-muted-foreground">s/d</span> <br/>
                        {new Date(w.end_date).toLocaleDateString('id-ID')}
                      </TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => { setEditingWave(w); setFormData({ name: w.name, start_date: w.start_date.split('T')[0], end_date: w.end_date.split('T')[0] }); setShowForm(true) }} title="Edit" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWave ? 'Edit Gelombang' : 'Tambah Gelombang'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nama Gelombang</Label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Gelombang 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
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
    </Sheet>
  )
}
