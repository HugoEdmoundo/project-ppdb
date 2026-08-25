'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Upload, Link2 } from 'lucide-react'
import { getMe, updateProfile, uploadImage } from '@/app/lib/api'
import { toast } from './ui/AdminToast'
import { useFocusTrap } from '@/app/hooks/useFocusTrap'

const ALLOWED_AVATAR_DOMAINS = [
  'dkynlzmpwndadmbqokry.supabase.co',
  'supabase.co',
  'res.cloudinary.com',
  'images.unsplash.com',
]

function isValidAvatarUrl(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_AVATAR_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

interface Props {
  open: boolean
  onClose: () => void
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/Dialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'

export default function ProfileModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isSuper, setIsSuper] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [form, setForm] = useState({ username: '', email: '', full_name: '', avatar_url: '', old_password: '', new_password: '', confirm_password: '' })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getMe()
      .then(u => {
        if (cancelled) return
        setForm(prev => ({ ...prev, username: u.username, email: u.email, full_name: u.full_name, avatar_url: u.avatar_url }))
        setIsSuper(u.user_type === 'superadmin')
      })
      .catch(() => { if (!cancelled) toast('error', 'Gagal memuat profil') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Terjadi kesalahan'
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(p => ({ ...p, avatar_url: url }))
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.username.trim() || !form.full_name.trim()) {
      toast('error', 'Username dan Nama Lengkap harus diisi'); return
    }
    if (form.new_password && form.new_password !== form.confirm_password) {
      toast('error', 'Password baru tidak cocok'); return
    }
    setSaving(true)
    try {
      const data: Record<string, string> = {}
      if (form.username) data.username = form.username
      if (form.email) data.email = form.email
      if (form.full_name) data.full_name = form.full_name
      if (form.avatar_url) data.avatar_url = form.avatar_url
      if (form.old_password && form.new_password) {
        data.old_password = form.old_password
        data.new_password = form.new_password
      }
      await updateProfile(data)
      try {
        const me = await getMe()
        localStorage.setItem('admin_user', JSON.stringify(me))
      } catch {
        toast('error', 'Gagal memuat ulang profil')
      }
      toast('success', 'Profil berhasil disimpan')
      onClose()
    } catch (e) {
      toast('error', errorMessage(e))
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Admin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                  {form.avatar_url && isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary-foreground">{form.full_name?.charAt(0).toUpperCase() || form.email?.charAt(0).toUpperCase() || '?'}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant={imageMode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('upload')}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
                <Button type="button" variant={imageMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('url')}>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" /> URL
                </Button>
              </div>

              {imageMode === 'upload' ? (
                <div className="flex items-center gap-3">
                  <Label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-all">
                    {uploading ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Mengunggah...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Pilih File</>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input type="url" maxLength={2048} value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                    placeholder="https://example.com/avatar.jpg" />
                </div>
              )}

              {form.avatar_url && (
                <div className="flex items-start gap-4 p-3 rounded-xl border border-border bg-accent/30">
                  {isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="preview" width={80} height={56} className="w-20 h-14 object-cover rounded-lg border border-border shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-20 h-14 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-red-500 font-medium">Invalid</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">URL Avatar</p>
                    <p className="text-xs text-muted-foreground break-all">{form.avatar_url}</p>
                  </div>
                  <button type="button" onClick={() => setForm(p => ({ ...p, avatar_url: '' }))}
                    className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all shrink-0" aria-label="Hapus URL avatar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <hr className="border-border" />

              <div className="space-y-1.5">
                <Label>Username <span className="text-red-500">*</span></Label>
                <Input type="text" maxLength={100} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input type="text" maxLength={255} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email {!isSuper && <span className="font-normal text-muted-foreground">(hanya superadmin)</span>}</Label>
                <Input type="email" maxLength={255} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} readOnly={!isSuper}
                  className={isSuper ? '' : 'text-muted-foreground bg-accent/50'} />
              </div>

              <hr className="border-border" />

              <p className="text-xs font-semibold text-muted-foreground">Ganti Password (opsional)</p>
              <div className="space-y-1.5">
                <Label>Password Lama</Label>
                <Input type="password" maxLength={128} value={form.old_password} onChange={e => setForm(p => ({ ...p, old_password: e.target.value }))} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label>Password Baru</Label>
                <Input type="password" maxLength={128} value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label>Konfirmasi Password Baru</Label>
                <Input type="password" maxLength={128} value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))} autoComplete="new-password" />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || loading || !form.username.trim() || !form.full_name.trim()}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

