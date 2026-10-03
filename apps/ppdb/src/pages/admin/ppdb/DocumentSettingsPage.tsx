import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, ImageUp, Save } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Button, Card, CardContent, Label, Textarea } from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

type DocumentSettings = {
  loa_template: string
  loa_draft_template: string
  loa_is_published: boolean
  loa_published_at: string
  skd_background_url: string
  whatsapp_group_link?: string
}

const FIXED_LOA_CLAUSE = 'Seluruh dana yang telah dibayarkan tidak dapat dikembalikan.'

export default function DocumentSettingsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState('')
  const [backgroundUrl, setBackgroundUrl] = useState('')

  const settingsQuery = useQuery({
    queryKey: ['ppdb-document-settings'],
    queryFn: () => apiFetch<DocumentSettings>('/ppdb/document-settings'),
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    setTemplate(settingsQuery.data.loa_draft_template || settingsQuery.data.loa_template)
    setBackgroundUrl(settingsQuery.data.skd_background_url)
    setWaLink(settingsQuery.data.whatsapp_group_link || '')
  }, [settingsQuery.data])

  const saveTemplate = useMutation({
    mutationFn: () => apiFetch('/ppdb/document-settings/loa-template', {
      method: 'PUT', body: JSON.stringify({ loa_template: template }),
    }),
    onSuccess: () => {
      toast('success', 'Draft template LoA tersimpan')
      queryClient.invalidateQueries({ queryKey: ['ppdb-document-settings'] })
    },
    onError: (error: any) => toast('error', error.message || 'Gagal menyimpan template LoA'),
  })

  const publishTemplate = useMutation({
    mutationFn: () => apiFetch('/ppdb/document-settings/loa-template/publish', { method: 'POST' }),
    onSuccess: () => {
      toast('success', 'Template LoA berhasil dipublikasikan')
      queryClient.invalidateQueries({ queryKey: ['ppdb-document-settings'] })
    },
    onError: (error: any) => toast('error', error.message || 'Gagal mempublikasikan template LoA'),
  })

  const saveWaLink = useMutation({
    mutationFn: () => apiFetch('/ppdb/document-settings/whatsapp-link', {
      method: 'PUT', body: JSON.stringify({ whatsapp_group_link: waLink }),
    }),
    onSuccess: () => {
      toast('success', 'Link Grup WhatsApp tersimpan')
      queryClient.invalidateQueries({ queryKey: ['ppdb-document-settings'] })
    },
    onError: (error: any) => toast('error', error.message || 'Gagal menyimpan link grup'),
  })

  const uploadBackground = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return apiFetch<{ skd_background_url: string
  whatsapp_group_link?: string }>('/ppdb/document-settings/skd-background', {
        method: 'POST', body: form,
      })
    },
    onSuccess: (data) => {
      setBackgroundUrl(data.skd_background_url)
      toast('success', 'Background SKD diperbarui')
      queryClient.invalidateQueries({ queryKey: ['ppdb-document-settings'] })
    },
    onError: (error: any) => toast('error', error.message || 'Gagal mengunggah background SKD'),
  })

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Template LoA dan Latar SKD"
        description="Atur isi dasar LoA dan background yang dipakai untuk dokumen SKD. Preview LoA menampilkan klausul tetap sebelum template disimpan."
      />

      {settingsQuery.isError && (
        <Card><CardContent className="p-5 text-sm text-red-600">Pengaturan dokumen gagal dimuat. Coba muat ulang halaman.</CardContent></Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">Isi template LoA</h2></div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              Status: <strong>{settingsQuery.data?.loa_is_published ? 'Template aktif' : 'Belum ada template aktif'}</strong>
              {settingsQuery.data?.loa_published_at && <span className="ml-2 text-xs text-muted-foreground">Dipublikasikan {new Date(settingsQuery.data.loa_published_at).toLocaleString('id-ID')}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="loa-template">Teks LoA</Label>
              <Textarea
                id="loa-template"
                rows={13}
                maxLength={30000}
                value={template}
                onChange={event => setTemplate(event.target.value)}
                placeholder="Tulis isi dasar surat penerimaan di sini..."
                disabled={!canCrud || settingsQuery.isLoading || saveTemplate.isPending || publishTemplate.isPending}
              />
              <p className="text-xs text-muted-foreground">Maksimal 30.000 karakter. Klausul dana tidak dapat dikembalikan ditambahkan tetap pada preview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveTemplate.mutate()} disabled={!canCrud || settingsQuery.isLoading || saveTemplate.isPending || publishTemplate.isPending}>
                <Save className="mr-2 h-4 w-4" />{saveTemplate.isPending ? 'Menyimpan...' : 'Simpan Draft'}
              </Button>
              <Button variant="secondary" onClick={() => publishTemplate.mutate()} disabled={!canCrud || settingsQuery.isLoading || saveTemplate.isPending || publishTemplate.isPending || !template.trim() || template !== (settingsQuery.data?.loa_draft_template || settingsQuery.data?.loa_template)}>
                {publishTemplate.isPending ? 'Mempublikasikan...' : 'Publikasikan Template'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">Preview LoA</h2></div>
            <div className="min-h-72 whitespace-pre-wrap rounded-lg border bg-white p-6 text-sm leading-7">
              {template.trim() || <span className="text-muted-foreground">Isi template LoA akan tampil di sini.</span>}
              {template.trim() && <p className="mt-5 font-medium">{FIXED_LOA_CLAUSE}</p>}
            </div>
            <p className="text-xs text-muted-foreground">Preview ini mengikuti isi editor dan menambahkan klausul tetap di bagian akhir.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2"><ImageUp className="h-5 w-5 text-primary" /><h2 className="font-semibold">Background SKD</h2></div>
          <p className="text-sm text-muted-foreground">Unggah gambar JPG, PNG, WebP, atau GIF. Ukuran maksimal 10 MB.</p>
          {backgroundUrl && <img src={backgroundUrl} alt="Background SKD saat ini" className="max-h-[420px] max-w-full rounded-lg border object-contain" />}
          {!backgroundUrl && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada background SKD.</div>}
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="skd-background" className="sr-only">Unggah background SKD</Label>
            <input
              id="skd-background"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={!canCrud || uploadBackground.isPending}
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) uploadBackground.mutate(file)
                event.target.value = ''
              }}
              className="max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            />
            {uploadBackground.isPending && <span className="text-sm text-muted-foreground">Mengunggah...</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Link Grup WhatsApp</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tautan undangan grup WhatsApp yang akan ditampilkan ke pendaftar setelah mereka berhasil membayar Tahap 2 (DP).
          </p>
          <div className="space-y-2">
            <Label htmlFor="wa-link">Tautan Undangan</Label>
            <div className="flex items-center gap-2">
              <input
                id="wa-link"
                type="url"
                value={waLink}
                onChange={e => setWaLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                disabled={!canCrud || saveWaLink.isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button onClick={() => saveWaLink.mutate()} disabled={!canCrud || saveWaLink.isPending}>
                <Save className="mr-2 h-4 w-4" />{saveWaLink.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
