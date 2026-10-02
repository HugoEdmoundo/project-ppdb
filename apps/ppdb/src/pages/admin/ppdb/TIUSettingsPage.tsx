import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BookOpenCheck, CheckCircle2, Clock3, KeyRound, Save, Timer } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

type TIUSettings = {
  google_form_url: string
  duration_minutes: string | number
  webhook_secret_configured: boolean
  sync_status: 'not_synced' | 'syncing' | 'success' | 'failed' | string
  sync_at: string
  sync_error: string
  sync_question_count: string | number
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

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Pengaturan TIU"
        description="Pengaturan ini berlaku global untuk semua gelombang. Google Form menjadi sumber soal; peserta tetap mengerjakan ujian di aplikasi PPDB."
      />

      {settingsQuery.isError && <Card><CardContent className="p-5 text-sm text-red-600">Pengaturan TIU gagal dimuat. Coba muat ulang halaman.</CardContent></Card>}

      <Card>
        <CardContent className="space-y-6 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-primary" /><Label htmlFor="tiu-form-url" className="text-base font-semibold">URL Google Form sumber soal</Label></div>
            <Input
              id="tiu-form-url"
              type="url"
              value={formUrl}
              onChange={event => setFormUrl(event.target.value)}
              placeholder="https://docs.google.com/forms/d/..."
              disabled={!canCrud || settingsQuery.isLoading || saveSettings.isPending}
            />
            <p className="text-xs text-muted-foreground">Gunakan link edit Google Form atau link forms.gle. Link ini untuk Apps Script admin, bukan untuk peserta.</p>
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><Label htmlFor="tiu-secret" className="text-base font-semibold">Webhook secret Apps Script</Label></div>
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
                ? 'Secret aktif tersimpan dan tidak ditampilkan kembali. Isi kolom ini hanya saat ingin menggantinya.'
                : 'Secret minimal 16 karakter. Gunakan nilai yang sama pada Apps Script sebagai header X-TIU-Secret.'}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Endpoint webhook hasil TIU</p>
            <code className="mt-1 block break-all text-xs">POST /notifications/webhook/tiu-result</code>
            <p className="mt-2 text-xs text-muted-foreground">Pengaturan TIU disimpan global. URL dan secret tidak dibuat per gelombang.</p>
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
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="font-semibold">Sinkronisasi soal</h2></div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {settingsQuery.data?.sync_status === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : settingsQuery.data?.sync_status === 'failed' ? <AlertCircle className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
            <span>Status: <strong>{settingsQuery.data?.sync_status === 'success' ? 'Berhasil' : settingsQuery.data?.sync_status === 'failed' ? 'Gagal' : settingsQuery.data?.sync_status === 'syncing' ? 'Sedang berjalan' : 'Belum pernah sinkron'}</strong></span>
            {settingsQuery.data?.sync_at && <span className="text-muted-foreground">· Percobaan terakhir {new Date(settingsQuery.data.sync_at).toLocaleString('id-ID')}</span>}
            {Number(settingsQuery.data?.sync_question_count || 0) > 0 && <span className="text-muted-foreground">· Paket valid terakhir: {settingsQuery.data?.sync_question_count} soal</span>}
          </div>
          {settingsQuery.data?.sync_error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{settingsQuery.data.sync_error}</div>}
          <p className="text-xs text-muted-foreground">Apps Script mengirim paket pilihan ganda ke <code>POST /ppdb/tiu-questions/sync</code> dengan header <code>X-TIU-Secret</code>. Jika validasi gagal, paket valid terakhir tetap dipakai.</p>
        </CardContent>
      </Card>
    </div>
  )
}
