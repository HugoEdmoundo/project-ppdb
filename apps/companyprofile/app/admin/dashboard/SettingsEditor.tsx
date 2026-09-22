'use client'

import { useState } from 'react'
import Image from 'next/image'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/app/components/ui/Card'
import { Upload } from 'lucide-react'

const SETTING_FIELDS: {
  key: string
  label: string
  type: 'text' | 'url' | 'textarea' | 'email'
  description: string
  image?: boolean
}[] = [
  { key: 'site_description', label: 'Deskripsi Situs', type: 'textarea', description: 'Deskripsi singkat untuk SEO dan metadata.' },
  { key: 'logo', label: 'Logo', type: 'url', description: 'URL gambar logo untuk seluruh sistem.', image: true },
  { key: 'favicon', label: 'Favicon', type: 'url', description: 'URL gambar favicon (32x32 atau 16x16 px).', image: true },
  { key: 'to_email', label: 'Email Tujuan', type: 'email', description: 'Alamat email yang menerima pesan dari form kontak.' },
  { key: 'whatsapp_message', label: 'Pesan WhatsApp', type: 'textarea', description: 'Pesan default untuk tombol chat WhatsApp.' },
]

const DEFAULT_SETTING_VALUES: Record<string, string> = {
  site_description: 'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir.',
  to_email: 'ptdarrahmanm9@gmail.com',
  whatsapp_message: "Assalamu'alaikum, Saya ingin tahu lebih lanjut tentang Pesantren Ar-Rahman.",
}

interface Props {
  settings: api.SiteSetting[]
  canCrud: boolean
}

export function SettingsEditor({ settings, canCrud }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { ...DEFAULT_SETTING_VALUES }
    for (const s of settings) init[s.key] = s.value
    return init
  })
  const [saving, setSaving] = useState<string | null>(null)

  // Sync saat settings prop berubah (SSE refresh) — pola render-phase.
  const [prevSettings, setPrevSettings] = useState(settings)
  if (settings !== prevSettings) {
    setPrevSettings(settings)
    setValues((prev) => {
      const next = { ...prev }
      for (const s of settings) next[s.key] = s.value
      return next
    })
  }

  async function handleSave(key: string) {
    if (!canCrud) return
    const value = values[key] ?? ''
    if (key === 'favicon' || key === 'logo') {
      if (value && value.startsWith(api.API_BASE)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} tidak valid — gunakan URL gambar langsung, bukan URL API`)
        return
      }
      if (value && !/^https?:\/\//i.test(value)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} harus URL absolut (http/https)`)
        return
      }
    }
    setSaving(key)
    try {
      await api.updateSetting(key, value)
      toast('success', 'Pengaturan disimpan')
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(null)
    }
  }

  async function handleUpload(key: string) {
    if (!canCrud) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        let url = await api.uploadImage(file)
        if (url && !/^https?:\/\//i.test(url)) {
          url = `${api.API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
        }
        setValues((p) => ({ ...p, [key]: url }))
        await api.updateSetting(key, url)
        toast('success', `${SETTING_FIELDS.find((f) => f.key === key)?.label} berhasil diupload`)
      } catch {
        toast('error', 'Upload gagal')
      }
    }
    input.click()
  }

  return (
    <div className="grid gap-6">
      {SETTING_FIELDS.map((field) => (
        <Card key={field.key} className="bg-white/60 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{field.label}</CardTitle>
            <CardDescription>{field.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(field.image || field.type === 'url') && values[field.key] && (
              <div className="mb-2">
                <Image
                  src={values[field.key]}
                  alt={field.label}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg border object-cover"
                  unoptimized
                />
              </div>
            )}
            {field.type === 'textarea' ? (
              <Textarea
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                disabled={!canCrud}
                rows={3}
              />
            ) : (
              <Input
                type={field.type}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                disabled={!canCrud}
                placeholder={
                  field.type === 'url'
                    ? 'https://example.com/gambar.jpg'
                    : field.type === 'email'
                      ? 'email@example.com'
                      : ''
                }
              />
            )}
          </CardContent>

          {canCrud && (
            <CardFooter className="flex items-center gap-2 flex-wrap border-t pt-4">
              <Button onClick={() => handleSave(field.key)} disabled={saving === field.key}>
                {saving === field.key ? 'Menyimpan...' : 'Simpan'}
              </Button>
              {field.image && (
                <Button variant="outline" onClick={() => handleUpload(field.key)}>
                  <Upload className="w-4 h-4" /> Upload Gambar
                </Button>
              )}
              {values[field.key] && (
                <Button
                  variant="danger"
                  disabled={saving === field.key}
                  onClick={async () => {
                    setValues((p) => ({ ...p, [field.key]: '' }))
                    setSaving(field.key)
                    try {
                      await api.updateSetting(field.key, '')
                      toast('success', `${field.label} direset`)
                    } catch {
                      toast('error', 'Gagal mereset')
                    } finally {
                      setSaving(null)
                    }
                  }}
                >
                  Reset
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
}
