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

  const trapRef = useFocusTrap(open, onClose)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        className="modal-content bg-white/85 backdrop-blur-xl border border-white/40 rounded-2xl max-sm:rounded-none shadow-xl w-full max-w-md max-h-[90vh] max-sm:h-full max-sm:w-full overflow-y-auto"
        style={{ animation: 'modalIn 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[var(--border)] rounded-t-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
          <div className="flex items-center justify-between px-6 md:px-8 py-4">
            <h2 className="font-semibold text-base text-[var(--text)]">Profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Memuat...</p>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center overflow-hidden ring-2 ring-[var(--accent-subtle)]">
                  {form.avatar_url && isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">{form.full_name?.charAt(0).toUpperCase() || form.email?.charAt(0).toUpperCase() || '?'}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    imageMode === 'upload' ? 'bg-[var(--accent)] text-white shadow-sm' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                  }`}>
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
                <button type="button" onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    imageMode === 'url' ? 'bg-[var(--accent)] text-white shadow-sm' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                  }`}>
                  <Link2 className="w-3.5 h-3.5" /> URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all">
                    {uploading ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Mengunggah...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Pilih File</>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <input type="url" maxLength={2048} value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
                </div>
              )}

              {form.avatar_url && (
                <div className="flex items-start gap-4 p-3 rounded-xl border border-[var(--border)] bg-white/60">
                  {isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="preview" width={80} height={56} className="w-20 h-14 object-cover rounded-lg border border-[var(--border)] shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-20 h-14 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-red-500 font-medium">Invalid</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">URL Avatar</p>
                    <p className="text-xs text-[var(--text-secondary)] break-all">{form.avatar_url}</p>
                  </div>
                  <button type="button" onClick={() => setForm(p => ({ ...p, avatar_url: '' }))}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all shrink-0" aria-label="Hapus URL avatar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <hr className="border-[var(--border)]" />

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Username <span className="text-red-500">*</span></label>
                <input type="text" maxLength={100} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                <input type="text" maxLength={255} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email {!isSuper && <span className="font-normal text-[var(--text-muted)]">(hanya superadmin)</span>}</label>
                <input type="email" maxLength={255} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} readOnly={!isSuper}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm outline-none transition-all ${
                    isSuper ? 'border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]' : 'border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                  }`} />
              </div>

              <hr className="border-[var(--border)]" />

              <p className="text-xs font-semibold text-[var(--text-secondary)]">Ganti Password (opsional)</p>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password Lama</label>
                <input type="password" maxLength={128} value={form.old_password} onChange={e => setForm(p => ({ ...p, old_password: e.target.value }))}
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password Baru</label>
                <input type="password" maxLength={128} value={form.new_password} onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Konfirmasi Password Baru</label>
                <input type="password" maxLength={128} value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all" />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-[var(--border)] rounded-b-2xl px-6 md:px-8 py-4">
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all active:scale-[0.98]">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving || loading || !form.username.trim() || !form.full_name.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 shadow-md transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
