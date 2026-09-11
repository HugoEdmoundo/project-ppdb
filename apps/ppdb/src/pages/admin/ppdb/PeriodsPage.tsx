import { useState } from 'react'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import {
  Card, CardContent,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Badge, Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, ConfirmDialog, EmptyState
} from '@/components/ui'
import { TableSkeletonRows } from "@/components/ui"
import { Plus, Edit, Trash2, CheckCircle, XCircle, Layers, CalendarX2, Activity } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import WavesSheet from './components/WavesSheet'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

const periodSchema = z.object({
  name: z.string().min(1, 'Nama periode wajib diisi'),
  academic_year: z.string().min(1, 'Tahun ajaran wajib diisi'),
  description: z.string().optional(),
})

type PeriodFormData = z.infer<typeof periodSchema>

export default function PeriodsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()

  const { data: periods = [], isLoading: loading } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const res = await ppdbService.getPeriods({ perPage: 100 })
      return res.data || []
    }
  })

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<{ id: string, type: 'activate' | 'deactivate' } | null>(null)

  // Waves Sheet
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PeriodFormData>({
    resolver: zodResolver(periodSchema),
    defaultValues: { name: '', academic_year: '', description: '' }
  })

  const handleSave = async (data: PeriodFormData) => {
    if (!canCrud) return
    try {
      if (editingPeriod) {
        await ppdbService.updatePeriod(editingPeriod.id, data)
        toast('success', 'Periode berhasil diperbarui')
      } else {
        await ppdbService.createPeriod(data)
        toast('success', 'Periode berhasil ditambahkan')
      }
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['periods'] })
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan periode')
    }
  }

  const handleDelete = async () => {
    if (!deletingId || !canCrud) return
    try {
      await ppdbService.deletePeriod(deletingId)
      toast('success', 'Periode berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['periods'] })
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
      queryClient.invalidateQueries({ queryKey: ['periods'] })
    } catch (e: any) {
      toast('error', e.message || `Gagal ${actionId.type} periode`)
    } finally {
      setActionId(null)
    }
  }

  const openCreate = () => {
    setEditingPeriod(null)
    reset({ name: '', academic_year: '', description: '' })
    setShowForm(true)
  }

  const openEdit = (p: any) => {
    setEditingPeriod(p)
    reset({ name: p.name, academic_year: p.academic_year || '', description: p.description || '' })
    setShowForm(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Periode PPDB"
        description="Kelola data periode dan gelombang pendaftaran."
        loading={loading}
        action={
          canCrud ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Tambah Periode
            </Button>
          ) : undefined
        }
        blocks={[
          { icon: Layers, label: 'Total Periode', value: `${periods.length} periode`, active: true },
          {
            icon: Activity,
            label: 'Periode Aktif',
            value: `${periods.filter((p: any) => p.status === 'active').length} periode`,
            active: periods.some((p: any) => p.status === 'active'),
            pulse: periods.some((p: any) => p.status === 'active'),
          },
        ]}
      />

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
                periods.map((p: any) => (
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
                          <Button variant="outline" size="icon" onClick={() => openEdit(p)} title="Edit">
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
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nama Periode</Label>
              <Input {...register('name')} placeholder="Contoh: PPDB 2024/2025" disabled={!canCrud || isSubmitting} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <Input {...register('academic_year')} placeholder="Contoh: 2024/2025" disabled={!canCrud || isSubmitting} />
              {errors.academic_year && <p className="text-xs text-red-500">{errors.academic_year.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (Opsional)</Label>
              <Input {...register('description')} placeholder="Keterangan singkat" disabled={!canCrud || isSubmitting} />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>
            {canCrud && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
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
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={!!actionId}
        onClose={() => setActionId(null)}
        title={actionId?.type === 'activate' ? 'Aktifkan Periode' : 'Nonaktifkan Periode'}
        message={actionId?.type === 'activate' ? 'Mengaktifkan periode ini akan menonaktifkan periode lain yang sedang aktif.' : 'Apakah Anda yakin ingin menonaktifkan periode ini? Semua gelombang di dalamnya juga akan dinonaktifkan.'}
        onConfirm={handleAction}
        confirmLabel="Ya, Lanjutkan"
        variant={actionId?.type === 'activate' ? 'primary' : 'destructive'}
      />
    </div>
  )
}
