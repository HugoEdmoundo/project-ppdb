import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui"
import { Plus, Trash2, Download, ListTree, XCircle } from 'lucide-react'
import { ConfirmDialog } from "@/components/ui"
import type { SelectionCategory, Session, SelectionResult } from './types'
import { downloadCSV } from './utils'

export default function SelectionCategories() {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canCrud = user?.is_superadmin || user?.user_type === 'superadmin' || user?.permissions?.ppdb === 'crud'

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'category' | 'criteria', id: string } | null>(null)

  const [categoryModal, setCategoryModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '' })
  const [criteriaModal, setCriteriaModal] = useState<string | null>(null) // category_id
  const [critForm, setCritForm] = useState({ name: '' })

  const [downloadModalCat, setDownloadModalCat] = useState<SelectionCategory | null>(null)
  const [downloadSessionFilter, setDownloadSessionFilter] = useState<string>('all')

  const { data: categories = [], isLoading: loadingCategories } = useQuery<SelectionCategory[]>({
    queryKey: ['selection-categories'],
    queryFn: async () => {
      const res = await api.apiFetch<SelectionCategory[] | { data: SelectionCategory[] }>('/selection/categories')
      return Array.isArray(res) ? res : (res as { data: SelectionCategory[] }).data || []
    }
  })

  // We need sessions and results for the download template logic
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['selection-sessions'],
    queryFn: async () => {
      const res = await api.apiFetch<Session[] | { data: Session[] }>('/selection/sessions')
      return Array.isArray(res) ? res : (res as { data: Session[] }).data || []
    }
  })

  const { data: results = [] } = useQuery<SelectionResult[]>({
    queryKey: ['selection-results'],
    queryFn: async () => {
      const res = await api.apiFetch<SelectionResult[] | { data: SelectionResult[] }>('/selection/results')
      return Array.isArray(res) ? res : (res as { data: SelectionResult[] }).data || []
    }
  })

  const saveCategoryMutation = useMutation({
    mutationFn: (data: typeof catForm) => api.apiFetch('/selection/categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast('success', 'Kategori dibuat')
      setCategoryModal(false)
      queryClient.invalidateQueries({ queryKey: ['selection-categories'] })
    },
    onError: (e: any) => toast('error', e.message)
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.apiFetch(`/selection/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Kategori dihapus')
      queryClient.invalidateQueries({ queryKey: ['selection-categories'] })
    },
    onError: (e: any) => toast('error', e.message),
    onSettled: () => setDeleteTarget(null),
  })

  const saveCriteriaMutation = useMutation({
    mutationFn: (payload: { categoryId: string, data: typeof critForm }) =>
      api.apiFetch(`/selection/categories/${payload.categoryId}/criteria`, { method: 'POST', body: JSON.stringify(payload.data) }),
    onSuccess: () => {
      toast('success', 'Kriteria ditambah')
      setCriteriaModal(null)
      queryClient.invalidateQueries({ queryKey: ['selection-categories'] })
    },
    onError: (e: any) => toast('error', e.message)
  })

  const deleteCriteriaMutation = useMutation({
    mutationFn: (id: string) => api.apiFetch(`/selection/criteria/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Kriteria dihapus')
      queryClient.invalidateQueries({ queryKey: ['selection-categories'] })
    },
    onError: (e: any) => toast('error', e.message),
    onSettled: () => setDeleteTarget(null),
  })

  const saveCategory = () => {
    if(!catForm.name) { toast('error', 'Nama kategori wajib diisi'); return }
    saveCategoryMutation.mutate(catForm)
  }

  const deleteCategory = (id: string) => {
    if (deleteCategoryMutation.isPending || deleteCriteriaMutation.isPending) return
    setDeleteTarget({ kind: 'category', id })
  }

  const saveCriteria = () => {
    if(!critForm.name || !criteriaModal) { toast('error', 'Nama wajib diisi'); return }
    saveCriteriaMutation.mutate({ categoryId: criteriaModal, data: critForm })
  }

  const deleteCriteria = (id: string) => {
    if (deleteCategoryMutation.isPending || deleteCriteriaMutation.isPending) return
    setDeleteTarget({ kind: 'criteria', id })
  }

  const handleDownloadTemplate = () => {
    if (!downloadModalCat) return;
    const cat = downloadModalCat;

    const filteredForDownload = results.filter(r => {
      if (downloadSessionFilter === 'all') return true;
      if (downloadSessionFilter === 'none') return !r.session_id;
      return r.session_id === downloadSessionFilter;
    });

    const headers = ['ID Pendaftar', 'Nama Peserta', 'Sesi', ...cat.criteria.map(c => c.name)];
    const rows = [headers];
    filteredForDownload.forEach(r => {
      rows.push([r.applicant_id, r.full_name, r.session_name || '-', ...cat.criteria.map(() => '')]);
    });

    const sessionName = downloadSessionFilter === 'all' ? 'SemuaSesi' :
                        downloadSessionFilter === 'none' ? 'TanpaSesi' :
                        sessions.find(s => s.id === downloadSessionFilter)?.name.replace(/\s+/g, '') || 'Sesi';

    downloadCSV(`Template_Nilai_${cat.name.replace(/\s+/g, '_')}_${sessionName}.csv`, rows);
    setDownloadModalCat(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <h2 className="font-semibold text-lg">Desain Struktur Penilaian</h2>
          <p className="text-sm text-muted-foreground">Buat kategori dan kriteria penilaian. Anda dapat mengunduh format Excel (CSV) per kategori di sini.</p>
        </div>
        {canCrud && (
          <Button onClick={() => { setCatForm({ name: '' }); setCategoryModal(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Kategori
          </Button>
        )}
      </div>

      {loadingCategories ? (
        <div className="p-8 text-center text-muted-foreground">Memuat struktur...</div>
      ) : categories.length === 0 ? (
        <EmptyState icon={ListTree} title="Belum ada Kategori" description="Buat kategori penilaian untuk memulai input nilai custom" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="overflow-hidden border shadow-sm">
              <div className="bg-muted/50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-foreground text-lg">{cat.name}</h3>
                {canCrud && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardContent className="p-4 space-y-4">
                {(!cat.criteria || cat.criteria.length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground text-sm italic bg-muted/10 rounded-lg border border-dashed">Belum ada kriteria di kategori ini.</div>
                ) : (
                  <div className="space-y-2">
                    {cat.criteria.map(crit => (
                      <div key={crit.id} className="flex justify-between items-center p-2 rounded-lg bg-background border">
                        <span className="font-medium text-sm">{crit.name}</span>
                        <div className="flex items-center gap-3">
                          {canCrud && (
                            <button className="text-muted-foreground hover:text-destructive" onClick={() => deleteCriteria(crit.id)}>
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canCrud && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 border-dashed" onClick={() => { setCritForm({ name: '' }); setCriteriaModal(cat.id); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Kriteria
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setDownloadModalCat(cat); setDownloadSessionFilter('all'); }} disabled={cat.criteria.length === 0}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.kind === 'category') deleteCategoryMutation.mutate(deleteTarget.id)
          else deleteCriteriaMutation.mutate(deleteTarget.id)
        }}
        loading={deleteCategoryMutation.isPending || deleteCriteriaMutation.isPending}
        title={deleteTarget?.kind === 'category' ? 'Hapus Kategori' : 'Hapus Kriteria'}
        message={deleteTarget?.kind === 'category' ? 'Yakin ingin menghapus kategori ini beserta seluruh kriterianya?' : 'Yakin ingin menghapus kriteria ini?'}
        confirmLabel="Ya, Hapus"
        variant="destructive"
      />
      <Dialog open={categoryModal} onOpenChange={setCategoryModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kategori Ujian</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input className="mt-1" placeholder="cth: Ujian Al-Quran" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex justify-end"><Button onClick={saveCategory} disabled={saveCategoryMutation.isPending}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!criteriaModal} onOpenChange={() => setCriteriaModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kriteria Penilaian</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Nama Kriteria</label>
              <Input className="mt-1" placeholder="cth: Tajwid / Matematika" value={critForm.name} onChange={e => setCritForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex justify-end"><Button onClick={saveCriteria} disabled={saveCriteriaMutation.isPending}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!downloadModalCat} onOpenChange={(open) => !open && setDownloadModalCat(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Unduh Template: {downloadModalCat?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Pilih Sesi</label>
              <Select value={downloadSessionFilter} onValueChange={setDownloadSessionFilter}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih Sesi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sesi</SelectItem>
                  <SelectItem value="none">Belum Pilih Sesi</SelectItem>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDownloadModalCat(null)}>Batal</Button>
              <Button onClick={handleDownloadTemplate}>Unduh Sekarang</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
