import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send, FileText, Inbox, Bell, Edit2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, Users, MessageSquare, Mail,
  Zap, Search, Info, Copy, Check, Download,
} from 'lucide-react'
import PageHero from '../components/PageHero'
import { ConfirmDialog } from '../components/ui/confirmdialog'
import { useToast } from '../components/Toast'
import * as api from '../api/client'
import {
  Card, CardContent,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Button,
  Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Label, Textarea, Checkbox,
  Tabs, TabsList, TabsTrigger, TabsContent,
  EmptyState,
} from '@/components/ui'

// ÔöÇÔöÇ Types ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

interface Template {
  id: string
  event_key: string
  label: string
  channel: string
  email_subject?: string
  body: string
  is_active: boolean
}

interface NotifLog {
  id: string
  event_key: string
  recipient_name?: string
  recipient_phone?: string
  recipient_email?: string
  channel: string
  status: string
  retry_count?: number
  error_message?: string
  wa_message_id?: string
  created_at: string
  sent_at?: string
}

interface Recipient {
  user_id: string
  name: string
  username: string
  email: string
  phone: string
  type: 'Admin' | 'Pendaftar'
}

// ÔöÇÔöÇ Constants ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

const AVAILABLE_VARS = [
  { key: '{nama_peserta}', desc: 'Nama lengkap penerima' },
  { key: '{username}', desc: 'Username akun' },
  { key: '{email}', desc: 'Email penerima' },
  { key: '{phone}', desc: 'No. WhatsApp' },
  { key: '{password}', desc: 'Password (saat buat/reset akun)' },
  { key: '{link_login}', desc: 'URL halaman login' },
  { key: '{batas_waktu_bayar}', desc: 'Deadline pembayaran' },
  { key: '{nominal_bayar}', desc: 'Nominal pembayaran' },
  { key: '{link_pembayaran}', desc: 'URL halaman pembayaran' },
  { key: '{alasan_penolakan}', desc: 'Alasan dokumen ditolak' },
  { key: '{alasan_gagal}', desc: 'Alasan pembayaran gagal' },
  { key: '{tanggal_seleksi}', desc: 'Tanggal seleksi' },
  { key: '{waktu_seleksi}', desc: 'Waktu seleksi' },
  { key: '{lokasi_seleksi}', desc: 'Lokasi/link seleksi' },
  { key: '{nama_gelombang}', desc: 'Nama gelombang aktif' },
  { key: '{deadline_daftar_ulang}', desc: 'Deadline daftar ulang' },
]

const PREVIEW_CONTEXT: Record<string, string> = {
  '{nama_peserta}': 'Ahmad Fauzi',
  '{username}': 'ahmad.fauzi24',
  '{email}': 'ahmad@example.com',
  '{phone}': '081234567890',
  '{password}': 'Pass1234',
  '{link_login}': 'https://ppdb.ptdarrahman.sch.id/auth/login',
  '{batas_waktu_bayar}': '2026-09-25 23:59',
  '{nominal_bayar}': 'Rp 350.000',
  '{link_pembayaran}': 'https://ppdb.ptdarrahman.sch.id/checkout',
  '{alasan_penolakan}': 'Foto tidak jelas / buram',
  '{alasan_gagal}': 'Saldo tidak mencukupi',
  '{tanggal_seleksi}': 'Sabtu, 10 Oktober 2026',
  '{waktu_seleksi}': '08.00 WIB',
  '{lokasi_seleksi}': 'Gedung Aula Lt. 2',
  '{nama_gelombang}': 'Gelombang 1 TA 2026/2027',
  '{deadline_daftar_ulang}': '2026-10-20 23:59',
}

const LOG_STATUS_META: Record<string, { label: string; color: string }> = {
  sent:           { label: 'Terkirim',       color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  queued:         { label: 'Antrian',        color: 'border-blue-200 bg-blue-50 text-blue-700' },
  failed:         { label: 'Gagal',          color: 'border-red-200 bg-red-50 text-red-700' },
  invalid_number: { label: 'No. Tdk Valid',  color: 'border-orange-200 bg-orange-50 text-orange-700' },
}

const CHANNEL_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-green-100 text-green-700 border-green-200', icon: MessageSquare },
  email:    { label: 'Email',    color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Mail },
  both:     { label: 'WA + Email', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Zap },
}

// ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function renderPreview(body: string): string {
  let result = body
  for (const [k, v] of Object.entries(PREVIEW_CONTEXT)) {
    result = result.split(k).join(v)
  }
  return result
}

function fmtDate(d?: string) {
  if (!d) return 'ÔÇö'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function exportCSV(logs: NotifLog[]) {
  const header = 'ID,Event,Penerima,Email,Phone,Channel,Status,Retry,WA ID,Waktu\n'
  const rows = logs.map(l => [
    l.id, l.event_key, l.recipient_name ?? '', l.recipient_email ?? '',
    l.recipient_phone ?? '', l.channel, l.status,
    l.retry_count ?? 0, l.wa_message_id ?? '',
    l.sent_at || l.created_at,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `notif-logs-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ÔöÇÔöÇ VarChip ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function VarChip({ varKey, desc, onInsert }: { varKey: string; desc: string; onInsert: (v: string) => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button" title={desc}
      onClick={() => { onInsert(varKey); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-50" />}
      {varKey}
    </button>
  )
}

// ÔöÇÔöÇ Tab 1: Kirim Pesan ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function SendTab({ templates }: { templates: Template[] }) {
  const { toast } = useToast()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTpl, setSelectedTpl] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getUsers({ per_page: 500 }),
      api.getApplicants({ perPage: 500 }),
    ]).then(([usersRes, applicantsRes]) => {
      const ul = Array.isArray(usersRes) ? usersRes : (usersRes as any).data ?? []
      const al = (applicantsRes as any).data ?? []
      const list: Recipient[] = [
        ...ul.filter((u: any) => u.user_type !== 'superadmin').map((u: any) => ({
          user_id: u.id, name: u.full_name || u.username, username: u.username,
          email: u.email || '', phone: u.phone || '', type: 'Admin' as const,
        })),
        ...al.filter((a: any) => a.user_id).map((a: any) => ({
          user_id: a.user_id, name: a.full_name, username: a.username || '',
          email: a.email || '', phone: a.phone || '', type: 'Pendaftar' as const,
        })),
      ]
      setRecipients(list)
    }).catch(() => { }).finally(() => setRecLoading(false))
  }, [])

  const filtered = recipients.filter(r => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return [r.name, r.username, r.email, r.phone].some(v => v.toLowerCase().includes(q))
  })

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function onTplChange(id: string) {
    setSelectedTpl(id)
    const tpl = templates.find(t => t.id === id)
    if (tpl) {
      setBody(tpl.body)
      setSubject(tpl.email_subject ?? '')
      setChannel(tpl.channel)
    }
  }

  async function doSend() {
    setConfirmOpen(false)
    setSending(true)
    try {
      const res = await api.sendCustomNotification({
        recipient_user_ids: Array.from(selected),
        channel, subject, body,
      })
      toast('success', res?.message || `Notifikasi diantrekan ke ${selected.size} penerima`)
      setSelected(new Set()); setBody(''); setSubject('')
    } catch (e: any) {
      toast('error', e.message || 'Gagal mengirim')
    } finally {
      setSending(false)
    }
  }

  const previewBody = renderPreview(body)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Recipient list */}
      <Card className="lg:col-span-3">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Pilih Penerima ({selected.size} dipilih)</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => setSelected(new Set(filtered.map(r => r.user_id)))}>
                Semua
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Bersihkan
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama / username / email / WA..."
              value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-1.5 space-y-0.5">
            {recLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat data penerima...</p>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Users} title="Tidak Ada Penerima" description="Tidak ada user yang cocok." className="bg-transparent border-transparent py-6" />
            ) : filtered.map(r => (
              <label key={r.user_id} className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
                <Checkbox checked={selected.has(r.user_id)} onCheckedChange={() => toggle(r.user_id)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{r.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{r.type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.email || 'ÔÇö'} ┬À {r.phone || 'Tanpa WA'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Composer */}
      <Card className="lg:col-span-2">
        <CardContent className="p-5 space-y-4">
          {/* Channel badge - WA only */}
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-700">WhatsApp</span>
            <span className="ml-auto text-xs text-green-600">Satu-satunya channel</span>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="use-tpl" checked={useTemplate} onCheckedChange={v => setUseTemplate(Boolean(v))} />
            <label htmlFor="use-tpl" className="text-sm cursor-pointer">Pakai template yang ada</label>
          </div>

          {useTemplate && (
            <div className="space-y-1.5">
              <Label>Template</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedTpl} onChange={e => onTplChange(e.target.value)}>
                <option value="">ÔÇö Pilih template ÔÇö</option>
                {templates.filter(t => t.is_active).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          )}



          <div className="space-y-1.5">
            <Label>Body Pesan *</Label>
            <Textarea rows={7} className="font-mono text-sm"
              value={body} onChange={e => setBody(e.target.value)}
              placeholder="Tulis pesan atau pilih template di atas..." />
          </div>

          {body && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-700">Preview</p>
              <pre className="whitespace-pre-wrap break-words font-sans text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                {previewBody}
              </pre>
            </div>
          )}

          <Button className="w-full" disabled={sending || selected.size === 0 || !body.trim()}
            onClick={() => setConfirmOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Mengirim...' : `Kirim ke ${selected.size} Penerima`}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSend}
        title="Kirim Notifikasi"
        message={`Notifikasi akan dikirim ke ${selected.size} penerima via ${channel}.\n\nYakin ingin melanjutkan?`}
        confirmLabel="Ya, Kirim"
      />
    </div>
  )
}

// ÔöÇÔöÇ Tab 2: Template Manager ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function TemplateTab() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Template | null>(null)

  const fetchTemplates = useCallback(() => {
    return api.apiFetch<Template[]>('/notifications/templates')
      .then((res) => { setTemplates(res) })
      .catch((e: any) => {
        toast('error', e.message || 'Gagal memuat template')
      })
      .finally(() => { setLoading(false) })
  }, [toast])

  useEffect(() => {

    fetchTemplates()
  }, [fetchTemplates])

  const activeCount = templates.filter(t => t.is_active).length

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{templates.length} Template</span>
              <span className="text-xs text-muted-foreground">({activeCount} aktif)</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTemplates}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
            </Button>
          </div>
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Event Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Memuat template...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10">
                  <EmptyState icon={Bell} title="Belum Ada Template" description="Jalankan alembic upgrade head untuk seed template." className="bg-transparent border-transparent" />
                </TableCell></TableRow>
              ) : templates.map(t => {
                const ch = CHANNEL_META[t.channel] ?? CHANNEL_META.both
                const ChIcon = ch.icon
                return (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{t.event_key}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{t.label}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ch.color}`}>
                        <ChIcon className="h-3 w-3" />{ch.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'success' : 'secondary'}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(t)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editTarget && (
        <TemplateEditDialog
          template={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { fetchTemplates(); setEditTarget(null) }}
        />
      )}
    </>
  )
}

function TemplateEditDialog({ template, open, onClose, onSaved }: {
  template: Template; open: boolean; onClose: () => void; onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    label: template.label,
    channel: template.channel,
    email_subject: template.email_subject ?? '',
    body: template.body,
    is_active: template.is_active,
  })
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVar = (varKey: string) => {
    const el = textareaRef.current
    if (!el) { setForm(p => ({ ...p, body: p.body + varKey })); return }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + varKey + el.value.slice(end)
    setForm(p => ({ ...p, body: next }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + varKey.length, start + varKey.length) })
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.apiFetch(`/notifications/templates/${template.id}`, {
        method: 'PUT', body: JSON.stringify({
          ...form,
          channel: 'whatsapp',
          email_subject: null,
        }),
      })
      // Clear WA template cache silently (via FastAPI proxy)
      try {
        await api.waClearTemplateCache()
      } catch { /* silent */ }
      toast('success', 'Template berhasil disimpan')
      onSaved()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" />
            Edit: <span className="font-mono text-sm text-muted-foreground">{template.event_key}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          </div>
          {/* Channel fixed */}
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-700">WhatsApp</span>
            <span className="ml-2 text-xs text-muted-foreground">
              Channel tidak bisa diubah — email tidak digunakan
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Klik variabel untuk menyisipkan ke kursor:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              {AVAILABLE_VARS.map(v => <VarChip key={v.key} varKey={v.key} desc={v.desc} onInsert={insertVar} />)}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Body Pesan</Label>
              <button type="button" onClick={() => setShowPreview(p => !p)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? 'Sembunyikan preview' : 'Tampilkan preview'}
              </button>
            </div>
            <Textarea ref={textareaRef} className="min-h-[220px] font-mono text-sm leading-relaxed"
              value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Isi pesan..." />
            <p className="text-[11px] text-muted-foreground">*teks* = bold, _teks_ = italic (WhatsApp formatting)</p>
          </div>
          {showPreview && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-500" />Preview (contoh data)
              </Label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700 leading-relaxed">
                  {renderPreview(form.body) || <span className="text-muted-foreground italic">Tulis body pesan...</span>}
                </pre>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <input type="checkbox" id="is_active_sa" checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <label htmlFor="is_active_sa" className="text-sm font-medium cursor-pointer">
              Template aktif ÔÇö akan dikirim saat event terpicu
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Template'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ÔöÇÔöÇ Tab 3: Log ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function LogTab() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<NotifLog[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchLogs = useCallback((p = page, status = statusFilter, event = eventFilter) => {
    const qs = new URLSearchParams({ page: String(p), perPage: '20' })
    if (status) qs.set('status', status)
    if (event) qs.set('event_key', event)
    return api.apiFetch<any>(`/notifications/logs?${qs}`)
      .then((res) => {
        setLogs(res?.data || [])
        setTotal(res?.total ?? 0)
        setTotalPages(res?.totalPages ?? Math.ceil((res?.total ?? 0) / 20))
      })
      .catch((e: any) => {
        toast('error', e.message || 'Gagal memuat log')
      })
      .finally(() => { setLoading(false) })
  }, [page, statusFilter, eventFilter, toast])

  // Reset ke halaman 1 saat filter berubah. fetchLogs sengaja TIDAK di deps:
  // identitasnya berubah saat page berubah (memicu fetch ganda/duplikat).
  // Setter loading di dalamnya dipanggil sinkron, jadi efek luar dan dalam
  // aturan ini ditekan eksplisit.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchLogs(1, statusFilter, eventFilter)
  }, [statusFilter, eventFilter])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(page, statusFilter, eventFilter), 10_000)
    return () => clearInterval(id)
  }, [autoRefresh, page, statusFilter, eventFilter, fetchLogs])

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2 flex-1">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Log Pengiriman</span>
            {total > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{total}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none">
              <option value="">Semua Status</option>
              <option value="sent">Terkirim</option>
              <option value="queued">Antrian</option>
              <option value="failed">Gagal</option>
              <option value="invalid_number">No. Tidak Valid</option>
            </select>
            <Input className="h-8 text-xs w-40" placeholder="Cari event key..."
              value={eventFilter} onChange={e => { setEventFilter(e.target.value); setPage(1) }} />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded" />
              Auto-refresh 10s
            </label>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(page, statusFilter, eventFilter)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(logs)} disabled={logs.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />CSV
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Penerima</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retry</TableHead>
              <TableHead>WA ID</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Memuat log...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10">
                <EmptyState icon={Inbox} title="Belum Ada Log" description="Belum ada log pengiriman notifikasi." className="bg-transparent border-transparent" />
              </TableCell></TableRow>
            ) : logs.map(log => {
              const sm = LOG_STATUS_META[log.status] ?? LOG_STATUS_META.failed
              return (
                <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="text-sm font-medium">{log.recipient_name || 'ÔÇö'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{log.recipient_phone || log.recipient_email || 'ÔÇö'}</div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{log.event_key}</span>
                  </TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{log.channel}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${sm.color}`}>
                      {sm.label}
                    </span>
                    {log.error_message && (
                      <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-red-500" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(log.retry_count ?? 0) > 0
                      ? <span className="text-xs font-semibold text-amber-600">{log.retry_count}├ù</span>
                      : <span className="text-muted-foreground text-xs">ÔÇö</span>}
                  </TableCell>
                  <TableCell>
                    {log.wa_message_id
                      ? <span className="font-mono text-[10px] text-muted-foreground">{log.wa_message_id.slice(0, 16)}ÔÇª</span>
                      : <span className="text-muted-foreground text-xs">ÔÇö</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(log.sent_at || log.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <span>Halaman {page} dari {totalPages} ({total} log)</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); fetchLogs(p, statusFilter, eventFilter) }}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); fetchLogs(p, statusFilter, eventFilter) }}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ÔöÇÔöÇ Main Page ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [tplLoading, setTplLoading] = useState(true)
  const { toast } = useToast()
  const [waConfigured, setWaConfigured] = useState(false)
  const [waReady, setWaReady] = useState(false)

  useEffect(() => {
    api.waGetStatus()
      .then(s => {
        setWaConfigured(s?.configured === true)
        setWaReady(s?.isReady === true)
      })
      .catch(() => {
        setWaConfigured(false)
        setWaReady(false)
      })
  }, [])

  useEffect(() => {
    api.apiFetch<Template[]>('/notifications/templates')
      .then(setTemplates)
      .catch((e: any) => toast('error', e.message || 'Gagal memuat template'))
      .finally(() => setTplLoading(false))
  }, [toast])

  const activeCount = templates.filter(t => t.is_active).length

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Komunikasi"
        title="Notifikasi"
        description="Kirim pesan, kelola template, dan pantau log pengiriman via WhatsApp & Email."
        docKey="superadmin-notifications"
        loading={tplLoading && templates.length === 0}
        chips={[
          { icon: Bell, label: `${templates.length} Template` },
          { icon: CheckCircle2, label: `${activeCount} Aktif` },
          { icon: waReady ? Zap : AlertTriangle, label: waReady ? 'WA: Terhubung' : waConfigured ? 'WA: Offline' : 'WA: Belum dikonfigurasi' },
        ]}
      />

      {!waConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">WhatsApp Service Belum Dikonfigurasi</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tambahkan <code className="bg-amber-100 px-1 rounded">WA_SERVICE_URL</code> dan{' '}
              <code className="bg-amber-100 px-1 rounded">WA_SERVICE_API_KEY</code> ke{' '}
              <code className="bg-amber-100 px-1 rounded">apps/api/.env</code>, lalu restart backend.
              Detail selengkapnya ada di halaman <strong>WhatsApp</strong>.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="send">
        <TabsList className="mb-2">
          <TabsTrigger value="send" className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />Kirim Pesan
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />Template
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <SendTab templates={templates} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
