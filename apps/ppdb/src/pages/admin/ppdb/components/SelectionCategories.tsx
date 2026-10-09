import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Badge, Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui"
import { Plus, Trash2, Pencil, BookOpen, MessageSquare, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from "@/components/ui"
import type { SelectionCategory } from './types'

export default function SelectionCategories() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCan('ppdb', 'crud')

  const [deleteCriteriaId, setDeleteCriteriaId] = useState<string | null>(null)
  const [criteriaModal, setCriteriaModal] = useState<{
    categoryId: string
    categoryName: string
    editing?: { id: string; name: string; description?: string | null; weight: number }
  } | null>(null)

  const [critForm, setCritForm] = useState({ name: '', description: '', weight: '' })

  const { data: categories = [], isLoading, isError, error } = useQuery<SelectionCategory[]>({
    queryKey: ['selection-categories-global'],
    queryFn: async () => {
      const res = await api.apiFetch<SelectionCategory[] | { data: SelectionCategory[] }>('/selection/categories')
      return Array.isArray(res) ? res : (res as { data: SelectionCategory[] }).data || []
    },
    retry: 1,
  })

  const saveCriteriaMutation = useMutation({
    mutationFn: (payload: { categoryId: string, criteriaId?: string, data: { name: string; description: string; weight: number } }) =>
      payload.criteriaId
        ? api.apiFetch(`/selection/criteria/${payload.criteriaId}`, { method: 'PUT', body: JSON.stringify(payload.data) })
        : api.apiFetch(`/selection/categories/${payload.categoryId}/criteria`, { method: 'POST', body: JSON.stringify(payload.data) }),
    onSuccess: () => {
      toast('success', criteriaModal?.editing ? 'Kriteria berhasil diperbarui' : 'Kriteria berhasil ditambahkan')
      setCriteriaModal(null)
      queryClient.invalidateQueries({ queryKey: ['selection-categories-global'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan kriteria')
  })

  const deleteCriteriaMutation = useMutation({
    mutationFn: (id: string) => api.apiFetch(`/selection/criteria/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Kriteria berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['selection-categories-global'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menghapus kriteria'),
    onSettled: () => setDeleteCriteriaId(null),
  })

  const openAddCriteria = (cat: SelectionCategory) => {
    setCritForm({ name: '', description: '', weight: '' })
    setCriteriaModal({ categoryId: cat.id, categoryName: cat.name })
  }

  const openEditCriteria = (cat: SelectionCategory, crit: any) => {
    setCritForm({
      name: crit.name || '',
      description: crit.description || '',
      weight: String(crit.weight || '')
    })
    setCriteriaModal({
      categoryId: cat.id,
      categoryName: cat.name,
      editing: crit
    })
  }

  const handleSaveCriteria = () => {
    if (!critForm.name.trim() || !criteriaModal) {
      toast('error', 'Nama kriteria wajib diisi')
      return
    }
    const weight = Number(critForm.weight)
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      toast('error', 'Bobot harus berupa angka 1% sampai 100%')
      return
    }
    saveCriteriaMutation.mutate({
      categoryId: criteriaModal.categoryId,
      criteriaId: criteriaModal.editing?.id,
      data: {
        name: critForm.name.trim(),
        description: critForm.description.trim(),
        weight
      },
    })
  }

  // Pisahkan secara tegas 2 Kategori Paten
  const tahfidzFound = categories.find(c => c.name?.toLowerCase().includes('tahfidz'))
  const wawancaraFound = categories.find(c => c.name?.toLowerCase().includes('wawancara'))

  const tahfidzCategory: SelectionCategory = tahfidzFound || { id: 'tahfidz-placeholder', wave_id: 'global', name: 'Tahfidz', criteria: [] }
  const wawancaraCategory: SelectionCategory = wawancaraFound || { id: 'wawancara-placeholder', wave_id: 'global', name: 'Wawancara', criteria: [] }

  const renderRubricCard = (
    cat: SelectionCategory,
    title: string,
    icon: typeof BookOpen,
    accentColor: string,
    isPlaceholder: boolean
  ) => {
    const Icon = icon
    const totalWeight = (cat.criteria || []).reduce((sum, item) => sum + Number(item.weight || 0), 0)
    const isOverWeight = totalWeight > 100
    const isComplete = totalWeight === 100

    return (
      <Card key={cat.id} className="overflow-hidden border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="bg-slate-50/80 px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${accentColor} text-white shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-800">{title}</h3>
                <p className="text-xs text-muted-foreground">Rubrik Penilaian Evaluator {cat.name}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={isOverWeight ? 'destructive' : isComplete ? 'success' : 'secondary'}
                className="text-xs font-semibold px-2.5 py-0.5"
              >
                Total Bobot: {totalWeight}%
              </Badge>
              {isOverWeight && (
                <p className="text-[10px] text-red-600 mt-0.5">Melebihi 100%!</p>
              )}
            </div>
          </div>

          {/* Criteria List / Table */}
          <CardContent className="p-4 space-y-3">
            {isPlaceholder ? (
              <div className="text-center py-10 text-muted-foreground text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Menunggu data dari server... Pastikan backend berjalan dan sudah sinkron.
              </div>
            ) : (!cat.criteria || cat.criteria.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Belum ada kriteria penilaian untuk {title.toLowerCase()}.
                <br />
                Klik tombol "Tambah Kriteria" di bawah untuk menentukan kriteria penguji.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                {cat.criteria.map((crit) => (
                  <div key={crit.id} className="p-3.5 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800">{crit.name}</span>
                        <Badge variant="outline" className="text-[11px] font-bold text-primary bg-primary/5">
                          {Number(crit.weight || 0)}%
                        </Badge>
                      </div>
                      {crit.description ? (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {crit.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Tidak ada deskripsi panduan</p>
                      )}
                    </div>

                    {canCrud && (
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100"
                          onClick={() => openEditCriteria(cat, crit)}
                          title="Edit Kriteria"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50"
                          onClick={() => setDeleteCriteriaId(crit.id)}
                          title="Hapus Kriteria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        {/* Footer Card: Tombol Tambah Kriteria — nonaktif saat placeholder */}
        {canCrud && (
          <div className="p-4 pt-0 border-t border-slate-100 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 text-slate-700"
              onClick={() => openAddCriteria(cat)}
              disabled={isPlaceholder}
              title={isPlaceholder ? 'Menunggu data dari server...' : undefined}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Kriteria {title}
            </Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Penjelasan */}
      <div className="p-4 bg-muted/40 rounded-xl border border-slate-200/80 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm">
            Konfigurasi Rubrik Penguji (Tahfidz & Wawancara)
          </p>
          <p>
            Struktur penilaian bersifat global institusi. Kriteria yang Anda definisikan di sini otomatis menjadi formulir penilaian bagi penguji saat sesi ujian berlangsung. Nilai TIU tidak menggunakan rubrik karena disinkronkan otomatis via SEB webhook.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">
          Memuat struktur rubrik penilaian...
        </div>
      ) : isError ? (
        <div className="p-6 text-center border border-red-200 rounded-xl bg-red-50 text-sm text-red-700 space-y-1">
          <p className="font-semibold">Gagal memuat rubrik penilaian</p>
          <p className="text-xs text-red-600">{(error as any)?.message || 'Periksa koneksi backend dan coba refresh halaman.'}</p>
        </div>
      ) : (
        /* Halaman langsung menampilkan 2 KOTAK UTAMA PATEN tanpa tombol tambah kategori */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderRubricCard(tahfidzCategory, 'Rubrik Tahfidz', BookOpen, 'bg-emerald-600', !tahfidzFound)}
          {renderRubricCard(wawancaraCategory, 'Rubrik Wawancara', MessageSquare, 'bg-amber-600', !wawancaraFound)}
        </div>
      )}

      {/* Modal Dialog Form Kriteria (3 Inputan Lengkap: Nama, Deskripsi, Bobot) */}
      <Dialog open={!!criteriaModal} onOpenChange={(open) => !open && setCriteriaModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {criteriaModal?.editing ? 'Edit Kriteria' : 'Tambah Kriteria'} — {criteriaModal?.categoryName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan indikator dan bobot penilaian yang akan digunakan oleh penguji.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Input 1: Nama Kriteria */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Nama Kriteria <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="cth: Tajwid & Makhraj / Kelancaran / Motivasi Belajar"
                value={critForm.name}
                onChange={(e) => setCritForm((p) => ({ ...p, name: e.target.value }))}
                className="text-xs"
              />
            </div>

            {/* Input 2: Deskripsi Kriteria (Desc) */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Deskripsi / Panduan Indikator (Desc)
              </label>
              <Textarea
                placeholder="cth: Penjelasan detail terkait apa yang dinilai agar penguji tidak bingung (misal: Menilai ketepatan hukum nun mati, mim mati, dan mad)."
                value={critForm.description}
                onChange={(e) => setCritForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Deskripsi ini akan tampil di layar evaluator sebagai panduan memberi skor.
              </p>
            </div>

            {/* Input 3: Bobot Nilai (%) */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Bobot Nilai (%) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="cth: 30"
                value={critForm.weight}
                onChange={(e) => setCritForm((p) => ({ ...p, weight: e.target.value }))}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Total akumulasi bobot seluruh kriteria idealnya mencapai 100%.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCriteriaModal(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCriteria}
              disabled={saveCriteriaMutation.isPending || !critForm.name.trim() || !critForm.weight}
            >
              {saveCriteriaMutation.isPending ? 'Menyimpan...' : 'Simpan Kriteria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Kriteria */}
      <ConfirmDialog
        isOpen={!!deleteCriteriaId}
        onClose={() => setDeleteCriteriaId(null)}
        onConfirm={() => {
          if (deleteCriteriaId) deleteCriteriaMutation.mutate(deleteCriteriaId)
        }}
        loading={deleteCriteriaMutation.isPending}
        title="Hapus Kriteria Penilaian"
        message="Apakah Anda yakin ingin menghapus kriteria ini dari rubrik penguji?"
        confirmLabel="Ya, Hapus"
        variant="destructive"
      />
    </div>
  )
}
