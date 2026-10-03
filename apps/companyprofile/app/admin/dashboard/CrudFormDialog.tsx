'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Upload, Link2, X } from 'lucide-react'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Label } from '@/app/components/ui/Label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/app/components/ui/Dialog'
import {
  TABS, FORM_FIELDS, CONTENT_FIELDS, HAS_CONTENT, SOCIAL_PRESETS, maxLengthFor,
} from './_constants'
import type { RowRecord, FormState } from './_types'
import { errorMessage } from './_types'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

export function CrudFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [galleryInputMode, setGalleryInputMode] = useState<'upload' | 'url'>('upload')
  const [galleryInputValue, setGalleryInputValue] = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)

  const tab = TABS.find((t) => t.key === activeTab)!

  function buildContent(): Record<string, unknown> {
    const fields = CONTENT_FIELDS[activeTab] || []
    const base: Record<string, unknown> =
      mode === 'edit' && editingItem && typeof editingItem.content === 'object' && editingItem.content !== null
        ? { ...(editingItem.content as Record<string, unknown>) }
        : {}
    const content: Record<string, unknown> = { ...base }
    for (const f of fields) {
      const raw = formData[`_c_${f.name}`] ?? ''
      if (f.type === 'list') {
        content[f.name] = String(raw).split('\n').map((s) => s.trim()).filter(Boolean)
      } else {
        content[f.name] = raw
      }
    }
    return content
  }

  async function handleSave() {
    // Penjaga anti-kehilangan-data: saat mode edit, `editingItem.content` wajib
    // ada. Kalau null, form ini kemungkinan diisi dari baris list yang `content`
    //‑nya sudah dilucuti backend — Menyimpan akan menimpa isi artikel & galeri
    // dengan string kosong. Better ditolak daripada dihapus.
    if (mode === 'edit' && HAS_CONTENT.includes(activeTab) && !editingItem?.content) {
      toast('error', 'Data artikel tidak lengkap dimuat. Tutup form dan buka kembali, atau muat ulang halaman.')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of FORM_FIELDS[activeTab] || []) {
        const val = formData[f.name]
        if (f.type === 'number') {
          if (val === '' || val === null || val === undefined) {
            toast('error', `${f.label} wajib diisi`)
            setSaving(false)
            return
          }
          payload[f.name] = Number(val)
        } else {
          payload[f.name] = val
        }
      }
      if (activeTab !== 'social') payload.image = formData.image || ''
      if (activeTab === 'news') payload.gallery = JSON.stringify(formData.gallery ?? [])
      if (HAS_CONTENT.includes(activeTab)) {
        payload.content = JSON.stringify(buildContent())
      }

      if (activeTab === 'contact') {
        await api.updateContactInfo(payload)
      } else if (mode === 'edit' && editingItem) {
        await api.updateItem(`${tab.endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(tab.endpoint, payload)
      }
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Berhasil dibuat' : 'Berhasil disimpan')
    } catch (e) {
      toast('error', errorMessage(e, 'Gagal menyimpan'))
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      setFormData({ ...formData, image: url })
      toast('success', 'Gambar berhasil diunggah')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setGalleryUploading(true)
    try {
      const url = await api.uploadImage(file)
      setFormData({ ...formData, gallery: [...(formData.gallery || []), url] })
      toast('success', 'Gambar berhasil diunggah')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setGalleryUploading(false)
    }
  }

  function addGalleryItem(url: string) {
    if (!url.trim()) return
    setFormData({ ...formData, gallery: [...(formData.gallery || []), url.trim()] })
    setGalleryInputValue('')
  }

  function removeGalleryItem(index: number) {
    const updated = [...(formData.gallery || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, gallery: updated })
  }

  const fields = FORM_FIELDS[activeTab] || []

  return (
    <Dialog open onOpenChange={(val) => { if (!val) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <tab.icon className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>
              {mode === 'create' ? 'Buat' : 'Edit'} {tab.label}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ── Informasi Utama ── */}
          {fields.length > 0 && (
            <section>
              <SectionHeader label="Informasi Utama" color="var(--accent)" />
              <div className="space-y-3.5">
                {fields.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    {activeTab === 'social' && f.name === 'path' ? (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {SOCIAL_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setFormData({ ...formData, [f.name]: preset.path })}
                              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${formData[f.name] === preset.path
                                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                }`}
                              title={preset.label}
                            >
                              <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                                <path d={preset.path} />
                              </svg>
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                                {preset.label}
                              </span>
                            </button>
                          ))}
                        </div>
                        {/* `path` is NOT NULL on the column, so a row saved
                            without one is rejected with a 422. A preset-only
                            picker made custom icons impossible and turned that
                            rejection into a dead end -- keep free text open. */}
                        <Textarea
                          value={String(formData[f.name] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          rows={3}
                          placeholder="M12 2c2.717 0 3.056..."
                        />
                      </div>
                    ) : f.type === 'textarea' ? (
                      <Textarea
                        value={String(formData[f.name] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        rows={4}
                        maxLength={10000}
                      />
                    ) : (
                      <Input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        maxLength={maxLengthFor(f.name)}
                        value={String(formData[f.name] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Gambar ── */}
          {activeTab !== 'social' && (
            <section>
              <SectionHeader label="Gambar" color="var(--accent-gold)" />
              <ModeToggle mode={imageMode} onMode={setImageMode} />

              {imageMode === 'upload' ? (
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all">
                  {uploading ? <SpinnerIcon /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengunggah...' : 'Pilih File'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <Input
                    type="url"
                    value={formData.image ?? ''}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}

              {formData.image && (
                <div className="mt-4 flex items-start gap-4 p-3 rounded-xl border border-[var(--border)] bg-white/60">
                  <Image
                    src={formData.image} alt="preview" width={80} height={56}
                    className="w-20 h-14 object-cover rounded-lg border border-[var(--border)] shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">URL Gambar</p>
                    <p className="text-xs text-[var(--text-secondary)] break-all">{formData.image}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                    aria-label="Hapus URL gambar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Galeri ── */}
          {activeTab === 'news' && (
            <section>
              <SectionHeader label="Galeri" color="var(--accent-gold)" />
              {(formData.gallery || []).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {(formData.gallery || []).map((url: string, idx: number) => (
                    <div key={idx} className="relative group rounded-xl border border-[var(--border)] bg-white/60 overflow-hidden">
                      <Image
                        src={url} alt={`gallery ${idx + 1}`} width={160} height={96}
                        className="w-full h-24 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <button
                        type="button" onClick={() => removeGalleryItem(idx)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/80 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Hapus gambar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ModeToggle mode={galleryInputMode} onMode={setGalleryInputMode} />
              {galleryInputMode === 'upload' ? (
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all">
                  {galleryUploading ? <SpinnerIcon /> : <Upload className="w-4 h-4" />}
                  {galleryUploading ? 'Mengunggah...' : 'Pilih File'}
                  <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" disabled={galleryUploading} />
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <Input
                    type="url" value={galleryInputValue}
                    onChange={(e) => setGalleryInputValue(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => addGalleryItem(galleryInputValue)}
                    disabled={!galleryInputValue.trim()}
                    className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Tambah galeri"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Detail Konten ── */}
          {HAS_CONTENT.includes(activeTab) && (
            <section>
              <SectionHeader label="Detail Konten" color="var(--accent)" />
              <div className="space-y-3.5">
                {(CONTENT_FIELDS[activeTab] || []).map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    {f.type === 'list' || f.type === 'textarea' ? (
                      <Textarea
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                        rows={f.type === 'textarea' ? 5 : 4}
                      />
                    ) : (
                      <Input
                        type="text"
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

function ModeToggle({
  mode, onMode,
}: { mode: 'upload' | 'url'; onMode: (m: 'upload' | 'url') => void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(['upload', 'url'] as const).map((m) => (
        <button
          key={m} type="button" onClick={() => onMode(m)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${mode === m
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
            }`}
        >
          {m === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          {m === 'upload' ? 'Upload' : 'URL'}
        </button>
      ))}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
