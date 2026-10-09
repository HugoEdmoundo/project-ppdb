import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  KeyRound, Save, Timer, Link as LinkIcon, Info,
  CheckCircle2, AlertCircle, Eye, EyeOff, Copy, Check,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Button, Card, CardContent, Input, Label, Badge } from '@/components/ui'

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

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://DOMAIN_ANDA'
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

  var webhookUrl = "${currentOrigin}/api/ppdb/webhook/tiu";
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
    <div className="-m-4 md:-m-6 lg:-m-8 flex flex-col lg:flex-row h-auto lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden animate-fade-in">
      {/* ── KIRI: Formulir Konfigurasi Utama (Fokus) ── */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-start space-y-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Header Bersih & Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/60">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Pengaturan TIU
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Integrasi Ujian Tes Inteligensi Umum (TIU) via Google Form + Safe Exam Browser (SEB).
            </p>
          </div>
          <div>
            {secretConfigured ? (
              <Badge variant="success" className="text-xs px-3 py-1 gap-1.5 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Webhook Aktif
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold">
                Webhook Belum Diset
              </Badge>
            )}
          </div>
        </div>

        {settingsQuery.isError && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Pengaturan TIU gagal dimuat. Coba muat ulang halaman.</span>
          </div>
        )}

        {/* Card Formulir */}
        <Card className="shadow-sm border-slate-200/80">
          <div className="px-6 py-4 border-b bg-slate-50/70 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <LinkIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-800">Formulir Konfigurasi</h2>
                <p className="text-xs text-muted-foreground">Berlaku secara global untuk seluruh gelombang.</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Input 1: Pre-filled URL */}
            <div className="space-y-1.5">
              <Label htmlFor="tiu-form-url" className="text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
                Pre-filled URL Google Form
                <span className="text-rose-500">*</span>
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
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ganti nilai token di URL dengan placeholder{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-medium">{'{token}'}</code>.
                Sistem akan mengisinya otomatis saat file <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">.seb</code> diunduh santri.
              </p>
            </div>

            {/* Grid 2-Kolom: Durasi & Webhook Secret */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              {/* Durasi */}
              <div className="space-y-1.5">
                <Label htmlFor="tiu-duration" className="text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                  <Timer className="h-3.5 w-3.5 text-slate-400" />
                  Durasi Ujian
                  <span className="text-rose-500">*</span>
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
                    className="w-24 text-center font-bold text-sm"
                  />
                  <span className="text-xs text-muted-foreground font-medium">menit</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Jawaban melewati batas waktu otomatis ditolak oleh sistem.
                </p>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1.5">
                <Label htmlFor="tiu-secret" className="text-xs font-semibold flex items-center gap-1.5 text-slate-800">
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                  Webhook Secret
                </Label>
                <div className="relative">
                  <Input
                    id="tiu-secret"
                    type={showSecret ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    placeholder={secretConfigured ? 'Tersimpan (isi untuk mengganti)' : 'Minimal 16 karakter'}
                    disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showSecret ? 'Sembunyikan secret' : 'Tampilkan secret'}
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {secretConfigured
                    ? 'Kunci aktif tersimpan. Isi hanya jika ingin menggantinya.'
                    : 'Minimal 16 karakter. Samakan nilainya pada Apps Script.'}
                </p>
              </div>
            </div>

            {/* Simpan Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <p className="text-[11px] text-muted-foreground">
                Perubahan langsung berlaku ke seluruh pendaftaran aktif.
              </p>
              <Button
                onClick={() => saveSettings.mutate()}
                disabled={
                  !canCrud ||
                  settingsQuery.isLoading ||
                  saveSettings.isPending ||
                  !isFormValid
                }
                className="gap-2 h-9 px-5 text-xs font-semibold shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                {saveSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── KANAN: Panduan Integrasi (nempel pojok kanan, tanpa Card, scroll tanpa scrollbar) ── */}
      <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-slate-50/50 p-6 flex flex-col overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Header Panduan (Simple, no card container) */}
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-200/70 shrink-0">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Panduan Integrasi</h3>
            <p className="text-[11px] text-muted-foreground">Google Form + Safe Exam Browser (SEB)</p>
          </div>
        </div>

        {/* Isi Panduan */}
        <div className="space-y-5 text-xs text-slate-600">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-xs text-slate-800">Pertanyaan Token di Google Form</h4>
              <p className="leading-relaxed text-[11px] text-slate-500">
                Buat 1 pertanyaan bertipe <strong className="text-slate-700">Jawaban Singkat</strong> dengan judul mengandung kata <strong className="text-slate-700">Token</strong> (cth: <em>"Token Ujian"</em>). Aktifkan <strong className="text-slate-700">Wajib Isi</strong>, dan nyalakan opsi <strong className="text-slate-700">Jadikan kuis</strong> di setelan formulir.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-xs text-slate-800">Dapatkan Pre-filled URL</h4>
              <p className="leading-relaxed text-[11px] text-slate-500">
                Klik menu <strong className="text-slate-700">⋮ → Dapatkan link yang sudah terisi</strong>. Isi kolom Token dengan teks <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] text-slate-800">X</code>, lalu salin link-nya. Tempel di form sebelah kiri dan ganti <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px] text-slate-800">X</code> dengan <code className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">{'{token}'}</code>.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-200/60" />

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              3
            </div>
            <div className="space-y-2.5 min-w-0 flex-1">
              <h4 className="font-semibold text-xs text-slate-800">Pasang Script Webhook</h4>
              <p className="leading-relaxed text-[11px] text-slate-500">
                Buka <strong className="text-slate-700">Ekstensi → Apps Script</strong> di Google Form. Tempel kode di bawah, sesuaikan variabel <code className="bg-white border border-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">SECRET</code>, lalu buat pemicu (Trigger) <strong className="text-slate-700">Saat mengirim formulir</strong>.
              </p>

              {/* Code Snippet Box */}
              <div className="rounded-xl overflow-hidden border border-slate-800 shadow-sm bg-slate-900">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/90 text-slate-300 text-[11px] border-b border-slate-700">
                  <span className="font-mono text-[10px] text-slate-400">Apps Script (Code.gs)</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-[10px]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[10px] font-mono leading-relaxed text-slate-200 overflow-x-auto whitespace-pre [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
