import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui"
import { Upload, Star, FileSpreadsheet, AlertCircle } from 'lucide-react'
import type { SelectionResult, SelectionCategory, Session } from './types'

export default function SelectionResults() {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canCrud = user?.is_superadmin || user?.permissions?.ppdb === 'crud' || user?.permissions?.selection === 'crud'

  const [filterSessionId, setFilterSessionId] = useState<string>('all')
  const [selectedApplicant, setSelectedApplicant] = useState<SelectionResult | null>(null)
  const [appScoreForms, setAppScoreForms] = useState<Record<string, string>>({})
  const [appNotesForm, setAppNotesForm] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [reasonText, setReasonText] = useState("")

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importCategory, setImportCategory] = useState<SelectionCategory | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const { data: results = [], isLoading: loadingResults } = useQuery<SelectionResult[]>({
    queryKey: ['selection-results'],
    queryFn: async () => {
      const res = await api.apiFetch<SelectionResult[] | { data: SelectionResult[] }>('/selection/results')
      return Array.isArray(res) ? res : (res as { data: SelectionResult[] }).data || []
    }
  })

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['selection-sessions'],
    queryFn: async () => {
      const res = await api.apiFetch<Session[] | { data: Session[] }>('/selection/sessions')
      return Array.isArray(res) ? res : (res as { data: Session[] }).data || []
    }
  })

  const { data: categories = [] } = useQuery<SelectionCategory[]>({
    queryKey: ['selection-categories'],
    queryFn: async () => {
      const res = await api.apiFetch<SelectionCategory[] | { data: SelectionCategory[] }>('/selection/categories')
      return Array.isArray(res) ? res : (res as { data: SelectionCategory[] }).data || []
    }
  })

  const saveScoresMutation = useMutation({
    mutationFn: (payload: { applicant_id: string, scores: {criteria_id: string, score: number}[], notes: string | null }) =>
      api.apiFetch('/selection/results', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (_, variables) => {
      toast('success', 'Nilai berhasil disimpan')
      queryClient.invalidateQueries({ queryKey: ['selection-results'] })

      if (selectedApplicant) {
        setSelectedApplicant({
          ...selectedApplicant,
          notes: variables.notes || undefined,
          scores: variables.scores
        })
      }
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan nilai')
  })

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { applicant_id: string, status: string, reason: string | null }) =>
      api.apiFetch(`/selection/results/${payload.applicant_id}/status`, { method: 'PUT', body: JSON.stringify({ status: payload.status, reason: payload.reason }) }),
    onSuccess: (_, variables) => {
      toast('success', `Status pendaftar diubah menjadi ${variables.status === 'passed' ? 'Lulus' : variables.status === 'failed' ? 'Tidak Lulus' : 'Belum Dinilai'}`)
      queryClient.invalidateQueries({ queryKey: ['selection-results'] })

      if (selectedApplicant) {
        setSelectedApplicant({
          ...selectedApplicant,
          applicant_status: variables.status,
          notes: variables.status === 'failed' ? (variables.reason || undefined) : selectedApplicant.notes
        })
        if (variables.status === 'passed' || variables.status === 'selection') setShowReason(false)
      }
    },
    onError: (e: any) => toast('error', e.message || 'Gagal mengubah status')
  })

  const openApplicantDrawer = (app: SelectionResult) => {
    setSelectedApplicant(app)
    setShowReason(false)
    setReasonText(app.notes || "")

    const sf: Record<string, string> = {}
    app.scores?.forEach(s => { sf[s.criteria_id] = String(s.score) })
    setAppScoreForms(sf)
    setAppNotesForm(app.notes || '')
  }

  const saveApplicantScores = () => {
    if (!selectedApplicant) return
    const payloadScores = Object.entries(appScoreForms).map(([cid, score]) => ({
      criteria_id: cid, score: parseFloat(score || '0')
    }))
    saveScoresMutation.mutate({
      applicant_id: selectedApplicant.applicant_id,
      scores: payloadScores,
      notes: appNotesForm || null
    })
  }

  const updateApplicantStatus = (status: string) => {
    if (!selectedApplicant) return
    updateStatusMutation.mutate({
      applicant_id: selectedApplicant.applicant_id,
      status,
      reason: status === 'failed' ? reasonText : null
    })
  }

  const filteredResults = useMemo(() => {
    if (filterSessionId === 'all') return results
    if (filterSessionId === 'none') return results.filter(r => !r.session_id)
    return results.filter(r => r.session_id === filterSessionId)
  }, [results, filterSessionId])

  const openImportModal = (cat: SelectionCategory) => {
    setImportCategory(cat)
    setImportFile(null)
    setImportErrors([])
    setImportModalOpen(true)
  }

  const handleImportSubmit = async () => {
    if(!importFile || !importCategory) return;
    setImporting(true)
    setImportErrors([])
    try {
      const text = await importFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(c => c.replace(/(^"|"$)/g, '').trim()));
      const headers = rows[0];

      if(!headers.includes('ID Pendaftar')) {
        setImportErrors(['Kolom "ID Pendaftar" tidak ditemukan. Unduh ulang template jika perlu.']);
        setImporting(false); return;
      }

      const expectedCriteria = importCategory.criteria.map(c => c.name);
      const missing = expectedCriteria.filter(c => !headers.includes(c));
      if(missing.length > 0) {
        setImportErrors([`Kolom kriteria berikut hilang: ${missing.join(', ')}.`]);
        setImporting(false); return;
      }

      let successCount = 0;
      for(let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if(row.length < 2) continue;
        const applicantId = row[headers.indexOf('ID Pendaftar')];
        if(!applicantId) continue;

        const existingApp = results.find(r => r.applicant_id === applicantId);
        const currentNotes = existingApp?.notes || null;

        const scores = importCategory.criteria.map(c => {
          let val = parseFloat(row[headers.indexOf(c.name)] || '0');
          if(isNaN(val)) val = 0;
          return { criteria_id: c.id, score: val };
        });

        await api.apiFetch('/selection/results', {
          method: 'POST',
          body: JSON.stringify({ applicant_id: applicantId, scores, notes: currentNotes })
        });
        successCount++;
      }
      toast('success', `Berhasil import nilai untuk ${successCount} pendaftar`)
      setImportModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['selection-results'] })
    } catch (e: any) {
      setImportErrors([e.message || 'Gagal memproses file. Pastikan format CSV valid.'])
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
            <div>
              <CardTitle>Penilaian & Status Lulus</CardTitle>
              <CardDescription>Pilih peserta untuk input nilai atau mengubah status kelulusan</CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterSessionId} onValueChange={setFilterSessionId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Sesi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sesi</SelectItem>
                  <SelectItem value="none">Belum Pilih Sesi</SelectItem>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canCrud && categories.map(cat => (
                <Button key={cat.id} size="sm" variant="outline" onClick={() => openImportModal(cat)}>
                  <Upload className="h-4 w-4 mr-1.5 text-blue-600" />
                  Import {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pendaftar</TableHead>
                <TableHead>Sesi / Jalur</TableHead>
                <TableHead>Status Kelulusan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResults ? (
                <TableSkeletonRows cols={3} />
              ) : filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <EmptyState icon={Star} title="Tidak ada data pendaftar" description="Belum ada pendaftar di filter/sesi ini." />
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map(r => (
                  <TableRow key={r.applicant_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openApplicantDrawer(r)}>
                    <TableCell>
                      <div className="font-medium text-foreground">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>
                      {r.session_name ? (
                        <Badge variant="outline" className="bg-blue-50/50">{r.session_name}</Badge>
                      ) : (
                        <span className="text-xs text-yellow-600">Belum pilih sesi</span>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">{r.registration_path} / {r.registration_level}</div>
                    </TableCell>
                    <TableCell>
                      {r.applicant_status === 'passed' ? <Badge className="bg-green-600">Lulus</Badge> :
                       r.applicant_status === 'failed' ? <Badge variant="destructive">Tidak Lulus</Badge> :
                       <Badge variant="secondary">Belum Dinilai</Badge>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet: Panel Penilaian Peserta */}
      <Sheet open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b">
            <SheetTitle>{selectedApplicant?.full_name}</SheetTitle>
            <SheetDescription>
              {selectedApplicant?.registration_path} / {selectedApplicant?.registration_level}<br/>
              Sesi: <span className="font-semibold text-foreground">{selectedApplicant?.session_name || 'Belum pilih sesi'}</span>
            </SheetDescription>
          </SheetHeader>

          {selectedApplicant && (
            <div className="py-4 space-y-6">

              <div className="bg-slate-50 border rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">Status Seleksi (Final)</h3>
                  {selectedApplicant.applicant_status === 'passed' ? <Badge className="bg-green-600">Lulus</Badge> :
                   selectedApplicant.applicant_status === 'failed' ? <Badge variant="destructive">Tidak Lulus</Badge> :
                   <Badge variant="secondary">Belum Dinilai</Badge>}
                </div>

                {canCrud && (
                  <div className="flex gap-2">
                    <Button
                      variant={selectedApplicant.applicant_status === 'passed' ? 'default' : 'outline'}
                      className={selectedApplicant.applicant_status === 'passed' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                      onClick={() => updateApplicantStatus('passed')}
                      disabled={updateStatusMutation.isPending}
                    >
                      Luluskan
                    </Button>
                    <Button
                      variant={selectedApplicant.applicant_status === 'failed' ? 'destructive' : 'outline'}
                      className="flex-1"
                      onClick={() => setShowReason(!showReason)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Tidak Lulus
                    </Button>
                  </div>
                )}

                {(showReason || selectedApplicant.applicant_status === 'failed') && (
                  <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-semibold text-red-900">Alasan Tidak Lulus (Wajib)</label>
                    <Textarea
                      value={reasonText}
                      onChange={e => setReasonText(e.target.value)}
                      placeholder="Contoh: Nilai mengaji tidak memenuhi standar minimum..."
                      className="bg-white"
                      disabled={!canCrud}
                    />
                    {canCrud && selectedApplicant.applicant_status !== 'failed' && (
                       <Button size="sm" variant="destructive" className="w-full" onClick={() => updateApplicantStatus('failed')} disabled={updateStatusMutation.isPending || !reasonText.trim()}>
                         Simpan & Tolak Pendaftar
                       </Button>
                    )}
                    {canCrud && selectedApplicant.applicant_status === 'failed' && (
                       <Button size="sm" variant="outline" className="w-full" onClick={() => updateApplicantStatus('failed')} disabled={updateStatusMutation.isPending}>
                         Update Alasan
                       </Button>
                    )}
                  </div>
                )}
                {canCrud && selectedApplicant.applicant_status !== 'selection' && (
                  <div className="pt-2 text-center">
                    <button className="text-[11px] text-muted-foreground hover:underline" onClick={() => updateApplicantStatus('selection')} disabled={updateStatusMutation.isPending}>
                      Reset ke Belum Dinilai
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Rincian Nilai Ujian</h3>

                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Belum ada struktur penilaian dibuat.</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="space-y-3">
                      <h4 className="text-sm font-medium bg-muted/30 p-2 rounded">{cat.name}</h4>
                      {cat.criteria.length === 0 ? (
                         <p className="text-xs text-muted-foreground pl-2 italic">Tidak ada kriteria.</p>
                      ) : (
                        cat.criteria.map(crit => (
                          <div key={crit.id} className="flex items-center justify-between pl-2">
                            <label className="text-sm text-muted-foreground flex-1">{crit.name}</label>
                            <Input
                              type="number"
                              min={0}
                              className="w-24 text-center"
                              value={appScoreForms[crit.id] || ''}
                              onChange={e => setAppScoreForms(p => ({ ...p, [crit.id]: e.target.value }))}
                              disabled={!canCrud}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}

                <div className="pt-2">
                  <label className="text-sm font-medium mb-1 block">Catatan Tambahan Seleksi</label>
                  <Textarea
                    value={appNotesForm}
                    onChange={e => setAppNotesForm(e.target.value)}
                    placeholder="Catatan dari penguji (opsional)"
                    disabled={!canCrud}
                  />
                </div>

                {canCrud && (
                  <Button className="w-full mt-4" onClick={saveApplicantScores} disabled={saveScoresMutation.isPending}>
                    {saveScoresMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai Ujian'}
                  </Button>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Nilai: {importCategory?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-blue-50 text-blue-900 text-sm rounded-lg flex gap-2">
              <FileSpreadsheet className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Format File Harus Sesuai!</p>
                <p className="text-xs mt-1">Pastikan Anda mengisi data pada file CSV yang diunduh dari tombol "Unduh Template" di tab Struktur Penilaian.</p>
              </div>
            </div>

            <div>
              <Input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
            </div>

            {importErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-red-600 font-semibold text-sm mb-1">
                  <AlertCircle className="h-4 w-4" /> Ada Kesalahan:
                </div>
                <ul className="text-xs text-red-700 list-disc pl-5 space-y-1">
                  {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
                <div className="mt-3 text-center">
                  <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100" onClick={() => setImportModalOpen(false)}>
                    Kembali
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportModalOpen(false)}>Batal</Button>
              <Button onClick={handleImportSubmit} disabled={importing || !importFile}>
                {importing ? 'Memproses...' : 'Upload & Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
