import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from "../components/ui/confirmdialog"
import { Card, CardContent } from "@repo/ui"
import { Badge } from "@repo/ui"
import { Button } from "@repo/ui"
import { Input } from "@repo/ui"
import { Label } from "@repo/ui"
import { Checkbox } from "@repo/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@repo/ui"
import { EmptyState } from "@repo/ui"
import { Bell, Send, Search, Inbox } from 'lucide-react'

interface Recipient {
  user_id: string
  name: string
  username: string
  email: string
  phone: string
  type: string
}

export default function NotificationsPage() {
  const { toast } = useToast()

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [channel, setChannel] = useState('both')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [usersRes, applicantsRes, logsRes] = await Promise.all([
        api.getUsers({ per_page: 500 }),
        api.getApplicants({ perPage: 500 }),
        api.getNotificationLogs({ perPage: 10 }),
      ])
      const userList = (Array.isArray(usersRes) ? usersRes : (usersRes as any).data || [])
      const applicantList = (applicantsRes as any).data || []

      const list: Recipient[] = [
        ...userList.map((u: any) => ({
          user_id: u.id,
          name: u.full_name || u.username,
          username: u.username,
          email: u.email || '',
          phone: u.phone || '',
          type: 'Admin / User',
        })),
        ...applicantList
          .filter((a: any) => a.user_id)
          .map((a: any) => ({
            user_id: a.user_id,
            name: a.full_name,
            username: a.username || '',
            email: a.email || '',
            phone: a.phone || '',
            type: 'Pendaftar',
          })),
      ]
      setRecipients(list)
      setLogs(logsRes?.data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat data penerima')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const eligible = recipients.filter(r => r.email || r.phone)
  const filtered = eligible.filter(r => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      (r.name || '').toLowerCase().includes(q) ||
      (r.username || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q)
    )
  })

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      filtered.forEach(r => next.add(r.user_id))
      return next
    })
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function handleSend() {
    if (selected.size === 0) {
      toast('warning', 'Pilih minimal satu penerima terlebih dahulu')
      return
    }
    if (!body.trim()) {
      toast('warning', 'Body pesan tidak boleh kosong')
      return
    }
    const confirmed = await new Promise<boolean>((resolve) => {
      setConfirmData({
        title: 'Kirim Notifikasi',
        message: `Notifikasi akan dikirim ke ${selected.size} penerima. Pastikan email/nomor WhatsApp penerima sudah benar.\n\nChannel: ${channel}\nSubject: ${subject || '(kosong)'}\n\nYakin ingin mengirim?`,
        onConfirm: () => { setConfirmOpen(false); resolve(true) },
      })
      setConfirmOpen(true)
    })
    if (!confirmed) return

    setSending(true)
    try {
      const res = await api.sendCustomNotification({
        recipient_user_ids: Array.from(selected),
        channel,
        subject,
        body,
      })
      toast('success', `Notifikasi terkirim (simulasi): ${res.sent} dari ${res.total} penerima`)
      setSubject('')
      setBody('')
      setSelected(new Set())
      const logsRes = await api.getNotificationLogs({ perPage: 10 })
      setLogs(logsRes?.data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal mengirim notifikasi')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmData?.onConfirm()}
        title={confirmData?.title || 'Konfirmasi'}
        message={confirmData?.message || ''}
        confirmLabel="Ya, Kirim"
      />
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-500" />
            Kirim Notifikasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kirim pesan khusus ke user / pendaftar. Saat ini dalam mode simulasi — pesan tercatat di log notifikasi.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Pilih penerima */}
          <Card className="lg:col-span-3">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold text-foreground">Pilih Penerima ({selected.size} dipilih)</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>Pilih Semua</Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAll}>Bersihkan</Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari nama / username / email / no. WhatsApp..."
                  className="pl-9"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {loading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Memuat data...</p>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Tidak Ada Penerima"
                    description="Tidak ada user dengan email / nomor WhatsApp yang bisa dipilih."
                    className="bg-transparent border-transparent"
                  />
                ) : (
                  filtered.map(r => (
                    <label
                      key={r.user_id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                    >
                      <Checkbox
                        checked={selected.has(r.user_id)}
                        onCheckedChange={() => toggle(r.user_id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="truncate">{r.name || r.username}</span>
                          <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {r.email || '-'} <span className="mx-1">•</span> {r.phone || '-'}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Komposer */}
          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Channel</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={channel}
                  onChange={e => setChannel(e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Email &amp; WhatsApp</option>
                </select>
              </div>

              {(channel === 'email' || channel === 'both') && (
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-xs font-semibold text-foreground">Subject</Label>
                  <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Judul pesan (untuk email)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="body" className="text-xs font-semibold text-foreground">Body Pesan *</Label>
                <textarea
                  id="body"
                  rows={8}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Tulis pesan yang akan dikirim ke penerima..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Mendukung variabel: {'{nama_peserta}'}, {'{username}'}, {'{email}'}, {'{phone}'}
                </p>
              </div>

              <Button className="w-full" onClick={handleSend} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Mengirim...' : `Kirim ke ${selected.size} Penerima`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Log */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Log Notifikasi Terbaru</h2>
            </div>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Belum ada log notifikasi.</TableCell></TableRow>
                ) : (
                  logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium text-foreground">{l.recipient_name || '—'}</span>
                        <div className="text-xs text-muted-foreground">{l.recipient_email || l.recipient_phone || '—'}</div>
                      </TableCell>
                      <TableCell className="uppercase text-xs">{l.channel}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs">{l.subject_sent || l.event_key || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={l.status === 'sent' ? 'border-success/30 bg-success/10 text-success' : undefined}
                        >{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.created_at ? new Date(l.created_at).toLocaleString('id-ID') : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
