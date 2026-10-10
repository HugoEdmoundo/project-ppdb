import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
  Textarea,
  EmptyState,
} from '@/components/ui'
import {
  BookOpen,
  Plus,
  CalendarDays,
  Clock,
  MapPin,
  Video,
  User,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  Phone,
  Tag,
} from 'lucide-react'
import SessionDocSheet from './components/SessionDocSheet'
import { cn } from '@/lib/utils'

interface Sessions1on1PageProps {
  forcedType?: 'tahfidz' | 'interview'
}

export default function Sessions1on1Page({ forcedType }: Sessions1on1PageProps) {
  const { type: paramType } = useParams<{ type?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCan('ppdb', 'crud')
  const { user } = useAuth()

  // Determine session type (tahfidz or interview)
  const currentType: 'tahfidz' | 'interview' =
    forcedType ||
    (paramType === 'wawancara' || paramType === 'interview' ? 'interview' : 'tahfidz')

  const isTahfidz = currentType === 'tahfidz'
  const titleLabel = isTahfidz ? 'Session 1:1 Tahfidz' : 'Session 1:1 Wawancara'
  const officerLabel = isTahfidz ? 'Nama Penguji' : 'Nama Pewawancara'
  const targetRoute = isTahfidz ? 'tahfidz' : 'wawancara'

  // Documentation Sheet State
  const [docSheetOpen, setDocSheetOpen] = useState(false)

  // Filter and Search States
  const [statusFilter, setStatusFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Create / Edit Modal State
  const [sessionModal, setSessionModal] = useState<'create' | 'edit' | null>(null)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    session_date: '',
    start_time: '',
    mode: 'offline' as 'online' | 'offline',
    officer_name: '',
    location: '',
    meeting_url: '',
    description: '',
  })

  // Fetch sessions for current type
  const { data: sessionResponse, isLoading } = useQuery({
    queryKey: ['selection-sessions', currentType],
    queryFn: async () => {
      const res = await api.apiFetch<any>(`/selection/sessions?type=${currentType}`)
      return res?.data || []
    },
    refetchInterval: 15000, // Live poll every 15s to reflect take-session & auto-deletions
  })

  const sessions: any[] = sessionResponse || []

  // Create / Edit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        session_type: currentType,
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: null,
        mode: form.mode,
        officer_name: form.officer_name.trim(),
        location: form.mode === 'offline' ? form.location.trim() : null,
        meeting_url: form.mode === 'online' ? form.meeting_url.trim() : null,
        description: form.description.trim() || null,
        quota: 1, // Session 1:1
      }

      if (sessionModal === 'create') {
        return await api.apiFetch('/selection/sessions', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } else {
        return await api.apiFetch(`/selection/sessions/${selectedSession.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      }
    },
    onSuccess: () => {
      toast('success', sessionModal === 'create' ? 'Session 1:1 berhasil dibuat' : 'Session berhasil diperbarui')
      setSessionModal(null)
      queryClient.invalidateQueries({ queryKey: ['selection-sessions'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan session')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.apiFetch(`/selection/sessions/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      toast('success', 'Session berhasil dihapus')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['selection-sessions'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menghapus session')
    },
  })

  // Open Create Modal with smart defaults
  const handleOpenCreate = () => {
    setSelectedSession(null)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = tomorrow.toISOString().split('T')[0]
    setForm({
      name: `${isTahfidz ? 'Session Tahfidz' : 'Session Wawancara'} #${sessions.length + 1}`,
      session_date: defaultDate,
      start_time: '08:00',
      mode: 'offline',
      officer_name: '',
      location: 'Ruang Ujian PPDB',
      meeting_url: '',
      description: '',
    })
    setSessionModal('create')
  }

  // Open Edit Modal
  const handleOpenEdit = (s: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSession(s)
    setForm({
      name: s.name || '',
      session_date: s.session_date ? s.session_date.split('T')[0] : '',
      start_time: s.start_time || '',
      mode: s.mode || 'offline',
      officer_name: s.officer_name || '',
      location: s.location || '',
      meeting_url: s.meeting_url || '',
      description: s.description || '',
    })
    setSessionModal('edit')
  }

  // Handle Save
  const handleSave = () => {
    if (!form.name.trim()) return toast('error', 'Nama session wajib diisi')
    if (!form.session_date) return toast('error', 'Tanggal session wajib diisi')
    if (!form.start_time) return toast('error', 'Jam mulai session wajib diisi')
    if (!form.officer_name.trim()) return toast('error', `${officerLabel} wajib diisi`)
    if (form.mode === 'online' && !form.meeting_url.trim()) return toast('error', 'Tautan Zoom/Meet wajib diisi untuk session online')
    if (form.mode === 'offline' && !form.location.trim()) return toast('error', 'Ruangan/Lokasi wajib diisi untuk session offline')

    saveMutation.mutate()
  }

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: sessions.length,
      red: sessions.filter((s) => s.status_color === 'red').length,
      yellow: sessions.filter((s) => s.status_color === 'yellow').length,
      green: sessions.filter((s) => s.status_color === 'green').length,
    }
  }, [sessions])

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status_color !== statusFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (s.name || '').toLowerCase().includes(q)
        const matchOfficer = (s.officer_name || '').toLowerCase().includes(q)
        const matchApplicant = (s.booked_applicant?.full_name || '').toLowerCase().includes(q)
        const matchLocation = (s.location || '').toLowerCase().includes(q)
        return matchName || matchOfficer || matchApplicant || matchLocation
      }
      return true
    })
  }, [sessions, statusFilter, searchQuery])

  // Split sessions: Session Saya vs Semua Session
  const mySessions = useMemo(() => {
    return filteredSessions.filter((s) => s.created_by && user?.id && s.created_by === user.id)
  }, [filteredSessions, user])

  const allSessions = filteredSessions

  // Render individual session card with clean white background and clear status color indicator
  const renderSessionCard = (s: any) => {
    const isRed = s.status_color === 'red'
    const isYellow = s.status_color === 'yellow'
    const isGreen = s.status_color === 'green'
    const isMySession = !!(s.created_by && user?.id && s.created_by === user.id)

    return (
      <div
        key={s.id}
        onClick={() => {
          // If booked (Yellow or Green), click card directly opens Evaluation Page!
          if (!isRed) {
            navigate(`/admin/sessions/${targetRoute}/evaluasi/${s.id}`)
          }
        }}
        className={cn(
          "group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition-all duration-200 select-none shadow-xs",
          isRed && "border-slate-200 border-l-4 border-l-red-500 hover:border-slate-300",
          isYellow && "border-slate-200 border-l-4 border-l-amber-500 hover:border-amber-400 hover:shadow-md cursor-pointer",
          isGreen && "border-slate-200 border-l-4 border-l-emerald-500 hover:border-emerald-400 hover:shadow-xs cursor-pointer"
        )}
      >
        {/* Card Top: Title & Status Badge */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    isRed && "bg-red-500 animate-pulse",
                    isYellow && "bg-amber-500",
                    isGreen && "bg-emerald-500"
                  )}
                />
                <h3 className="font-bold text-sm text-slate-900 truncate">
                  {s.name}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground block">
                  Session 1:1 ({s.session_type === 'interview' ? 'Wawancara' : 'Tahfidz'})
                </span>
                {s.wave_name && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 font-medium inline-flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5 shrink-0" />
                    <span>{s.wave_name}</span>
                  </Badge>
                )}
                {isMySession && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1 bg-slate-50 text-slate-600 border-slate-200 font-normal">
                    Milik Saya
                  </Badge>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {isRed && (
              <Badge variant="destructive" className="text-[10px] font-bold uppercase shrink-0">
                Belum Diambil
              </Badge>
            )}
            {isYellow && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold uppercase shrink-0 animate-pulse">
                Siap Diuji
              </Badge>
            )}
            {isGreen && (
              <Badge variant="success" className="text-[10px] font-bold uppercase shrink-0">
                Selesai ({s.evaluated_score || 100})
              </Badge>
            )}
          </div>

          {/* Session Detail: Tanggal, Jam, Lokasi */}
          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-800">
                {s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{s.start_time || '-'} – Selesai WIB</span>
            </div>
            <div className="flex items-center gap-2">
              {s.mode === 'online' ? (
                <>
                  <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate text-blue-700">Online: {s.meeting_url || 'Zoom/Meet'}</span>
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Offline: {s.location || 'Ruang Seleksi'}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800">
                {s.officer_name || '-'}
              </span>
            </div>
          </div>

          {/* Booked Applicant Info Banner (Yellow or Green) */}
          {s.booked_applicant && (
            <div
              className={cn(
                "p-3 rounded-xl border space-y-1 text-xs",
                isYellow && "bg-amber-50 border-amber-200 text-amber-900",
                isGreen && "bg-emerald-50 border-emerald-200 text-emerald-900"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {isGreen ? 'Santri Telah Dinilai' : 'Calon Santri (Booked)'}
                </span>
                {isGreen && s.evaluated_score && (
                  <span className="font-black text-xs text-emerald-800">
                    Skor: {s.evaluated_score}
                  </span>
                )}
              </div>
              <div className="font-bold text-sm truncate">
                {s.booked_applicant.full_name}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>NISN: {s.booked_applicant.nisn || '-'}</span>
                {s.booked_applicant.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3" />
                    {s.booked_applicant.phone}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Left CTA / Hint */}
          <div className="text-[11px]">
            {isRed && (
              <span className="text-slate-400 italic">
                Menunggu pendaftar booking
              </span>
            )}
            {isYellow && (
              <span className="text-amber-700 font-semibold flex items-center gap-1 group-hover:underline">
                Klik kartu untuk input nilai <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
            {isGreen && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1 group-hover:underline">
                Klik kartu untuk lihat evaluasi <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </div>

          {/* Edit / Delete Buttons (only when unbooked and canCrud) */}
          {canCrud && isRed && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={(e) => handleOpenEdit(s, e)}
                title="Edit Session"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-600"
                onClick={() => setDeleteId(s.id)}
                title="Hapus Session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header Bar ── */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{titleLabel}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manajemen slot seleksi tatap muka 1:1. Slot dibersihkan jika tidak diambil pendaftar sampai waktu pelaksanaan.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {/* CTA Lucide: book-open -> icon only without label and without card container */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDocSheetOpen(true)}
              className="h-10 w-10 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Panduan & Cara Kerja Session 1:1"
            >
              <BookOpen className="h-5 w-5" />
            </Button>

            {/* Create Session Button */}
            {canCrud && (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Session Baru</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status Indicators Quick Filter Bar (Compact without long text labels) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                statusFilter === 'all'
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <span>Semua</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('red')}
              title="Belum Diambil (Merah)"
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border",
                statusFilter === 'red'
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-white text-red-700 border-red-200 hover:bg-red-50"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="font-mono text-xs">{counts.red}</span>
            </button>

            <button
              onClick={() => setStatusFilter('yellow')}
              title="Siap Diuji (Kuning)"
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border",
                statusFilter === 'yellow'
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-mono text-xs">{counts.yellow}</span>
            </button>

            <button
              onClick={() => setStatusFilter('green')}
              title="Selesai Dinilai (Hijau)"
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border",
                statusFilter === 'green'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono text-xs">{counts.green}</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari penguji, santri, session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-48 rounded-2xl bg-slate-100 animate-pulse border" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Section 1: Session yang Dibuat Saya (Admin yang Sedang Login) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  Session Saya
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">
                    {mySessions.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Slot session yang dibuat dan dijadwalkan oleh Anda sendiri.
                </p>
              </div>
            </div>

            {mySessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Anda belum membuat slot session pada jenis ini.
                </p>
                {canCrud && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCreate}
                    className="mt-2 text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Buat Session Baru
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mySessions.map(renderSessionCard)}
              </div>
            )}
          </div>

          {/* ── Section 2: Semua Session ── */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-600" />
                  Semua Session
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold">
                    {allSessions.length}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Seluruh slot session pada gelombang aktif ini dari semua penguji/admin.
                </p>
              </div>
            </div>

            {allSessions.length === 0 ? (
              <Card className="p-8 border-dashed">
                <EmptyState
                  title="Tidak Ada Session yang Sesuai"
                  description={
                    searchQuery
                      ? 'Tidak ditemukan session yang cocok dengan kata kunci pencarian.'
                      : statusFilter !== 'all'
                      ? 'Belum ada session dengan status filter yang dipilih.'
                      : `Belum ada ${titleLabel} yang dibuat panitia. Klik tombol "Buat Session Baru" untuk menambahkan slot.`
                  }
                  action={
                    canCrud && (
                      <Button onClick={handleOpenCreate} size="sm" className="gap-2 mt-2">
                        <Plus className="h-4 w-4" /> Buat Session Baru
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSessions.map(renderSessionCard)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Documentation Slide-Over Sheet (BookOpen CTA) ── */}
      <SessionDocSheet
        open={docSheetOpen}
        onOpenChange={setDocSheetOpen}
        sessionType={currentType}
      />

      {/* ── Modal Dialog Tambah / Edit Session 1:1 ── */}
      <Dialog open={sessionModal !== null} onOpenChange={(open) => !open && setSessionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {sessionModal === 'create' ? 'Buat Session 1:1 Baru' : 'Edit Session 1:1'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Session 1:1 adalah slot personal untuk 1 orang calon santri. Wajib mengisi jadwal, evaluator, dan lokasi/link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Nama Session */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Nama Session</label>
              <Input
                placeholder="Contoh: Sesi Pagi 1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {/* Tanggal & Jam Mulai (Tanpa Jam Selesai) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Tanggal Pelaksanaan</label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                  className="h-9 text-xs px-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">Jam Mulai (WIB)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="h-9 text-xs px-2 flex-1"
                  />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">s/d Selesai</span>
                </div>
              </div>
            </div>

            {/* Nama Evaluator */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">{officerLabel}</label>
              <Input
                placeholder={isTahfidz ? 'Contoh: Ustaz Ahmad Dahlan, Lc.' : 'Contoh: Dr. H. Faisal'}
                value={form.officer_name}
                onChange={(e) => setForm({ ...form, officer_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {/* Mode: Online vs Offline */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Mode Pelaksanaan</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'offline' })}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all",
                    form.mode === 'offline'
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Offline (Tatap Muka)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'online' })}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all",
                    form.mode === 'online'
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Video className="h-4 w-4" />
                  <span>Online (Tatap Maya)</span>
                </button>
              </div>
            </div>

            {/* Ruangan/Lokasi (Jika Offline) */}
            {form.mode === 'offline' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="font-bold text-slate-800">Lokasi / Gedung / Ruangan</label>
                <Input
                  placeholder="Contoh: Gedung Tahfidz Lt. 2 - Ruang 203"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            )}

            {/* Tautan Zoom/Meet (Jika Online) */}
            {form.mode === 'online' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="font-bold text-slate-800">Tautan Zoom / Google Meet</label>
                <Input
                  placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
                  value={form.meeting_url}
                  onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            )}

            {/* Keterangan Tambahan */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Catatan Khusus (Opsional)</label>
              <Textarea
                placeholder="Contoh: Harap membawa Al-Qur'an mushaf pojok standard."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSessionModal(null)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi Hapus ── */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Hapus Session 1:1"
        message="Apakah Anda yakin ingin menghapus session ini? Session yang dihapus tidak akan dapat dipilih lagi oleh calon santri."
        confirmLabel="Hapus Session"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  )
}
