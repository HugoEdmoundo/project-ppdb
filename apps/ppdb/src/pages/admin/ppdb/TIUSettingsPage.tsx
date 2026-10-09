import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound, Save, Timer, Link as LinkIcon, Info,
  CheckCircle2, AlertCircle, Eye, EyeOff, Copy, Check, Webhook,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Button, Card, CardContent, Input, Label, Badge } from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

type TIUSettings = {
  google_form_url: string
  duration_minutes: string | number
  webhook_secret_configured: boolean
}

export default function TIUSettingsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()
  const [formUrl, setFormUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)

  const settingsQuery = useQuery({
    queryKey: ['ppdb-tiu-settings'],
    queryFn: () => apiFetch<TIUSettings>('/ppdb/tiu-settings'),
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    setFormUrl(settingsQuery.data.google_form_url)
    setDuration(String(settingsQuery.data.duration_minutes))
  }, [settingsQuery.data])

  const saveSettings = useMutation({
    mutationFn: () => apiFetch<TIUSettings>('/ppdb/tiu-settings', {
      method: 'PUT',
      body: JSON.stringify({
        google_form_url: formUrl.trim(),
        duration_minutes: Number(duration),
        ...(webhookSecret.trim() ? { webhook_secret: webhookSecret.trim() } : {}),
      }),
    }),
    onSuccess: () => {
      setWebhookSecret('')
      queryClient.invalidateQueries({ queryKey: ['ppdb-tiu-settings'] })
      toast('success', 'Pengaturan TIU berhasil disimpan')
    },
    onError: (error: any) => toast('error', error.message || 'Gagal menyimpan pengaturan TIU'),
  })

  const appsScriptCode = `function onSubmit(e) {
  var formResponses = e.response.getItemResponses();
  var token = "";

  // Cari jawaban dengan judul mengandung kata "Token"
  for (var i = 0; i < formResponses.length; i++) {
    var item = formResponses[i];
    if (item.getItem().getTitle().toLowerCase().indexOf("token") !== -1) {
      token = item.getResponse();
      break;
    }
  }

  // Hitung skor dari soal Kuis (fitur Kuis Google Form harus aktif)
  var score = 0;
  formResponses.forEach(function(r) {
    if (r.getScore) { score += r.getScore() || 0; }
  });

  var webhookUrl = "https://DOMAIN_ANDA/api/ppdb/webhook/tiu";
  var secret    = "MASUKKAN_SECRET_ANDA_DI_SINI";

  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "X-TIU-Secret": secret },
    payload: JSON.stringify({ token: token, score: score })
  });
}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isFormValid =
    formUrl.trim() &&
    duration &&
    Number.isInteger(Number(duration)) &&
    Number(duration) >= 1 &&
    Number(duration) <= 1440 &&
    (!webhookSecret.trim() || webhookSecret.trim().length >= 16)

  const secretConfigured = settingsQuery.data?.webhook_secret_configured

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Pengaturan TIU"
        description="Konfigurasi global integrasi Ujian Tes Inteligensi Umum (TIU) menggunakan Google Form + Safe Exam Browser (SEB)."
        loading={settingsQuery.isLoading}
        blocks={[
          {
            icon: Webhook,
            label: 'Webhook Secret',
            value: secretConfigured ? 'Terkonfigurasi' : 'Belum diset',
            active: !!secretConfigured,
            pulse: !!secretConfigured,
          },
          {
            icon: Timer,
            label: 'Durasi Ujian',
            value: settingsQuery.data?.duration_minutes
              ? `${settingsQuery.data.duration_minutes} menit`
              : '—',
            active: true,
          },
        ]}
      />

      {settingsQuery.isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Pengaturan TIU gagal dimuat. Coba muat ulang halaman.</span>
        </div>
      )}

      {/* ── SPLIT LAYOUT: Form (kiri, fleksibel) + Panduan (kanan, sticky scroll) ── */}
      <div className="flex gap-6 items-start">

        {/* ── KIRI: Form konfigurasi — fokus utama ── */}
        <div className="flex-1 min-w-0">
          <Card className="shadow-sm border-slate-200/80">
            <div className="px-6 py-4 border-b bg-slate-50/70 flex items-center gap-3 rounded-t-xl">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <LinkIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-800">Konfigurasi Pengaturan TIU</h2>
                <p className="text-xs text-muted-foreground">Berlaku secara global untuk semua gelombang.</p>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* URL Google Form */}
              <div className="space-y-2">
                <Label htmlFor="tiu-form-url" className="text-sm font-semibold flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  URL Pre-filled Google Form
                  <span className="text-rose-500 ml-0.5">*</span>
                </Label>
                <Input
                  id="tiu-form-url"
                  type="url"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?entry.12345={token}"
                  disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ganti nilai kolom token di URL dengan placeholder{' '}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{'{token}'}</code>.
                  Sistem akan mengisinya otomatis saat file{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">.seb</code> di-generate.
                </p>
              </div>

              {/* Durasi + Webhook Secret */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Durasi */}
                <div className="space-y-2">
                  <Label htmlFor="tiu-duration" className="text-sm font-semibold flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    Durasi Ujian
                    <span className="text-rose-500 ml-0.5">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tiu-duration"
                      type="number"
                      min={1}
                      max={1440}
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
                      className="max-w-[100px] text-center font-semibold"
                    />
                    <span className="text-sm text-muted-foreground font-medium">menit</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Jawaban melewati batas waktu ini otomatis ditolak sistem.
                  </p>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-2">
                  <Label htmlFor="tiu-secret" className="text-sm font-semibold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Webhook Secret
                    {secretConfigured ? (
                      <Badge variant="success" className="text-[10px] ml-1 gap-1 px-1.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0.5">
                        Belum diset
                      </Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="tiu-secret"
                      type={showSecret ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={webhookSecret}
                      onChange={e => setWebhookSecret(e.target.value)}
                      placeholder={secretConfigured ? 'Isi untuk mengganti' : 'Min. 16 karakter'}
                      disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {secretConfigured
                      ? 'Isi hanya untuk mengganti secret aktif.'
                      : 'Gunakan nilai yang sama di Apps Script.'}
                  </p>
                </div>
              </div>

              {/* Simpan */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Perubahan langsung berlaku untuk semua gelombang.
                </p>
                <Button
                  onClick={() => saveSettings.mutate()}
                  disabled={
                    !canCrud ||
                    settingsQuery.isLoading ||
                    saveSettings.isPending ||
                    !isFormValid
                  }
                  className="gap-2 h-9 px-5 shrink-0"
                >
                  <Save className="h-4 w-4" />
                  {saveSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── KANAN: Panduan — sticky, scroll sendiri, tidak ganggu halaman ── */}
        <div className="w-[320px] shrink-0 sticky top-6 max-h-[calc(100vh-9rem)] flex flex-col">
          <Card className="shadow-sm border-slate-200/80 flex flex-col h-full overflow-hidden">
            {/* Header panduan */}
            <div className="px-4 py-3 border-b bg-blue-50/70 flex items-center gap-2.5 shrink-0 rounded-t-xl">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Info className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="font-semibold text-xs text-slate-800">Panduan Integrasi</h2>
                <p className="text-[10px] text-muted-foreground">Google Form + Apps Script</p>
              </div>
            </div>

            {/* Scroll hanya di dalam panel ini */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-[11px] text-slate-800 mb-1">Buat Pertanyaan Token</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tambahkan pertanyaan <strong>Jawaban Singkat</strong> bertajuk kata{' '}
                    <strong>Token</strong> (cth: <em>"Token Ujian"</em>), atur{' '}
                    <strong>Wajib Isi</strong>, dan aktifkan mode <strong>Kuis</strong> di
                    pengaturan form.
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-[11px] text-slate-800 mb-1">Dapatkan Pre-filled URL</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Klik <strong>⋮ → Get pre-filled link</strong>, isi kolom Token dengan{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">X</code>, klik Get Link.
                    Paste URL di kolom kiri dan ganti{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">X</code> dengan{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">{'{token}'}</code>.
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  3
                </div>
                <div className="space-y-2 min-w-0">
                  <p className="font-semibold text-[11px] text-slate-800">Pasang Apps Script Webhook</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Buka <strong>Extensions → Apps Script</strong>. Paste kode berikut, ganti{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">DOMAIN</code> &amp;{' '}
                    <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">SECRET</code>, buat{' '}
                    <strong>Trigger onSubmit → On form submit</strong>.
                  </p>
                  <div className="rounded-lg overflow-hidden border border-slate-700">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-slate-300 text-[10px]">
                      <span className="font-mono">Apps Script</span>
                      <button
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied
                          ? <><Check className="h-3 w-3 text-emerald-400" /> Tersalin!</>
                          : <><Copy className="h-3 w-3" /> Salin Kode</>
                        }
                      </button>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-3 overflow-x-auto text-[10px] font-mono leading-relaxed whitespace-pre">
                      {appsScriptCode}
                    </pre>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
