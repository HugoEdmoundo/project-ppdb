import { useState, useRef, useCallback } from 'react'
import {
  Bell, Edit2, Eye, EyeOff, CheckCircle2, XCircle, Clock,
  AlertTriangle, RefreshCw, ChevronLeft, ChevronRight,
  Zap, MessageSquare, Mail, Info, Copy, Check,
} from 'lucide-react'
import {
  Card, CardContent,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Button,
  Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input,
  Label,
  Textarea,
  EmptyState,
  TableSkeletonRows,
} from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { notificationService } from '@/services/index'
import { apiFetch } from '@/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

// ── Types ────────────────────────────────────────────────────────────────────

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
  status: 'queued' | 'sent' | 'failed' | 'invalid_number'
  retry_count?: number
  error_message?: string
  wa_message_id?: string
  created_at: string
  sent_at?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_VARS = [
  { key: '{nama_peserta}', desc: 'Nama lengkap pendaftar' },
  { key: '{username}', desc: 'Username akun' },
  { key: '{email}', desc: 'Email pendaftar' },
  { key: '{phone}', desc: 'No. WhatsApp pendaftar' },
  { key: '{password}', desc: 'Password (saat buat/reset akun)' },
  { key: '{link_login}', desc: 'URL halaman login' },
  { key: '{batas_waktu_bayar}', desc: 'Deadline pembayaran' },
  { key: '{nominal_bayar}', desc: 'Nominal pembayaran' },
  { key: '{link_pembayaran}', desc: 'URL halaman pembayaran' },
  { key: '{alasan_penolakan}', desc: 'Alasan dokumen ditolak' },
  { key: '{alasan_gagal}', desc: 'Alasan pembayaran gagal' },
  { key: '{tanggal_seleksi}', desc: 'Tanggal pelaksanaan seleksi' },
  { key: '{waktu_seleksi}', desc: 'Waktu pelaksanaan seleksi' },
  { key: '{lokasi_seleksi}', desc: 'Lokasi/link seleksi' },
  { key: '{ketentuan_seleksi}', desc: 'Ketentuan seleksi' },
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
  '{lokasi_seleksi}': 'Gedung Aula Lt. 2, Kampus PTDARRAHMAN',
  '{ketentuan_seleksi}': 'Bawa KTP/Kartu Pelajar dan alat tulis',
  '{nama_gelombang}': 'Gelombang 1 TA 2026/2027',
  '{deadline_daftar_ulang}': '2026-10-20 23:59',
}

type MetaIcon = React.ComponentType<{ className?: string }>

const CHANNEL_META: Record<string, { label: string; color: string; icon: MetaIcon }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-green-100 text-green-700 border-green-200', icon: MessageSquare },
  email:    { label: 'Email', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Mail },
  both:     { label: 'WA + Email', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Zap },
}

const LOG_STATUS_META: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary'; icon: MetaIcon }> = {
  sent:           { label: 'Terkirim', variant: 'success', icon: CheckCircle2 },
  queued:         { label: 'Antrian', variant: 'secondary', icon: Clock },
  failed:         { label: 'Gagal', variant: 'destructive', icon: XCircle },
  invalid_number: { label: 'No. Tidak Valid', variant: 'warning', icon: AlertTriangle },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderPreview(body: string): string {
  let result = body
  for (const [key, val] of Object.entries(PREVIEW_CONTEXT)) {
    result = result.split(key).join(val)
  }
  return result
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

// ── Variable Chip ─────────────────────────────────────────────────────────────

function VarChip({ varKey, desc, onInsert }: { varKey: string; desc: string; onInsert: (v: string) => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title={desc}
      onClick={() => { onInsert(varKey); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-50" />}
      {varKey}
    </button>
  )
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditDialog({
  template,
  open,
  onClose,
  onSaved,
}: {
  template: Template
  open: boolean
  onClose: () => void
  onSaved: () => void
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveMutation = useMutation({
    mutationFn: () => notificationService.updateTemplate(template.id, form),
    onSuccess: () => {
      toast('success', 'Template berhasil disimpan')
      onSaved()
      onClose()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan'),
  })

  // Insert var at cursor position
  const insertVar = useCallback((varKey: string) => {
    const el = textareaRef.current
    if (!el) {
      setForm(p => ({ ...p, body: p.body + varKey }))
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + varKey + el.value.slice(end)
    setForm(p => ({ ...p, body: next }))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + varKey.length, start + varKey.length)
    })
  }, [])

  // Reset form when template prop changes
  useState(() => {
    setForm({
      label: template.label,
      channel: template.channel,
      email_subject: template.email_subject ?? '',
      body: template.body,
      is_active: template.is_active,
    })
  })

  const previewText = renderPreview(form.body)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" />
            Edit Template: <span className="font-mono text-sm text-muted-foreground">{template.event_key}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label */}
          <div className="space-y-1.5">
            <Label>Label Template</Label>
            <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label>Channel Pengiriman</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.channel}
              onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
            >
              <option value="whatsapp">WhatsApp saja</option>
              <option value="email">Email saja</option>
              <option value="both">WhatsApp + Email</option>
            </select>
          </div>

          {/* Email Subject */}
          {(form.channel === 'email' || form.channel === 'both') && (
            <div className="space-y-1.5">
              <Label>Subject Email</Label>
              <Input
                value={form.email_subject}
                onChange={e => setForm(p => ({ ...p, email_subject: e.target.value }))}
                placeholder="Judul email yang dikirim ke penerima..."
              />
            </div>
          )}

          {/* Variable chips */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Klik variabel untuk menyisipkan ke posisi kursor:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              {AVAILABLE_VARS.map(v => (
                <VarChip key={v.key} varKey={v.key} desc={v.desc} onInsert={insertVar} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Body Pesan</Label>
              <button
                type="button"
                onClick={() => setShowPreview(p => !p)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? 'Sembunyikan preview' : 'Tampilkan preview'}
              </button>
            </div>
            <Textarea
              ref={textareaRef}
              className="min-h-[220px] font-mono text-sm leading-relaxed"
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Tulis isi pesan di sini. Gunakan variabel di atas untuk data dinamis..."
            />
            <p className="text-[11px] text-muted-foreground">
              Untuk WhatsApp: gunakan *teks* untuk bold, _teks_ untuk italic.
            </p>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-500" />
                Preview (dengan contoh data)
              </Label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700 leading-relaxed">
                  {previewText || <span className="text-muted-foreground italic">Tulis body pesan di atas...</span>}
                </pre>
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="is_active_edit" className="text-sm font-medium text-foreground cursor-pointer">
              Template aktif — notifikasi akan dikirim saat event ini terpicu
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('notification', 'crud')
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<Template | null>(null)

  // Log state
  const [logsPage, setLogsPage] = useState(1)
  const [logsStatus, setLogsStatus] = useState('')
  const [logs, setLogs] = useState<NotifLog[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)

  // Templates query
  const { data: templates = [], isLoading: tplLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationService.getTemplates(),
  })

  // Fetch logs
  const fetchLogs = useCallback(async (page: number, status: string) => {
    setLogsLoading(true)
    try {
      const qs = new URLSearchParams({ page: String(page), perPage: '10' })
      if (status) qs.set('status', status)
      const res = await apiFetch<any>(`/notifications/logs?${qs}`)
      setLogs(res?.data || [])
      setLogsTotal(res?.total ?? 0)
      setLogsTotalPages(res?.totalPages ?? Math.ceil((res?.total ?? 0) / 10))
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat log')
    } finally {
      setLogsLoading(false)
    }
  }, [toast])

  // Initial log load + poll every 30s
  useState(() => {
    fetchLogs(1, '')
    const id = setInterval(() => fetchLogs(logsPage, logsStatus), 30_000)
    return () => clearInterval(id)
  })

  const activeCount = templates.filter((t: Template) => t.is_active).length
  const waCount = templates.filter((t: Template) => t.channel === 'whatsapp' || t.channel === 'both').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Template Notifikasi"
        description="Konfigurasi pesan otomatis yang dikirim ke pendaftar via WhatsApp & Email."
        blocks={[
          { icon: Bell, label: 'Total Template', value: String(templates.length), active: templates.length > 0 },
          { icon: CheckCircle2, label: 'Template Aktif', value: String(activeCount), active: activeCount > 0, pulse: true },
          { icon: MessageSquare, label: 'Punya Channel WA', value: String(waCount), active: waCount > 0 },
          { icon: Clock, label: 'Log Terkirim', value: String(logsTotal), active: logsTotal > 0 },
        ]}
        loading={tplLoading && templates.length === 0}
      />

      {/* ── Template List ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Daftar Template</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchTemplates()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="w-[180px]">Event Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-[130px]">Channel</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                {canCrud && <TableHead className="w-[80px] text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tplLoading ? (
                <TableSkeletonRows cols={canCrud ? 5 : 4} rows={8} />
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canCrud ? 5 : 4} className="py-10">
                    <EmptyState
                      icon={Bell}
                      title="Belum Ada Template"
                      description="Jalankan 'alembic upgrade head' untuk seed template bawaan."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                (templates as Template[]).map(t => {
                  const ch = CHANNEL_META[t.channel] ?? CHANNEL_META.both
                  const ChIcon = ch.icon
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {t.event_key}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{t.label}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ch.color}`}>
                          <ChIcon className="h-3 w-3" />
                          {ch.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? 'success' : 'secondary'}>
                          {t.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      {canCrud && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditTarget(t)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Log Section ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Log Pengiriman</h2>
              {logsTotal > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{logsTotal}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={logsStatus}
                onChange={e => { setLogsStatus(e.target.value); setLogsPage(1); fetchLogs(1, e.target.value) }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Semua Status</option>
                <option value="sent">Terkirim</option>
                <option value="queued">Antrian</option>
                <option value="failed">Gagal</option>
                <option value="invalid_number">No. Tidak Valid</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => fetchLogs(logsPage, logsStatus)}>
                <RefreshCw className="h-3.5 w-3.5" />
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
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableSkeletonRows cols={6} rows={5} />
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10">
                    <EmptyState
                      icon={Clock}
                      title="Belum Ada Log"
                      description="Log pengiriman notifikasi akan muncul di sini."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => {
                  const sm = LOG_STATUS_META[log.status] ?? LOG_STATUS_META.failed
                  const SIcon = sm.icon
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{log.recipient_name || '—'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{log.recipient_phone || log.recipient_email || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                          {log.event_key}
                        </span>
                      </TableCell>
                      <TableCell className="uppercase text-xs text-muted-foreground">{log.channel}</TableCell>
                      <TableCell>
                        <Badge variant={sm.variant} className="gap-1">
                          <SIcon className="h-3 w-3" />
                          {sm.label}
                        </Badge>
                        {log.error_message && (
                          <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-destructive" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {(log.retry_count ?? 0) > 0
                          ? <span className="text-xs font-semibold text-amber-600">{log.retry_count}×</span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(log.sent_at || log.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {logsTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted-foreground">
              <span>Halaman {logsPage} dari {logsTotalPages}</span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" disabled={logsPage <= 1}
                  onClick={() => { const p = logsPage - 1; setLogsPage(p); fetchLogs(p, logsStatus) }}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={logsPage >= logsTotalPages}
                  onClick={() => { const p = logsPage + 1; setLogsPage(p); fetchLogs(p, logsStatus) }}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ── */}
      {editTarget && (
        <EditDialog
          template={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['notification-templates'] })}
        />
      )}
    </div>
  )
}
