'use client'

import { useState } from 'react'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Label } from '@/app/components/ui/Label'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/app/components/ui/Card'
import type { RowRecord } from './_types'
import { errorMessage } from './_types'

interface Props {
  contactInfo: RowRecord | undefined
  canCrud: boolean
  onSave: () => void
}

const CONTACT_FIELDS = [
  { key: 'phone_primary', label: 'Telepon Utama', type: 'text' },
  { key: 'phone_secondary', label: 'Telepon Kedua', type: 'text' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { key: 'email_primary', label: 'Email Utama', type: 'text' },
  { key: 'email_admission', label: 'Email Penerimaan (PPDB)', type: 'text' },
  { key: 'office_hours', label: 'Jam Operasional Kantor', type: 'text' },
  { key: 'address', label: 'Alamat Lengkap', type: 'textarea' },
] as const

export function ContactEditor({ contactInfo, canCrud, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => ({
    phone_primary: contactInfo?.phone_primary || '',
    phone_secondary: contactInfo?.phone_secondary || '',
    whatsapp: contactInfo?.whatsapp || '',
    email_primary: contactInfo?.email_primary || '',
    email_admission: contactInfo?.email_admission || '',
    address: contactInfo?.address || '',
    office_hours: contactInfo?.office_hours || '',
  }))
  const [saving, setSaving] = useState(false)

  // Sync saat contactInfo prop berubah (SSE refresh) — pola render-phase.
  const [prevContact, setPrevContact] = useState(contactInfo)
  if (contactInfo !== prevContact) {
    setPrevContact(contactInfo)
    setForm({
      phone_primary: contactInfo?.phone_primary || '',
      phone_secondary: contactInfo?.phone_secondary || '',
      whatsapp: contactInfo?.whatsapp || '',
      email_primary: contactInfo?.email_primary || '',
      email_admission: contactInfo?.email_admission || '',
      address: contactInfo?.address || '',
      office_hours: contactInfo?.office_hours || '',
    })
  }

  async function handleSave() {
    if (!canCrud) return
    setSaving(true)
    try {
      await api.updateContactInfo(form as Record<string, unknown>)
      toast('success', 'Info kontak berhasil disimpan')
      onSave()
    } catch (e) {
      toast('error', errorMessage(e, 'Gagal menyimpan'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="bg-white/60 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Edit Info Kontak</CardTitle>
          <CardDescription>
            Ubah alamat, nomor telepon, email, dan jam operasional pesantren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {CONTACT_FIELDS.map((f) => (
              <div
                key={f.key}
                className={f.type === 'textarea' ? 'sm:col-span-2 space-y-2' : 'space-y-2'}
              >
                <Label>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    value={form[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    disabled={!canCrud}
                    rows={3}
                  />
                ) : (
                  <Input
                    type={['phone_primary', 'phone_secondary', 'whatsapp'].includes(f.key) ? 'tel' : 'text'}
                    inputMode={['phone_primary', 'phone_secondary', 'whatsapp'].includes(f.key) ? 'numeric' : undefined}
                    value={form[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    disabled={!canCrud}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
        {canCrud && (
          <CardFooter className="justify-end border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
