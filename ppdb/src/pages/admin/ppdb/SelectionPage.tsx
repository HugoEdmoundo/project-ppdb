import { useState, useEffect, useCallback, useMemo } from 'react'
import * as api from '../../../api/client'
import { useToast } from '@/components/Toast'
import { useAuth } from '../../../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import {
  ClipboardList, CalendarDays, Plus, Pencil, Trash2, Download, Upload,
  Star, MessageSquare, ListTree, FileSpreadsheet, AlertCircle, XCircle
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────
interface Session {
  id: string
  wave_id: string
  wave_name?: string
  name: string
  session_date?: string
  start_time?: string
  end_time?: string
  location?: string
  description?: string
  quota: number
  booked_count?: number
}

interface SelectionCategory {
  id: string
  wave_id: string
  name: string
  criteria: SelectionCriteria[]
}

interface SelectionCriteria {
  id: string
  category_id: string
  name: string
  
}

interface SelectionResult {
  result_id: string
  applicant_id: string
  full_name: string
  email: string
  registration_path: string
  registration_level: string
  applicant_status: string
  session_id?: string
  session_name?: string
  session_date?: string
  notes?: string
  scores: { criteria_id: string, score: number }[]
}

// ─── CSV Helpers ─────────────────────────────────────────────────────────────
const downloadCSV = (filename: string, rows: string[][]) => {
  const csvContent = rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SelectionPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const canCrud = user?.is_superadmin || user?.permissions?.ppdb === 'crud' || user?.permissions?.selection === 'crud'

  const [activeTab, setActiveTab] = useState<'sesi' | 'kategori' | 'nilai'>('sesi')

  // ── Sesi State ─────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionModal, setSessionModal] = useState<'create' | 'edit' | null>(null)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [sessionForm, setSessionForm] = useState({
    name: '', session_date: '', start_time: '', end_time: '', location: '', description: '', quota: 0
  })
  const [savingSession, setSavingSession] = useState(false)
  const [broadcastModal, setBroadcastModal] = useState<Session | null>(null)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)

  // ── Kategori State ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<SelectionCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '' })
  const [criteriaModal, setCriteriaModal] = useState<string | null>(null) // category_id
  const [critForm, setCritForm] = useState({ name: '',  })

  // ── Nilai State ────────────────────────────────────────────────────────────
  const [results, setResults] = useState<SelectionResult[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [filterSessionId, setFilterSessionId] = useState<string>('all')
  
  // Sheet State
  const [selectedApplicant, setSelectedApplicant] = useState<SelectionResult | null>(null)
  const [appScoreForms, setAppScoreForms] = useState<Record<string, string>>({})
  const [appNotesForm, setAppNotesForm] = useState('')
  const [savingScores, setSavingScores] = useState(false)
  const [showReason, setShowReason] = useState(false)
  const [reasonText, setReasonText] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Import State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importCategory, setImportCategory] = useState<SelectionCategory | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  
  // Download State
  const [downloadModalCat, setDownloadModalCat] = useState<SelectionCategory | null>(null)
  const [downloadSessionFilter, setDownloadSessionFilter] = useState<string>('all')

  // ── Fetching Data ──────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const res = await api.apiFetch<Session[]>('/selection/sessions')
      setSessions(Array.isArray(res) ? res : (res as any).data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat sesi')
    } finally {
      setLoadingSessions(false)
    }
  }, [toast])

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const res = await api.apiFetch<SelectionCategory[]>('/selection/categories')
      setCategories(Array.isArray(res) ? res : (res as any).data || [])
    } catch(e: any) {
      toast('error', e.message || 'Gagal memuat kategori penilaian')
    } finally {
      setLoadingCategories(false)
    }
  }, [toast])

  const fetchResults = useCallback(async () => {
    setLoadingResults(true)
    try {
      const res = await api.apiFetch<SelectionResult[]>('/selection/results')
      const list = Array.isArray(res) ? res : (res as any).data || []
      setResults(list)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat nilai')
    } finally {
      setLoadingResults(false)
    }
  }, [toast])

  useEffect(() => {
    if (activeTab === 'sesi') fetchSessions()
    else if (activeTab === 'kategori') fetchCategories()
    else if (activeTab === 'nilai') {
      fetchSessions()
      fetchCategories()
      fetchResults()
    }
  }, [activeTab])

  // ── Sesi Handlers ──────────────────────────────────────────────────────────
  const openCreateSession = () => {
    setEditSession(null)
    setSessionForm({ name: '', session_date: '', start_time: '', end_time: '', location: '', description: '', quota: 0 })
    setSessionModal('create')
  }

  const openEditSession = (s: Session) => {
    setEditSession(s)
    setSessionForm({
      name: s.name, session_date: s.session_date || '', start_time: s.start_time || '',
      end_time: s.end_time || '', location: s.location || '', description: s.description || '', quota: s.quota || 0
    })
    setSessionModal('edit')
  }

  const saveSession = async () => {
    if (!sessionForm.name.trim()) { toast('error', 'Nama sesi wajib diisi'); return }
    setSavingSession(true)
    try {
      if (sessionModal === 'create') {
        await api.apiFetch('/selection/sessions', { method: 'POST', body: JSON.stringify(sessionForm) })
        toast('success', 'Sesi berhasil dibuat')
      } else if (editSession) {
        await api.apiFetch(`/selection/sessions/${editSession.id}`, { method: 'PUT', body: JSON.stringify(sessionForm) })
        toast('success', 'Sesi berhasil diperbarui')
      }
      setSessionModal(null)
      fetchSessions()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan sesi')
    } finally {
      setSavingSession(false)
    }
  }

  const deleteSession = async (id: string) => {
    if (!confirm('Hapus sesi ini?')) return
    try {
      await api.apiFetch(`/selection/sessions/${id}`, { method: 'DELETE' })
      toast('success', 'Sesi dihapus')
      fetchSessions()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus sesi')
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastModal) return
    if (!broadcastMsg.trim()) { toast('error', 'Pesan tidak boleh kosong'); return }
    setBroadcasting(true)
    try {
      await api.apiFetch(`/selection/sessions/${broadcastModal.id}/broadcast`, {
        method: 'POST', body: JSON.stringify({ message: broadcastMsg })
      })
      toast('success', 'Pesan notifikasi berhasil di-broadcast')
      setBroadcastModal(null)
      setBroadcastMsg('')
    } catch(e: any) {
      toast('error', e.message || 'Gagal mengirim broadcast')
    } finally {
      setBroadcasting(false)
    }
  }

  // ── Kategori Handlers ──────────────────────────────────────────────────────
  const saveCategory = async () => {
    if(!catForm.name) { toast('error', 'Nama kategori wajib diisi'); return }
    try {
      await api.apiFetch('/selection/categories', { method: 'POST', body: JSON.stringify(catForm) })
      toast('success', 'Kategori dibuat')
      setCategoryModal(false)
      fetchCategories()
    } catch(e: any) {
      toast('error', e.message)
    }
  }
  const deleteCategory = async (id: string) => {
    if(!confirm('Hapus kategori ini beserta seluruh kriterianya?')) return
    try {
      await api.apiFetch(`/selection/categories/${id}`, { method: 'DELETE' })
      toast('success', 'Kategori dihapus')
      fetchCategories()
    } catch(e: any) {
      toast('error', e.message)
    }
  }
  const saveCriteria = async () => {
    if(!critForm.name || !criteriaModal) { toast('error', 'Nama wajib diisi'); return }
    try {
      await api.apiFetch(`/selection/categories/${criteriaModal}/criteria`, { method: 'POST', body: JSON.stringify(critForm) })
      toast('success', 'Kriteria ditambah')
      setCriteriaModal(null)
      fetchCategories()
    } catch(e: any) {
      toast('error', e.message)
    }
  }
  const deleteCriteria = async (id: string) => {
    if(!confirm('Hapus kriteria ini?')) return
    try {
      await api.apiFetch(`/selection/criteria/${id}`, { method: 'DELETE' })
      toast('success', 'Kriteria dihapus')
      fetchCategories()
    } catch(e: any) {
      toast('error', e.message)
    }
  }

  const handleDownloadTemplate = () => {
    if (!downloadModalCat) return;
    const cat = downloadModalCat;
    
    // Filter results based on selected session
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

  // ── Import Handlers ────────────────────────────────────────────────────────
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
        
        // Find existing notes from current results to preserve them
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
      fetchResults()
    } catch (e: any) {
      setImportErrors([e.message || 'Gagal memproses file. Pastikan format CSV valid.'])
    } finally {
      setImporting(false)
    }
  }

  // ── Nilai Drawer Handlers ──────────────────────────────────────────────────
  const openApplicantDrawer = (app: SelectionResult) => {
    setSelectedApplicant(app)
    
    // Set status info
    setShowReason(false)
    setReasonText(app.notes || "") // We use notes as rejection reason in selection context

    // Set score inputs
    const sf: Record<string, string> = {}
    app.scores?.forEach(s => {
      sf[s.criteria_id] = String(s.score)
    })
    setAppScoreForms(sf)
    setAppNotesForm(app.notes || '')
  }

  const saveApplicantScores = async () => {
    if (!selectedApplicant) return
    setSavingScores(true)
    try {
      const payloadScores = Object.entries(appScoreForms).map(([cid, score]) => ({
        criteria_id: cid,
        score: parseFloat(score || '0')
      }))
      
      await api.apiFetch('/selection/results', {
        method: 'POST',
        body: JSON.stringify({
          applicant_id: selectedApplicant.applicant_id,
          scores: payloadScores,
          notes: appNotesForm || null
        }),
      })
      toast('success', 'Nilai berhasil disimpan')
      fetchResults()
      
      // Update local state to reflect change without full reload
      setSelectedApplicant({
        ...selectedApplicant, 
        notes: appNotesForm, 
        scores: payloadScores 
      })
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan nilai')
    } finally {
      setSavingScores(false)
    }
  }

  const updateApplicantStatus = async (status: string) => {
    if (!selectedApplicant) return
    setUpdatingStatus(true)
    try {
      await api.apiFetch(`/selection/results/${selectedApplicant.applicant_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: status,
          reason: status === 'failed' ? reasonText : null
        })
      })
      toast('success', `Status pendaftar diubah menjadi ${status === 'passed' ? 'Lulus' : status === 'failed' ? 'Tidak Lulus' : 'Belum Dinilai'}`)
      
      // Refresh UI
      const updatedApp = { ...selectedApplicant, applicant_status: status, notes: status === 'failed' ? reasonText : selectedApplicant.notes }
      setSelectedApplicant(updatedApp)
      
      setResults(prev => prev.map(r => r.applicant_id === updatedApp.applicant_id ? updatedApp : r))
      
      if(status === 'passed' || status === 'selection') setShowReason(false)
      
    } catch(e: any) {
      toast('error', e.message || 'Gagal mengubah status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredResults = useMemo(() => {
    if (filterSessionId === 'all') return results
    if (filterSessionId === 'none') return results.filter(r => !r.session_id)
    return results.filter(r => r.session_id === filterSessionId)
  }, [results, filterSessionId])

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Manajemen Seleksi Dinamis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola sesi ujian (booking), kriteria penilaian, dan input nilai peserta.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="sesi">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Jadwal Sesi
          </TabsTrigger>
          <TabsTrigger value="kategori">
            <ListTree className="h-4 w-4 mr-1.5" />
            Struktur Penilaian
          </TabsTrigger>
          <TabsTrigger value="nilai">
            <Star className="h-4 w-4 mr-1.5" />
            Penilai & Status
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Tab: Sesi ──────────────────────────────────────────────────────── */}
      {activeTab === 'sesi' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <h2 className="font-semibold text-foreground">Sesi Ujian Seleksi</h2>
              <p className="text-sm text-muted-foreground">Buat kuota sesi. Peserta akan booking mandiri di dashboard mereka.</p>
            </div>
            {canCrud && (
              <Button size="sm" onClick={openCreateSession}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Sesi
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Sesi</TableHead>
                    <TableHead>Jadwal & Lokasi</TableHead>
                    <TableHead>Kuota Booking</TableHead>
                    {canCrud && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSessions ? (
                    <TableSkeletonRows cols={canCrud ? 4 : 3} />
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canCrud ? 4 : 3}>
                        <EmptyState icon={CalendarDays} title="Belum ada sesi" description="Tambahkan sesi seleksi terlebih dahulu" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.name}
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            <span className="text-muted-foreground mx-1">|</span>
                            {s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : s.start_time || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.location}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {s.booked_count || 0} / {s.quota === 0 ? 'Tak Terbatas' : s.quota}
                          </Badge>
                        </TableCell>
                        {canCrud && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" title="Broadcast Pesan" onClick={() => setBroadcastModal(s)}>
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEditSession(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteSession(s.id)}>
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
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Kategori & Kriteria (Struktur Penilaian) ───────────────────── */}
      {activeTab === 'kategori' && (
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
                    
                    {/* Action Buttons in Card */}
                    {canCrud && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 border-dashed" onClick={() => { setCritForm({ name: '',  }); setCriteriaModal(cat.id); }}>
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
        </div>
      )}

      {/* ── Tab: Penilai & Status ───────────────────────────────────────────── */}
      {activeTab === 'nilai' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div>
                  <CardTitle>Penilaian & Status Lulus</CardTitle>
                  <CardDescription>Pilih peserta untuk input nilai atau mengubah status kelulusan</CardDescription>
                </div>
                
                {/* Tools: Filter & Import */}
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
                           r.applicant_status === 'failed' ? <Badge variant="danger">Tidak Lulus</Badge> :
                           <Badge variant="secondary">Belum Dinilai</Badge>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sheet: Panel Penilaian Peserta ──────────────────────────────────── */}
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
              
              {/* STATUS KELULUSAN CARD */}
              <div className="bg-slate-50 border rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">Status Seleksi (Final)</h3>
                  {selectedApplicant.applicant_status === 'passed' ? <Badge className="bg-green-600">Lulus</Badge> :
                   selectedApplicant.applicant_status === 'failed' ? <Badge variant="danger">Tidak Lulus</Badge> :
                   <Badge variant="secondary">Belum Dinilai</Badge>}
                </div>
                
                {canCrud && (
                  <div className="flex gap-2">
                    <Button 
                      variant={selectedApplicant.applicant_status === 'passed' ? 'default' : 'outline'} 
                      className={selectedApplicant.applicant_status === 'passed' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                      onClick={() => updateApplicantStatus('passed')}
                      disabled={updatingStatus}
                    >
                      Luluskan
                    </Button>
                    <Button 
                      variant={selectedApplicant.applicant_status === 'failed' ? 'danger' : 'outline'} 
                      className="flex-1"
                      onClick={() => setShowReason(!showReason)}
                      disabled={updatingStatus}
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
                       <Button size="sm" variant="danger" className="w-full" onClick={() => updateApplicantStatus('failed')} disabled={updatingStatus || !reasonText.trim()}>
                         Simpan & Tolak Pendaftar
                       </Button>
                    )}
                    {canCrud && selectedApplicant.applicant_status === 'failed' && (
                       <Button size="sm" variant="outline" className="w-full" onClick={() => updateApplicantStatus('failed')} disabled={updatingStatus}>
                         Update Alasan
                       </Button>
                    )}
                  </div>
                )}
                {canCrud && selectedApplicant.applicant_status !== 'selection' && (
                  <div className="pt-2 text-center">
                    <button className="text-[11px] text-muted-foreground hover:underline" onClick={() => updateApplicantStatus('selection')} disabled={updatingStatus}>
                      Reset ke Belum Dinilai
                    </button>
                  </div>
                )}
              </div>

              {/* DYNAMIC SCORES FORM */}
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
                  <Button className="w-full mt-4" onClick={saveApplicantScores} disabled={savingScores}>
                    {savingScores ? 'Menyimpan...' : 'Simpan Nilai Ujian'}
                  </Button>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modal: Import CSV ──────────────────────────────────────────────── */}
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
                  <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100" onClick={() => {
                    setImportModalOpen(false)
                    setActiveTab('kategori')
                  }}>
                    Kembali & Unduh Template Ulang
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

      {/* ── Modal: Sesi ───────────────────────────────────────────────────── */}
      <Dialog open={!!sessionModal} onOpenChange={() => setSessionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sessionModal === 'create' ? 'Tambah Sesi Seleksi' : 'Edit Sesi Seleksi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Nama Sesi <span className="text-destructive">*</span></label>
                <Input className="mt-1" placeholder="cth: Gel 1 - Sesi Pagi" value={sessionForm.name} onChange={e => setSessionForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Kuota Peserta</label>
                <Input type="number" min={0} className="mt-1" placeholder="0 = tak terbatas" value={sessionForm.quota} onChange={e => setSessionForm(p => ({ ...p, quota: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tanggal</label>
                <Input type="date" className="mt-1" value={sessionForm.session_date} onChange={e => setSessionForm(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Lokasi</label>
                <Input className="mt-1" placeholder="Ruang / Gedung" value={sessionForm.location} onChange={e => setSessionForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Jam Mulai</label>
                <Input type="time" className="mt-1" value={sessionForm.start_time} onChange={e => setSessionForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Jam Selesai</label>
                <Input type="time" className="mt-1" value={sessionForm.end_time} onChange={e => setSessionForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi / Instruksi Singkat</label>
              <Textarea className="mt-1" rows={2} placeholder="Misal: Bawa pensil 2B dan kartu ujian" value={sessionForm.description} onChange={e => setSessionForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSessionModal(null)}>Batal</Button>
              <Button onClick={saveSession} disabled={savingSession}>
                {savingSession ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Broadcast ─────────────────────────────────────────────────── */}
      <Dialog open={!!broadcastModal} onOpenChange={() => setBroadcastModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Kirim Notifikasi Massal</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p>Mengirim pesan ke semua peserta di sesi: <span className="font-semibold">{broadcastModal?.name}</span></p>
            </div>
            <div>
              <label className="text-sm font-medium">Pesan Notifikasi</label>
              <Textarea className="mt-2" rows={4} placeholder="Ketik instruksi tambahan..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBroadcastModal(null)}>Batal</Button>
              <Button onClick={handleBroadcast} disabled={broadcasting}>{broadcasting ? 'Mengirim...' : 'Kirim Sekarang'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Kategori Utama ────────────────────────────────────────────── */}
      <Dialog open={categoryModal} onOpenChange={setCategoryModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kategori Ujian</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input className="mt-1" placeholder="cth: Ujian Al-Quran" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex justify-end"><Button onClick={saveCategory}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Kriteria ──────────────────────────────────────────────────── */}
      <Dialog open={!!criteriaModal} onOpenChange={() => setCriteriaModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kriteria Penilaian</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Nama Kriteria</label>
              <Input className="mt-1" placeholder="cth: Tajwid / Matematika" value={critForm.name} onChange={e => setCritForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex justify-end"><Button onClick={saveCriteria}>Simpan</Button></div>
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
