import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send, FileText, Inbox, Bell, Edit2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, RefreshCw, Zap,
  ChevronLeft, ChevronRight, Users, MessageSquare,
  Search, Info, Copy, Check, Download, Tag,
} from 'lucide-react'
import PageHeaderCard, { type HeaderBlock } from '@/components/shared/PageHeaderCard'
import { ConfirmDialog } from '@/components/ui/confirmdialog'
import { useToast } from '@/components/Toast'
import { apiFetch } from '@/api/client'
import { notificationService } from '@/services'
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Variabel template dari spec notifikasi ────────────────────────────────────

const AVAILABLE_VARS = [
  // Identitas
  { key: '{nama_peserta}',          desc: 'Nama lengkap penerima',              group: 'Identitas' },
  { key: '{username}',              desc: 'Username akun',                       group: 'Identitas' },
  { key: '{email}',                 desc: 'Email penerima',                      group: 'Identitas' },
  { key: '{phone}',                 desc: 'No. WhatsApp penerima',               group: 'Identitas' },
  { key: '{password}',              desc: 'Password (saat buat/reset akun)',      group: 'Identitas' },
  { key: '{nama_sekolah}',          desc: 'Nama sekolah/pesantren',              group: 'Identitas' },
  // Link
  { key: '{link_login}',            desc: 'URL halaman login PPDB',              group: 'Link' },
  { key: '{link_aplikasi}',         desc: 'URL dashboard PPDB',                  group: 'Link' },
  { key: '{link_pembayaran}',       desc: 'URL halaman pembayaran formulir',     group: 'Link' },
  { key: '{link_panduan_seb}',      desc: 'URL panduan instalasi SEB',           group: 'Link' },
  { key: '{link_grup_whatsapp}',    desc: 'Link grup WA resmi (setelah DP)',     group: 'Link' },
  // Gelombang
  { key: '{nama_gelombang}',        desc: 'Nama gelombang pendaftaran',          group: 'Gelombang' },
  { key: '{tanggal_tutup}',         desc: 'Tanggal tutup gelombang',             group: 'Gelombang' },
  { key: '{tanggal_tutup_gelombang}', desc: 'Tanggal tutup (panjang)',           group: 'Gelombang' },
  { key: '{batas_waktu_bayar}',     desc: 'Batas waktu bayar formulir',          group: 'Gelombang' },
  // Pembayaran
  { key: '{nominal_bayar}',         desc: 'Nominal pembayaran formulir',         group: 'Pembayaran' },
  { key: '{alasan_gagal}',          desc: 'Alasan pembayaran gagal',             group: 'Pembayaran' },
  // Dokumen
  { key: '{alasan_penolakan}',      desc: 'Alasan dokumen ditolak oleh admin',   group: 'Dokumen' },
  // TIU
  { key: '{nilai_tiu}',             desc: 'Nilai tes TIU (0–100)',               group: 'TIU' },
  // Ujian
  { key: '{nama_ujian}',            desc: 'Nama ujian (Tahfidz / Wawancara)',    group: 'Ujian' },
  { key: '{tanggal}',               desc: 'Tanggal pelaksanaan ujian',           group: 'Ujian' },
  { key: '{jam_mulai}',             desc: 'Jam mulai ujian',                     group: 'Ujian' },
  { key: '{jam_selesai}',           desc: 'Jam selesai ujian',                   group: 'Ujian' },
  { key: '{waktu}',                 desc: 'Waktu ujian (ringkas)',                group: 'Ujian' },
  { key: '{lokasi_atau_link}',      desc: 'Lokasi fisik atau link Zoom',         group: 'Ujian' },
  // Kelulusan
  { key: '{deadline_daftar_ulang}', desc: 'Deadline daftar ulang',               group: 'Kelulusan' },
  // DP
  { key: '{sisa_waktu}',            desc: 'Sisa waktu bayar DP',                 group: 'DP' },
  { key: '{tanggal_jatuh_tempo}',   desc: 'Tanggal jatuh tempo pembayaran',      group: 'DP' },
  // Cicilan
  { key: '{bulan_cicilan}',         desc: 'Bulan tagihan cicilan',               group: 'Cicilan' },
  { key: '{nominal_cicilan}',       desc: 'Nominal tagihan cicilan',             group: 'Cicilan' },
]

const VAR_GROUPS = [...new Set(AVAILABLE_VARS.map(v => v.group))]

const PREVIEW_CONTEXT: Record<string, string> = {
  '{nama_peserta}': 'Ahmad Fauzi',
  '{username}': 'ahmad.fauzi24',
  '{email}': 'ahmad@example.com',
  '{phone}': '081234567890',
  '{password}': 'Pass1234',
  '{nama_sekolah}': 'Pesantren Tahfidz Ar-Rahman',
  '{link_login}': 'https://ppdb.ptdarrahman.sch.id/login',
  '{link_aplikasi}': 'https://ppdb.ptdarrahman.sch.id/dashboard',
  '{link_pembayaran}': 'https://ppdb.ptdarrahman.sch.id/payment',
  '{link_panduan_seb}': 'https://ppdb.ptdarrahman.sch.id/panduan-seb',
  '{link_grup_whatsapp}': 'https://chat.whatsapp.com/contoh',
  '{nama_gelombang}': 'Gelombang 1 TA 2026/2027',
  '{tanggal_tutup}': '31 Oktober 2026',
  '{tanggal_tutup_gelombang}': '31 Oktober 2026',
  '{batas_waktu_bayar}': '31 Oktober 2026 23:59',
  '{nominal_bayar}': 'Rp 350.000',
  '{alasan_gagal}': 'Saldo tidak mencukupi',
  '{alasan_penolakan}': 'Foto tidak jelas / buram',
  '{nilai_tiu}': '82',
  '{nama_ujian}': 'Ujian Tahfidz',
  '{tanggal}': 'Sabtu, 10 Oktober 2026',
  '{jam_mulai}': '08.00',
  '{jam_selesai}': '10.00',
  '{waktu}': '08.00 WIB',
  '{lokasi_atau_link}': 'Gedung Aula Lt. 2',
  '{deadline_daftar_ulang}': '20 Oktober 2026 23:59',
  '{sisa_waktu}': '2 pekan lagi',
  '{tanggal_jatuh_tempo}': '10 Januari 2027',
  '{bulan_cicilan}': 'Oktober 2026',
  '{nominal_cicilan}': 'Rp 1.500.000',
}

// Event key kanonikal berdasarkan spec notifikasi (urutan per fase)
const SPEC_EVENT_KEYS: Array<{ key: string; label: string; phase: string }> = [
  // Fase 1
  { key: 'registration_account_created', label: 'Pendaftaran Akun Berhasil',              phase: '1 – Pendaftaran' },
  { key: 'payment_success_formulir',     label: 'Pembayaran Formulir Berhasil',           phase: '1 – Pendaftaran' },
  { key: 'wave_closed_pending_payment',  label: 'Gelombang Ditutup – Tagihan Dibatalkan', phase: '1 – Pendaftaran' },
  { key: 'payment_reminder_monday',      label: 'Pengingat Bayar Formulir (Senin)',       phase: '1 – Pendaftaran' },
  // Fase 2
  { key: 'document_rejected_revision',   label: 'Dokumen Ditolak – Perlu Revisi',         phase: '2 – Dokumen' },
  { key: 'document_approved_non_tiu',    label: 'Dokumen Disetujui (Bukan TIU)',          phase: '2 – Dokumen' },
  { key: 'tiu_exam_instructions',        label: 'Instruksi Ujian TIU',                    phase: '2 – Dokumen/TIU' },
  { key: 'tiu_result_ready',             label: 'Hasil TIU Tersedia',                     phase: '2 – Dokumen/TIU' },
  // Fase 3
  { key: 'session_confirmed',            label: 'Jadwal Ujian Terkonfirmasi',              phase: '3 – Ujian' },
  { key: 'tahfidz_score_recorded',       label: 'Nilai Tahfidz Direkam',                  phase: '3 – Ujian' },
  { key: 'interview_completed',          label: 'Wawancara Selesai',                       phase: '3 – Ujian' },
  // Fase 4
  { key: 'selection_result_passed',      label: 'Lulus Seleksi + Instruksi DP',           phase: '4 – Kelulusan' },
  { key: 'selection_result_failed',      label: 'Tidak Lulus Seleksi',                    phase: '4 – Kelulusan' },
  { key: 'dp_payment_reminder',          label: 'Pengingat Bayar DP Mingguan',            phase: '4 – Kelulusan' },
  { key: 'dp_payment_success',           label: 'Pembayaran DP Berhasil + SKD',           phase: '4 – Kelulusan' },
  // Fase 5
  { key: 'reminder_upload_docs_h3',      label: 'Pengingat Upload Dokumen H+3',           phase: '5 – Pengingat' },
  { key: 'reminder_take_session_h2',     label: 'Pengingat Pilih Jadwal Ujian H+2',       phase: '5 – Pengingat' },
  { key: 'reminder_exam_1hour',          label: 'Pengingat Ujian 1 Jam Sebelum',          phase: '5 – Pengingat' },
  { key: 'reminder_installment',         label: 'Pengingat Cicilan Bulanan',               phase: '5 – Pengingat' },
]

const SPEC_PHASES = [...new Set(SPEC_EVENT_KEYS.map(s => s.phase))]

// ── Status & channel display ───────────────────────────────────────────────────

const LOG_STATUS_META: Record<string, { label: string; color: string }> = {
  sent:           { label: 'Terkirim',      color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  queued:         { label: 'Antrian',       color: 'border-blue-200 bg-blue-50 text-blue-700' },
  failed:         { label: 'Gagal',         color: 'border-red-200 bg-red-50 text-red-700' },
  invalid_number: { label: 'No. Tdk Valid', color: 'border-orange-200 bg-orange-50 text-orange-700' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderPreview(body: string): string {
  let result = body
  for (const [k, v] of Object.entries(PREVIEW_CONTEXT)) {
    result = result.split(k).join(v)
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

function exportCSV(logs: NotifLog[]) {
  const header = 'ID,Event,Penerima,Phone,Channel,Status,Retry,WA ID,Waktu\n'
  const rows = logs.map(l => [
    l.id, l.event_key, l.recipient_name ?? '',
    l.recipient_phone ?? '', l.channel, l.status,
    l.retry_count ?? 0, l.wa_message_id ?? '',
    l.sent_at || l.created_at,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notif-logs-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── VarChip ────────────────────────────────────────────────────────────────────

function VarChip({
  varKey, desc, onInsert,
}: {
  varKey: string
  desc: string
  onInsert: (v: string) => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title={desc}
      onClick={() => {
        onInsert(varKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-50" />}
      {varKey}
    </button>
  )
}

// ── Tab: Kirim Pesan ──────────────────────────────────────────────────────────

function SendTab({ templates }: { templates: Template[] }) {
  const { toast } = useToast()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [body, setBody] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTpl, setSelectedTpl] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch<any>('/users?per_page=500'),
      apiFetch<any>('/ppdb/applicants?perPage=500'),
    ])
      .then(([usersRes, applicantsRes]) => {
        const ul: any[] = Array.isArray(usersRes) ? usersRes : (usersRes?.data ?? [])
        const al: any[] = applicantsRes?.data ?? []
        const list: Recipient[] = [
          ...ul
            .filter(u => u.user_type !== 'superadmin' && u.user_type !== 'applicant')
            .map(u => ({
              user_id: u.id,
              name: u.full_name || u.username,
              username: u.username,
              email: u.email || '',
              phone: u.phone || '',
              type: 'Admin' as const,
            })),
          ...al
            .filter(a => a.user_id)
            .map(a => ({
              user_id: a.user_id,
              name: a.full_name,
              username: a.username || '',
              email: a.email || '',
              phone: a.phone || '',
              type: 'Pendaftar' as const,
            })),
        ]
        setRecipients(list)
      })
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [])

  const filtered = recipients.filter(r => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return [r.name, r.username, r.email, r.phone].some(v => v.toLowerCase().includes(q))
  })

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onTplChange(id: string) {
    setSelectedTpl(id)
    const tpl = templates.find(t => t.id === id)
    if (tpl) setBody(tpl.body)
  }

  async function doSend() {
    setConfirmOpen(false)
    setSending(true)
    try {
      const res = await apiFetch<any>('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          recipient_user_ids: Array.from(selected),
          channel: 'whatsapp',
          subject: '',
          body,
        }),
      })
      toast('success', res?.message || `Notifikasi diantrekan ke ${selected.size} penerima`)
      setSelected(new Set())
      setBody('')
    } catch (e: unknown) {
      toast('error', (e as Error).message || 'Gagal mengirim')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Daftar penerima */}
      <Card className="lg:col-span-3">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">
              Pilih Penerima ({selected.size} dipilih)
            </Label>
            <div className="flex gap-2">
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setSelected(new Set(filtered.map(r => r.user_id)))}
              >
                Semua
              </Button>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setSelected(new Set())}
              >
                Bersihkan
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nama / username / email / WA..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-1.5 space-y-0.5">
            {recLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat penerima...</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Tidak Ada Penerima"
                description="Tidak ada user yang cocok."
                className="bg-transparent border-transparent py-6"
              />
            ) : (
              filtered.map(r => (
                <label
                  key={r.user_id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selected.has(r.user_id)}
                    onCheckedChange={() => toggle(r.user_id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{r.name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {r.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone || 'Tanpa WA'}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Komposer pesan */}
      <Card className="lg:col-span-2">
        <CardContent className="p-5 space-y-4">
          {/* Channel badge — WA only */}
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-700">WhatsApp</span>
            <span className="ml-auto text-xs text-green-600">Satu-satunya channel</span>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="use-tpl"
              checked={useTemplate}
              onCheckedChange={v => setUseTemplate(Boolean(v))}
            />
            <label htmlFor="use-tpl" className="text-sm cursor-pointer">
              Pakai template yang ada
            </label>
          </div>

          {useTemplate && (
            <div className="space-y-1.5">
              <Label>Template</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedTpl}
                onChange={e => onTplChange(e.target.value)}
              >
                <option value="">— Pilih template —</option>
                {templates
                  .filter(t => t.is_active)
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Body Pesan *</Label>
            <Textarea
              rows={8}
              className="font-mono text-sm"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Tulis pesan atau pilih template di atas..."
            />
          </div>

          {body && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Preview
              </p>
              <pre className="whitespace-pre-wrap break-words font-sans text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                {renderPreview(body)}
              </pre>
            </div>
          )}

          <Button
            className="w-full"
            disabled={sending || selected.size === 0 || !body.trim()}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Mengirim...' : `Kirim ke ${selected.size} Penerima`}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSend}
        title="Kirim Notifikasi WhatsApp"
        message={`Notifikasi akan dikirim ke ${selected.size} penerima via WhatsApp.\n\nYakin ingin melanjutkan?`}
        confirmLabel="Ya, Kirim"
      />
    </div>
  )
}

// ── Tab: Template Manager ──────────────────────────────────────────────────────

interface TemplateTabProps {
  /** Templates dari parent — sudah terfilter untuk PPDB (tanpa user_created/password_reset). */
  templates: Template[]
  loading: boolean
  /** Dipanggil setelah simpan agar parent refresh state-nya. */
  onRefresh: () => void
}

function TemplateTab({ templates, loading, onRefresh }: TemplateTabProps) {
  const [editTarget, setEditTarget] = useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')

  // Lookup: event_key → template dari DB
  const templateByKey = Object.fromEntries(templates.map(t => [t.event_key, t]))

  // Event key dari spec yang belum ada di DB
  const coveredKeys = new Set(templates.map(t => t.event_key))
  const uncoveredSpec = SPEC_EVENT_KEYS.filter(s => !coveredKeys.has(s.key))

  // Filter baris spec
  const filteredSpec = SPEC_EVENT_KEYS.filter(s => {
    if (phaseFilter && s.phase !== phaseFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.key.includes(q) || s.label.toLowerCase().includes(q)
    }
    return true
  })

  // Template legacy (tidak ada di spec terbaru), hanya tampil jika tidak ada filter fase
  const legacyTemplates = templates
    .filter(t => !SPEC_EVENT_KEYS.find(s => s.key === t.event_key))
    .filter(t => {
      if (phaseFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return t.event_key.includes(q) || t.label.toLowerCase().includes(q)
      }
      return true
    })

  const activeCount = templates.filter(t => t.is_active).length
  const specCoveredCount = SPEC_EVENT_KEYS.filter(s => coveredKeys.has(s.key)).length

  return (
    <>
      {/* Statistik */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{specCoveredCount}/{SPEC_EVENT_KEYS.length}</p>
            <p className="text-xs text-muted-foreground">Event spec terpenuhi</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{templates.length}</p>
            <p className="text-xs text-muted-foreground">Total template di DB</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Template aktif</p>
          </div>
        </div>
      </div>

      {/* Peringatan template belum ada */}
      {uncoveredSpec.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">
              {uncoveredSpec.length} event key dari spec belum ada di database
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Jalankan{' '}
              <code className="bg-amber-100 px-1 rounded">alembic upgrade head</code>{' '}
              untuk seed template baru. Event belum ada:{' '}
              {uncoveredSpec.slice(0, 3).map(s => s.key).join(', ')}
              {uncoveredSpec.length > 3 ? ` +${uncoveredSpec.length - 3} lainnya` : ''}.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold">Template Notifikasi</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs w-44"
                  placeholder="Cari event / label..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
                value={phaseFilter}
                onChange={e => setPhaseFilter(e.target.value)}
              >
                <option value="">Semua Fase</option>
                {SPEC_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Event Key</TableHead>
                <TableHead>Label / Fase</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Memuat template...
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Baris spec (urutan kanonikal) */}
                  {filteredSpec.map(spec => {
                    const tpl = templateByKey[spec.key]
                    return (
                      <TableRow key={spec.key} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {spec.key}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{tpl?.label ?? spec.label}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            {spec.phase}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tpl ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                              <MessageSquare className="h-3 w-3" />WhatsApp
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tpl ? (
                            <Badge variant={tpl.is_active ? 'success' : 'secondary'}>
                              {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Belum Ada</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {tpl ? (
                            <Button variant="outline" size="sm" onClick={() => setEditTarget(tpl)}>
                              <Edit2 className="h-3.5 w-3.5 mr-1" />Edit
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Perlu migration</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Template legacy (tidak ada di spec terbaru) */}
                  {legacyTemplates.length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="py-2 px-5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Template Legacy (tidak dalam spec terbaru)
                          </span>
                        </TableCell>
                      </TableRow>
                      {legacyTemplates.map(t => (
                        <TableRow key={t.id} className="opacity-70 hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                              {t.event_key}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.label}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                              <MessageSquare className="h-3 w-3" />WhatsApp
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
                      ))}
                    </>
                  )}

                  {filteredSpec.length === 0 && legacyTemplates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10">
                        <EmptyState
                          icon={Bell}
                          title="Tidak Ada Template"
                          description="Tidak ada template yang cocok."
                          className="bg-transparent border-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editTarget && (
        <TemplateEditDialog
          template={editTarget}
          open
          onClose={() => setEditTarget(null)}
          onSaved={() => { onRefresh(); setEditTarget(null) }}
        />
      )}
    </>
  )
}

// ── Dialog Edit Template ───────────────────────────────────────────────────────

function TemplateEditDialog({
  template, open, onClose, onSaved,
}: {
  template: Template
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    label: template.label,
    body: template.body,
    is_active: template.is_active,
  })
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [varGroupFilter, setVarGroupFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertVar(varKey: string) {
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
  }

  async function save() {
    setSaving(true)
    try {
      await notificationService.updateTemplate(template.id, {
        label: form.label,
        channel: 'whatsapp',
        email_subject: null,
        body: form.body,
        is_active: form.is_active,
      })
      toast('success', 'Template berhasil disimpan')
      onSaved()
    } catch (e: unknown) {
      toast('error', (e as Error).message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const filteredVars = varGroupFilter
    ? AVAILABLE_VARS.filter(v => v.group === varGroupFilter)
    : AVAILABLE_VARS

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" />
            Edit:{' '}
            <span className="font-mono text-sm text-muted-foreground">
              {template.event_key}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel fixed */}
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">WhatsApp</span>
            <span className="ml-2 text-xs text-muted-foreground">
              Channel tidak bisa diubah — email tidak digunakan
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
            />
          </div>

          {/* Variabel picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Klik variabel untuk menyisipkan ke kursor:
                </span>
              </div>
              <select
                className="h-7 rounded border border-input bg-background px-2 text-xs"
                value={varGroupFilter}
                onChange={e => setVarGroupFilter(e.target.value)}
              >
                <option value="">Semua grup</option>
                {VAR_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              {filteredVars.map(v => (
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
                {showPreview
                  ? <><EyeOff className="h-3.5 w-3.5" />Sembunyikan preview</>
                  : <><Eye className="h-3.5 w-3.5" />Tampilkan preview</>}
              </button>
            </div>
            <Textarea
              ref={textareaRef}
              className="min-h-[220px] font-mono text-sm leading-relaxed"
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Isi pesan..."
            />
            <p className="text-[11px] text-muted-foreground">
              *teks* = bold, _teks_ = italic (WhatsApp formatting)
            </p>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-500" />
                Preview (contoh data)
              </Label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
                  {renderPreview(form.body) || (
                    <span className="italic text-muted-foreground">Tulis body pesan...</span>
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* Toggle aktif */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              id="tpl-is-active"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="tpl-is-active" className="cursor-pointer text-sm font-medium">
              Template aktif — akan dikirim saat event terpicu
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Log Pengiriman ────────────────────────────────────────────────────────

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

  const fetchLogs = useCallback(
    (p: number, status: string, event: string) => {
      const qs = new URLSearchParams({ page: String(p), perPage: '20' })
      if (status) qs.set('status', status)
      if (event) qs.set('event_key', event)
      setLoading(true)
      return apiFetch<any>(`/notifications/logs?${qs}`)
        .then(res => {
          setLogs(res?.data || [])
          setTotal(res?.total ?? 0)
          setTotalPages(res?.totalPages ?? Math.ceil((res?.total ?? 0) / 20))
        })
        .catch((e: unknown) => {
          toast('error', (e as Error).message || 'Gagal memuat log')
        })
        .finally(() => setLoading(false))
    },
    [toast],
  )

  // Fetch ulang saat filter berubah, reset ke halaman 1
  useEffect(() => {
    setPage(1)
    fetchLogs(1, statusFilter, eventFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, eventFilter])

  // Auto-refresh tiap 10 detik
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(page, statusFilter, eventFilter), 10_000)
    return () => clearInterval(id)
  }, [autoRefresh, page, statusFilter, eventFilter, fetchLogs])

  function goPage(p: number) {
    setPage(p)
    fetchLogs(p, statusFilter, eventFilter)
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="flex flex-1 items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Log Pengiriman</span>
            {total > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {total}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="sent">Terkirim</option>
              <option value="queued">Antrian</option>
              <option value="failed">Gagal</option>
              <option value="invalid_number">No. Tidak Valid</option>
            </select>
            <Input
              className="h-8 w-44 text-xs"
              placeholder="Cari event key..."
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
            />
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto 10s
            </label>
            <Button
              variant="outline" size="sm"
              onClick={() => fetchLogs(page, statusFilter, eventFilter)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => exportCSV(logs)}
              disabled={logs.length === 0}
            >
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
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Memuat log...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <EmptyState
                    icon={Inbox}
                    title="Belum Ada Log"
                    description="Belum ada log pengiriman notifikasi."
                    className="bg-transparent border-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => {
                const sm = LOG_STATUS_META[log.status] ?? LOG_STATUS_META.failed
                return (
                  <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="text-sm font-medium">{log.recipient_name || '—'}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {log.recipient_phone || log.recipient_email || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                        {log.event_key}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <MessageSquare className="h-3 w-3" />WA
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${sm.color}`}>
                        {sm.label}
                      </span>
                      {log.error_message && (
                        <p
                          className="mt-0.5 max-w-[160px] truncate text-[11px] text-red-500"
                          title={log.error_message}
                        >
                          {log.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(log.retry_count ?? 0) > 0 ? (
                        <span className="text-xs font-semibold text-amber-600">
                          {log.retry_count}×
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.wa_message_id ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.wa_message_id.slice(0, 16)}…
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(log.sent_at || log.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <span>Halaman {page} dari {totalPages} ({total} log)</span>
            <div className="flex gap-1.5">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => goPage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [tplLoading, setTplLoading] = useState(true)
  const [waReady, setWaReady] = useState(false)
  const [waConfigured, setWaConfigured] = useState(false)

  // Cek status WA service via API
  useEffect(() => {
    apiFetch<any>('/notifications/status')
      .then(res => {
        setWaConfigured(res?.configured === true)
        setWaReady(res?.data?.session?.isReady === true || res?.isReady === true)
      })
      .catch(() => {
        setWaConfigured(false)
        setWaReady(false)
      })
  }, [])

  // Load templates di parent — satu-satunya sumber; SendTab dan TemplateTab
  // keduanya menerima state ini sebagai prop, tidak fetch sendiri.
  const fetchTemplates = useCallback(async () => {
    setTplLoading(true)
    try {
      const data = await notificationService.getTemplates()
      setTemplates(data)
    } catch (e: unknown) {
      toast('error', (e as Error).message || 'Gagal memuat template')
    } finally {
      setTplLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  // Sembunyikan template yang tidak relevan untuk admin PPDB (user_created, password_reset
  // adalah domain superadmin)
  const ppdbTemplates = templates.filter(
    t => t.event_key !== 'user_created' && t.event_key !== 'password_reset',
  )
  const activeCount = ppdbTemplates.filter(t => t.is_active).length
  const specCoveredCount = SPEC_EVENT_KEYS.filter(s =>
    templates.some(t => t.event_key === s.key),
  ).length

  const headerBlocks: HeaderBlock[] = [
    {
      icon: MessageSquare,
      label: 'Channel',
      value: 'WhatsApp Only',
      active: true,
    },
    {
      icon: FileText,
      label: 'Event Spec',
      value: `${specCoveredCount}/${SPEC_EVENT_KEYS.length} terpenuhi`,
      active: specCoveredCount === SPEC_EVENT_KEYS.length,
    },
    {
      icon: CheckCircle2,
      label: 'Template Aktif',
      value: tplLoading ? '...' : String(activeCount),
      active: activeCount > 0,
    },
    {
      icon: waReady ? Zap : AlertTriangle,
      label: 'WhatsApp',
      value: waReady ? 'Terhubung' : waConfigured ? 'Offline' : 'Belum Dikonfigurasi',
      active: waReady,
      pulse: waReady,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Sistem Notifikasi"
        description="Kelola template pesan WhatsApp, pantau log pengiriman, dan kirim broadcast kustom."
        blocks={headerBlocks}
        loading={tplLoading}
      />

      {!waConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">WhatsApp Service Belum Dikonfigurasi</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Tambahkan{' '}
              <code className="rounded bg-amber-100 px-1">WA_SERVICE_URL</code> dan{' '}
              <code className="rounded bg-amber-100 px-1">WA_SERVICE_API_KEY</code>{' '}
              ke <code className="rounded bg-amber-100 px-1">apps/api/.env</code>,
              lalu restart backend.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="templates">
        <TabsList className="mb-2">
          <TabsTrigger value="send" className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />Kirim Pesan
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />Template
            {specCoveredCount < SPEC_EVENT_KEYS.length && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {SPEC_EVENT_KEYS.length - specCoveredCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <SendTab templates={ppdbTemplates} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateTab
            templates={ppdbTemplates}
            loading={tplLoading}
            onRefresh={fetchTemplates}
          />
        </TabsContent>
        <TabsContent value="logs">
          <LogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
