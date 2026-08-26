import { useState, useEffect, useCallback } from 'react'
import * as api from '../../../api/client'
import { useToast } from '@/components/Toast'
import { useAuth } from '../../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import {
  ClipboardList, CalendarDays, Plus, Pencil, Trash2,
  CheckCircle, XCircle, Star, MessageSquare, ListTree
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
  max_score: number
}

interface SelectionResult {
  result_id: string
  applicant_id: string
  full_name: string
  email: string
  registration_path: string
  registration_level: string
  applicant_status: string
  wave_name?: string
  session_name?: string
  session_date?: string
  notes?: string
  scores: { criteria_id: string, score: number }[]
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SelectionPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const canCrud = user?.is_superadmin || user?.permissions?.ppdb === 'crud' || user?.permissions?.selection === 'crud'

  const [activeTab, setActiveTab] = useState<'sesi' | 'kategori' | 'nilai'>('sesi')

  // ── Sesi ───────────────────────────────────────────────────────────────────
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

  const openCreateSession = () => {
    setEditSession(null)
    setSessionForm({ name: '', session_date: '', start_time: '', end_time: '', location: '', description: '', quota: 0 })
    setSessionModal('create')
  }

  const openEditSession = (s: Session) => {
    setEditSession(s)
    setSessionForm({
      name: s.name,
      session_date: s.session_date || '',
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      location: s.location || '',
      description: s.description || '',
      quota: s.quota || 0
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
      await fetchSessions()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan sesi')
    } finally {
      setSavingSession(false)
    }
  }

  const deleteSession = async (id: string) => {
    if (!confirm('Hapus sesi ini? Peserta yang sudah memilih sesi ini akan kehilangan jadwal mereka.')) return
    try {
      await api.apiFetch(`/selection/sessions/${id}`, { method: 'DELETE' })
      toast('success', 'Sesi dihapus')
      await fetchSessions()
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
        method: 'POST',
        body: JSON.stringify({ message: broadcastMsg })
      })
      toast('success', 'Pesan notifikasi berhasil di-broadcast ke seluruh peserta sesi')
      setBroadcastModal(null)
      setBroadcastMsg('')
    } catch(e: any) {
      toast('error', e.message || 'Gagal mengirim broadcast')
    } finally {
      setBroadcasting(false)
    }
  }

  // ── Kategori & Kriteria ────────────────────────────────────────────────────
  const [categories, setCategories] = useState<SelectionCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '' })
  const [criteriaModal, setCriteriaModal] = useState<string | null>(null) // category_id
  const [critForm, setCritForm] = useState({ name: '', max_score: 100 })

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

  // ── Nilai Dinamis ──────────────────────────────────────────────────────────
  const [results, setResults] = useState<SelectionResult[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [editingResult, setEditingResult] = useState<string | null>(null) // applicant_id
  const [scoreForms, setScoreForms] = useState<Record<string, Record<string, string>>>({}) // applicant_id -> criteria_id -> score
  const [noteForms, setNoteForms] = useState<Record<string, string>>({}) // applicant_id -> notes
  const [savingResult, setSavingResult] = useState<string | null>(null)
  
  // Ambil data nilai
  const fetchResults = useCallback(async () => {
    setLoadingResults(true)
    try {
      const res = await api.apiFetch<SelectionResult[]>('/selection/results')
      const list = Array.isArray(res) ? res : (res as any).data || []
      setResults(list)
      
      const sf: Record<string, Record<string, string>> = {}
      const nf: Record<string, string> = {}
      
      list.forEach((r: SelectionResult) => {
        sf[r.applicant_id] = {}
        r.scores?.forEach(s => {
          sf[r.applicant_id][s.criteria_id] = String(s.score)
        })
        nf[r.applicant_id] = r.notes || ''
      })
      setScoreForms(sf)
      setNoteForms(nf)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat nilai')
    } finally {
      setLoadingResults(false)
    }
  }, [toast])

  const saveResult = async (applicantId: string) => {
    setSavingResult(applicantId)
    try {
      const applicantScores = scoreForms[applicantId] || {}
      const payloadScores = Object.entries(applicantScores).map(([cid, score]) => ({
        criteria_id: cid,
        score: parseFloat(score || '0')
      }))
      
      await api.apiFetch('/selection/results', {
        method: 'POST',
        body: JSON.stringify({
          applicant_id: applicantId,
          scores: payloadScores,
          notes: noteForms[applicantId] || null
        }),
      })
      toast('success', 'Nilai berhasil disimpan')
      setEditingResult(null)
      await fetchResults()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan nilai')
    } finally {
      setSavingResult(null)
    }
  }


  // ── Tab change data fetching ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'sesi') fetchSessions()
    else if (activeTab === 'kategori') fetchCategories()
    else if (activeTab === 'nilai') {
      fetchCategories()
      fetchResults()
    }
  }, [activeTab])


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
            Kriteria Penilaian
          </TabsTrigger>
          <TabsTrigger value="nilai">
            <Star className="h-4 w-4 mr-1.5" />
            Input Nilai
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
                    <TableSkeletonRows cols={canCrud ? 5 : 4} />
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canCrud ? 5 : 4}>
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

      {/* ── Tab: Kategori & Kriteria ────────────────────────────────────────── */}
      {activeTab === 'kategori' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Buat struktur penilaian per gelombang secara dinamis.
            </p>
            {canCrud && (
              <Button size="sm" onClick={() => { setCatForm({ name: '' }); setCategoryModal(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Kategori Utama
              </Button>
            )}
          </div>

          {loadingCategories ? (
            <div className="p-8 text-center text-muted-foreground">Memuat struktur...</div>
          ) : categories.length === 0 ? (
            <Card><CardContent className="p-8"><EmptyState icon={ListTree} title="Belum ada Kategori" description="Buat kategori penilaian untuk memulai input nilai custom" /></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {categories.map(cat => (
                <Card key={cat.id}>
                  <CardHeader className="py-4 flex flex-row justify-between items-center bg-muted/20 border-b">
                    <div>
                      <h3 className="font-semibold text-lg">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">{cat.criteria?.length || 0} Kriteria</p>
                    </div>
                    {canCrud && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setCritForm({ name: '', max_score: 100 }); setCriteriaModal(cat.id); }}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Kriteria
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {(!cat.criteria || cat.criteria.length === 0) ? (
                          <TableRow><TableCell className="text-center text-muted-foreground text-sm italic py-4">Belum ada kriteria, klik tambah kriteria.</TableCell></TableRow>
                        ) : (
                          cat.criteria.map(crit => (
                            <TableRow key={crit.id}>
                              <TableCell className="w-10">
                                <div className="h-2 w-2 rounded-full bg-primary mx-auto"></div>
                              </TableCell>
                              <TableCell className="font-medium">{crit.name}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">Max Nilai: {crit.max_score}</TableCell>
                              {canCrud && (
                                <TableCell className="text-right">
                                  <Button size="sm" variant="ghost" className="text-destructive h-8 px-2" onClick={() => deleteCriteria(crit.id)}>Hapus</Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Input Nilai ───────────────────────────────────────────────── */}
      {activeTab === 'nilai' && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                Input nilai pendaftar sesuai kriteria yang dibuat.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Pendaftar & Sesi</TableHead>
                    {/* Render dynamic columns based on criteria inside each category */}
                    {categories.map(cat => (
                      <TableHead key={cat.id} className="min-w-40 border-l bg-muted/20 text-center" colSpan={cat.criteria.length || 1}>
                        <div className="text-xs uppercase tracking-wider">{cat.name}</div>
                      </TableHead>
                    ))}
                    <TableHead className="border-l min-w-48">Catatan Umum</TableHead>
                    {canCrud && <TableHead className="text-right sticky right-0 bg-background shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">Aksi</TableHead>}
                  </TableRow>
                  <TableRow>
                    <TableHead></TableHead>
                    {categories.map(cat => (
                      cat.criteria.length === 0 ? <TableHead key={`${cat.id}-none`} className="border-l bg-muted/10"></TableHead> :
                      cat.criteria.map(crit => (
                        <TableHead key={crit.id} className="border-l bg-muted/10 text-xs text-center">{crit.name}</TableHead>
                      ))
                    ))}
                    <TableHead className="border-l"></TableHead>
                    {canCrud && <TableHead className="sticky right-0 bg-background"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingResults ? (
                    <TableSkeletonRows cols={categories.reduce((a,c) => a + Math.max(1, c.criteria.length), 3)} />
                  ) : results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <EmptyState icon={Star} title="Belum ada pendaftar" description="Belum ada pendaftar yang masuk tahap seleksi." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map(r => {
                      const isEditing = editingResult === r.applicant_id
                      const appScoreForm = scoreForms[r.applicant_id] || {}
                      
                      return (
                        <TableRow key={r.applicant_id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{r.full_name}</div>
                            <div className="text-xs text-muted-foreground">{r.registration_path} / {r.registration_level}</div>
                            {r.session_name ? (
                              <Badge variant="outline" className="mt-1 bg-blue-50">{r.session_name}</Badge>
                            ) : (
                              <span className="text-xs text-yellow-600 block mt-1">Belum pilih sesi</span>
                            )}
                          </TableCell>
                          
                          {/* Dynamic Score Columns */}
                          {categories.map(cat => (
                            cat.criteria.length === 0 ? <TableCell key={`${cat.id}-none`} className="border-l text-center">-</TableCell> :
                            cat.criteria.map(crit => (
                              <TableCell key={crit.id} className="border-l text-center p-2">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min={0} max={crit.max_score}
                                    className="w-16 h-8 text-center mx-auto px-1"
                                    value={appScoreForm[crit.id] || ''}
                                    onChange={e => {
                                      const val = e.target.value
                                      setScoreForms(prev => ({ ...prev, [r.applicant_id]: { ...prev[r.applicant_id], [crit.id]: val } }))
                                    }}
                                  />
                                ) : (
                                  <span className="font-semibold">{appScoreForm[crit.id] ? appScoreForm[crit.id] : '-'}</span>
                                )}
                              </TableCell>
                            ))
                          ))}
                          
                          <TableCell className="border-l">
                            {isEditing ? (
                              <Input
                                className="h-8 min-w-32"
                                value={noteForms[r.applicant_id] || ''}
                                onChange={e => setNoteForms(prev => ({ ...prev, [r.applicant_id]: e.target.value }))}
                                placeholder="Catatan (ops)"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{noteForms[r.applicant_id] || '-'}</span>
                            )}
                          </TableCell>

                          {canCrud && (
                            <TableCell className="text-right sticky right-0 bg-background shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                              {isEditing ? (
                                <div className="flex flex-col gap-1 items-end">
                                  <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveResult(r.applicant_id)} disabled={savingResult === r.applicant_id}>
                                    {savingResult === r.applicant_id ? 'Wait...' : 'Simpan'}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingResult(null)}>Batal</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingResult(r.applicant_id)}>
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit Nilai
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modal: Sesi ───────────────────────────────────────────────────── */}
      <Dialog open={!!sessionModal} onOpenChange={() => setSessionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sessionModal === 'create' ? 'Tambah Sesi Seleksi' : 'Edit Sesi Seleksi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Nama Sesi <span className="text-destructive">*</span></label>
                <Input className="mt-1" placeholder="cth: Gel 1 - Sesi Pagi" value={sessionForm.name} onChange={e => setSessionForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Kuota Peserta</label>
                <Input type="number" min={0} className="mt-1" placeholder="0 = tak terbatas" value={sessionForm.quota} onChange={e => setSessionForm(p => ({ ...p, quota: parseInt(e.target.value) || 0 }))} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Isi 0 untuk tak terbatas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Tanggal</label>
                <Input type="date" className="mt-1" value={sessionForm.session_date} onChange={e => setSessionForm(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Lokasi</label>
                <Input className="mt-1" placeholder="Ruang / Gedung" value={sessionForm.location} onChange={e => setSessionForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Jam Mulai</label>
                <Input type="time" className="mt-1" value={sessionForm.start_time} onChange={e => setSessionForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Jam Selesai</label>
                <Input type="time" className="mt-1" value={sessionForm.end_time} onChange={e => setSessionForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Deskripsi / Instruksi Singkat</label>
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
          <DialogHeader>
            <DialogTitle>Kirim Notifikasi Massal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p>Mengirim pesan WhatsApp dan Email ke semua peserta di sesi:</p>
              <p className="font-semibold">{broadcastModal?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Pesan Notifikasi</label>
              <Textarea 
                className="mt-2" rows={4} 
                placeholder="Ketik instruksi tambahan atau info perubahan lokasi di sini..."
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBroadcastModal(null)}>Batal</Button>
              <Button onClick={handleBroadcast} disabled={broadcasting}>
                {broadcasting ? 'Mengirim...' : 'Kirim Sekarang'}
              </Button>
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
            <div>
              <label className="text-sm font-medium">Nilai Maksimal</label>
              <Input type="number" className="mt-1" value={critForm.max_score} onChange={e => setCritForm(p => ({ ...p, max_score: parseFloat(e.target.value) || 100 }))} />
            </div>
            <div className="flex justify-end"><Button onClick={saveCriteria}>Simpan</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
