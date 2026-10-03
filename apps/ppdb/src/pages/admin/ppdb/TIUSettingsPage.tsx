import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Save, Timer, Link as LinkIcon, Info } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
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
  // Pastikan Anda mengaktifkan trigger onSubmit untuk form ini
  var formResponses = e.response.getItemResponses();
  var token = "";
  
  // Asumsi Pertanyaan 1 adalah Token
  for (var i = 0; i < formResponses.length; i++) {
    var itemResponse = formResponses[i];
    if (itemResponse.getItem().getTitle().toLowerCase().indexOf("token") !== -1) {
      token = itemResponse.getResponse();
      break;
    }
  }

  // Hitung Skor (Pastikan fitur Kuis Google Form menyala)
  var score = 0;
  var gradableItems = formResponses.filter(function(r) { return r.getItem().getType() !== FormApp.ItemType.TEXT; });
  gradableItems.forEach(function(r) {
    if (r.getScore) { score += r.getScore() || 0; }
  });

  var webhookUrl = "${window.location.origin}/api/ppdb/webhook/tiu";
  var secret = "MASUKKAN_SECRET_ANDA_DI_SINI";
  
  UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "X-TIU-Secret": secret },
    payload: JSON.stringify({ token: token, score: score })
  });
}`

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Pengaturan TIU (Integrasi Google Form via SEB)"
        description="Pengaturan global Ujian TIU. Sistem PPDB akan membungkus Google Form ke dalam file Safe Exam Browser (.seb) dengan menyuntikkan token pendaftar secara otomatis (Pre-filled)."
      />

      {settingsQuery.isError && <Card><CardContent className="p-5 text-sm text-red-600">Pengaturan TIU gagal dimuat. Coba muat ulang halaman.</CardContent></Card>}

      <Card>
        <CardContent className="space-y-6 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /><Label htmlFor="tiu-form-url" className="text-base font-semibold">Pre-filled URL Google Form (Dengan Token Placeholder)</Label></div>
            <Input
              id="tiu-form-url"
              type="url"
              value={formUrl}
              onChange={event => setFormUrl(event.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.12345={token}"
              disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
            />
            <p className="text-xs text-muted-foreground">Isi bagian nilai jawaban token di URL tersebut dengan teks <strong>&#123;token&#125;</strong>. Sistem akan menggantinya dengan kode peserta secara otomatis.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /><Label htmlFor="tiu-duration" className="text-base font-semibold">Durasi ujian</Label></div>
            <div className="flex max-w-xs items-center gap-2">
              <Input
                id="tiu-duration"
                type="number"
                min={1}
                max={1440}
                value={duration}
                onChange={event => setDuration(event.target.value)}
                disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
              />
              <span className="text-sm text-muted-foreground">menit</span>
            </div>
            <p className="text-xs text-muted-foreground">Nilai yang dikirim Google Form <strong>setelah batas durasi ini habis</strong> akan otomatis ditolak oleh sistem.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><Label htmlFor="tiu-secret" className="text-base font-semibold">Webhook Secret Apps Script</Label></div>
            <Input
              id="tiu-secret"
              type="password"
              autoComplete="new-password"
              value={webhookSecret}
              onChange={event => setWebhookSecret(event.target.value)}
              placeholder={settingsQuery.data?.webhook_secret_configured ? 'Secret sudah tersimpan; isi untuk menggantinya' : 'Masukkan secret minimal 16 karakter'}
              disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
            />
            <p className="text-xs text-muted-foreground">
              {settingsQuery.data?.webhook_secret_configured
                ? 'Secret aktif tersimpan. Isi kolom ini hanya saat ingin menggantinya.'
                : 'Minimal 16 karakter. Gunakan nilai yang sama pada Apps Script Google Form.'}
            </p>
          </div>

          <Button
            onClick={() => saveSettings.mutate()}
            disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending || !formUrl.trim() || !duration || !Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 1440 || (!!webhookSecret.trim() && webhookSecret.trim().length < 16)}
          >
            <Save className="mr-2 h-4 w-4" />{saveSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Panduan Integrasi Google Form</h3>
          </div>
          
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">1. Buat Pertanyaan Token</h4>
              <p>Tambahkan 1 pertanyaan "Short Answer" (Jawaban Singkat) di Google Form Anda. Beri judul pertanyaan yang mengandung kata <strong>Token</strong> (contoh: "Token Ujian"). Setel sebagai "Required/Wajib Isi".</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">2. Dapatkan Pre-filled URL</h4>
              <p>Klik menu (titik tiga) di kanan atas Google Form, pilih <strong>Get pre-filled link</strong>. Isi sembarang teks (misal: "X") pada kolom Token tadi, lalu klik "Get Link".</p>
              <p>Di halaman Pengaturan TIU ini (kolom atas), *paste* link tersebut. Ganti teks "X" dengan <code>&#123;token&#125;</code>. Contoh jadinya: <code>...&entry.234567=&#123;token&#125;</code>.</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">3. Pasang Google Apps Script Webhook</h4>
              <p>Buka <strong>Script editor</strong> di Google Form. Paste kode di bawah ini, sesuaikan Secret-nya, simpan, dan jangan lupa buat <strong>Trigger</strong> untuk function <code>onSubmit</code> dengan event "On form submit".</p>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-md mt-2 overflow-x-auto text-xs font-mono">
                {appsScriptCode}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

