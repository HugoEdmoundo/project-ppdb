import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Card, CardContent, CardHeader } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { CalendarDays, Plus, Pencil, Trash2, MessageSquare } from 'lucide-react'
import type { Session } from './types'

export default function SelectionSessions() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { canCrud } = useCan('ppdb', 'crud')

  const [sessionModal, setSessionModal] = useState<'create' | 'edit' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [sessionForm, setSessionForm] = useState({
    name: '', session_type: '' as '' | 'tahfidz' | 'interview', session_date: '', start_time: '', end_time: '',
    mode: '' as '' | 'online' | 'offline', officer_name: '', location: '', meeting_url: '', description: '', quota: 0
  })

  const [broadcastModal, setBroadcastModal] = useState<Session | null>(null)
  const [broadcastMsg, setBroadcastMsg] = useState('')

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ['selection-sessions'],
    queryFn: async () => {
      const res = await api.apiFetch<Session[] | { data: Session[] }>('/selection/sessions')
      return Array.isArray(res) ? res : (res as { data: Session[] }).data || []
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { type: 'create' | 'edit', data: typeof sessionForm, id?: string }) => {
      if (payload.type === 'create') {
        return api.apiFetch('/selection/sessions', { method: 'POST', body: JSON.stringify(payload.data) })
      } else {
        return api.apiFetch(`/selection/sessions/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload.data) })
      }
    },
    onSuccess: (_, variables) => {
      toast('success', variables.type === 'create' ? 'Sesi berhasil dibuat' : 'Sesi berhasil diperbarui')
      setSessionModal(null)
      queryClient.invalidateQueries({ queryKey: ['selection-sessions'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan sesi')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.apiFetch(`/selection/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Sesi dihapus')
      queryClient.invalidateQueries({ queryKey: ['selection-sessions'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menghapus sesi'),
    onSettled: () => setDeleteId(null),
  })

  const broadcastMutation = useMutation({
    mutationFn: (payload: { id: string, message: string }) =>
      api.apiFetch(`/selection/sessions/${payload.id}/broadcast`, { method: 'POST', body: JSON.stringify({ message: payload.message }) }),
    onSuccess: () => {
      toast('success', 'Pesan notifikasi berhasil di-broadcast')
      setBroadcastModal(null)
      setBroadcastMsg('')
    },
    onError: (e: any) => toast('error', e.message || 'Gagal mengirim broadcast')
  })

  const openCreateSession = () => {
    setEditSession(null)
    setSessionForm({ name: '', session_type: '', session_date: '', start_time: '', end_time: '', mode: '', officer_name: '', location: '', meeting_url: '', description: '', quota: 0 })
    setSessionModal('create')
  }

  const openEditSession = (s: Session) => {
    setEditSession(s)
    setSessionForm({
      name: s.name, session_type: s.session_type || '', session_date: s.session_date || '', start_time: s.start_time || '',
      end_time: s.end_time || '', mode: s.mode || '', officer_name: s.officer_name || '',
      location: s.location || '', meeting_url: s.meeting_url || '', description: s.description || '', quota: s.quota || 0
    })
    setSessionModal('edit')
  }

  const saveSession = () => {
    if (!sessionForm.name.trim()) { toast('error', 'Nama sesi wajib diisi'); return }
    if (!sessionForm.session_date || !sessionForm.start_time || !sessionForm.end_time) { toast('error', 'Tanggal, jam mulai, dan jam selesai wajib diisi'); return }
    if (sessionForm.end_time <= sessionForm.start_time) { toast('error', 'Jam selesai harus setelah jam mulai'); return }
    if (!sessionForm.session_type) { toast('error', 'Jenis sesi wajib dipilih'); return }
    if (!sessionForm.mode) { toast('error', 'Mode sesi wajib dipilih'); return }
    if (!sessionForm.officer_name.trim()) { toast('error', sessionForm.session_type === 'interview' ? 'Nama pewawancara wajib diisi' : 'Nama penguji wajib diisi'); return }
    if (sessionForm.mode === 'online' && !sessionForm.meeting_url.trim()) { toast('error', 'Tautan Zoom wajib diisi'); return }
    if (sessionForm.mode === 'offline' && !sessionForm.location.trim()) { toast('error', 'Lokasi wajib diisi'); return }
    saveMutation.mutate({ type: sessionModal as 'create' | 'edit', data: sessionForm, id: editSession?.id })
  }

  const deleteSession = (id: string) => {
    if (deleteMutation.isPending) return
    setDeleteId(id)
  }

  const handleBroadcast = () => {
    if (!broadcastModal) return
    if (!broadcastMsg.trim()) { toast('error', 'Pesan tidak boleh kosong'); return }
    broadcastMutation.mutate({ id: broadcastModal.id, message: broadcastMsg })
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h2 className="font-semibold text-foreground">Sesi Ujian Seleksi</h2>
            <p className="text-sm text-muted-foreground">Atur sesi Tahfidz dan wawancara, termasuk jadwal, petugas, mode, serta tautan atau lokasi.</p>
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
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="outline">{s.session_type === 'tahfidz' ? 'Tahfidz' : s.session_type === 'interview' ? 'Wawancara' : 'Jenis belum diatur'}</Badge>
                          <Badge variant="secondary">{s.mode === 'online' ? 'Online' : s.mode === 'offline' ? 'Offline' : 'Mode belum diatur'}</Badge>
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          <span className="text-muted-foreground mx-1">|</span>
                          {s.start_time && s.end_time ? `${s.start_time} - ${s.end_time}` : s.start_time || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.officer_name ? `${s.session_type === 'interview' ? 'Pewawancara' : 'Penguji'}: ${s.officer_name}` : 'Petugas belum diatur'}</div>
                        {s.mode === 'online' && s.meeting_url && <a className="text-xs text-primary underline" href={s.meeting_url} target="_blank" rel="noreferrer">Buka tautan Zoom</a>}
                        {s.mode === 'offline' && <div className="text-xs text-muted-foreground">{s.location || 'Lokasi belum diatur'}</div>}
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
                <label className="text-sm font-medium">Jenis Sesi <span className="text-destructive">*</span></label>
                <Select value={sessionForm.session_type} onValueChange={(value: 'tahfidz' | 'interview') => setSessionForm(p => ({ ...p, session_type: value }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih jenis sesi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tahfidz">Tahfidz</SelectItem>
                    <SelectItem value="interview">Wawancara</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Mode <span className="text-destructive">*</span></label>
                <Select value={sessionForm.mode} onValueChange={(value: 'online' | 'offline') => setSessionForm(p => ({ ...p, mode: value }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{sessionForm.session_type === 'interview' ? 'Nama Pewawancara' : 'Nama Penguji'} <span className="text-destructive">*</span></label>
              <Input className="mt-1" placeholder={sessionForm.session_type === 'interview' ? 'Nama pewawancara' : 'Nama penguji Tahfidz'} value={sessionForm.officer_name} onChange={e => setSessionForm(p => ({ ...p, officer_name: e.target.value }))} />
            </div>
            {sessionForm.mode === 'online' ? (
              <div>
                <label className="text-sm font-medium">Tautan Zoom <span className="text-destructive">*</span></label>
                <Input type="url" className="mt-1" placeholder="https://zoom.us/j/..." value={sessionForm.meeting_url} onChange={e => setSessionForm(p => ({ ...p, meeting_url: e.target.value }))} />
              </div>
            ) : sessionForm.mode === 'offline' ? (
              <div>
                <label className="text-sm font-medium">Lokasi <span className="text-destructive">*</span></label>
                <Input className="mt-1" placeholder="Ruang / Gedung" value={sessionForm.location} onChange={e => setSessionForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tanggal <span className="text-destructive">*</span></label>
                <Input type="date" className="mt-1" value={sessionForm.session_date} onChange={e => setSessionForm(p => ({ ...p, session_date: e.target.value }))} />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Jam Mulai <span className="text-destructive">*</span></label>
                <Input type="time" className="mt-1" value={sessionForm.start_time} onChange={e => setSessionForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Jam Selesai <span className="text-destructive">*</span></label>
                <Input type="time" className="mt-1" value={sessionForm.end_time} onChange={e => setSessionForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi / Instruksi Singkat</label>
              <Textarea className="mt-1" rows={2} placeholder="Misal: Bawa pensil 2B dan kartu ujian" value={sessionForm.description} onChange={e => setSessionForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSessionModal(null)}>Batal</Button>
              <Button onClick={saveSession} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Hapus Sesi"
        message="Yakin ingin menghapus sesi ini? Peserta yang sudah booking akan dilepas dari sesi."
        confirmLabel="Ya, Hapus"
        variant="destructive"
      />

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
              <Button onClick={handleBroadcast} disabled={broadcastMutation.isPending}>{broadcastMutation.isPending ? 'Mengirim...' : 'Kirim Sekarang'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
