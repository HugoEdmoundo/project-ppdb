import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shield, ShieldCheck, Lock } from 'lucide-react'
import PageHero from '../components/PageHero'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ACCESS_LEVELS } from '../types'
import type { AccessLevel } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Card, CardContent } from "@/components/ui"

export default function RoleFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin' || !!currentUser?.is_superadmin
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!authLoading && currentUser && !canCrud) {
      navigate('/roles')
    }
  }, [currentUser, authLoading, canCrud, navigate])

  const [form, setForm] = useState({
    name: '',
    description: '',
    is_superadmin: false,
    is_system: false,
  })
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    let active = true
    if (isEdit && id) {
      api.getRole(id).then(role => {
        if (active) {
          setForm({
            name: role.name || '',
            description: role.description || '',
            is_superadmin: role.is_superadmin ?? false,
            is_system: role.is_system ?? false,
          })
          const perms: Record<string, AccessLevel> = {}
          for (const [mod, level] of Object.entries(role.permissions || {})) {
            perms[mod] = level as AccessLevel
          }
          setPermissions(perms)
        }
      }).catch(() => {
        if (active) navigate('/roles')
      }).finally(() => {
        if (active) setFetching(false)
      })
    }
    return () => {
      active = false
    }
  }, [id, isEdit, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        name: form.name,
        description: form.description || undefined,
        is_superadmin: form.is_superadmin,
        permissions,
      }
      if (isEdit && id) {
        await api.updateRole(id, payload)
      } else {
        await api.createRole(payload)
      }
      toast('success', isEdit ? 'Role berhasil diperbarui' : 'Role berhasil dibuat')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      navigate('/roles')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Manajemen Akses"
        title={isEdit ? (form.is_system ? 'Detail Role Sistem' : 'Edit Role') : 'Buat Role Baru'}
        description={isEdit ? (form.is_system ? 'Melihat informasi role sistem' : 'Ubah informasi dan hak akses role') : 'Buat role baru dengan hak akses yang ditentukan'}
        loading={fetching}
        chips={[
          { icon: ShieldCheck, label: form.name || 'Role baru' },
          ...(form.is_superadmin
            ? [{ icon: Lock, label: 'Akses Penuh Superadmin' }]
            : form.is_system
              ? [{ icon: Lock, label: 'Role Sistem Terkunci' }]
              : [{ icon: Shield, label: `${Object.keys(permissions).length} Modul Diatur` }]),
        ]}
        actions={
          <button
            onClick={() => navigate('/roles')}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        {form.is_superadmin && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Role ini dilindungi</p>
              <p className="text-[13px]">Role superadmin memiliki akses penuh ke semua module dan tidak dapat diubah atau dihapus melalui form ini.</p>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informasi Role</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">Nama Role *</Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Editor, Viewer, dll."
                required
                disabled={form.is_superadmin || form.is_system}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold text-foreground">Deskripsi</Label>
              <Input
                id="description"
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat tentang role ini"
                disabled={form.is_superadmin || form.is_system}
              />
            </div>
          </CardContent>
        </Card>

        {/* Permission Editor */}
        <Card className="mt-4">
          <CardContent className="space-y-4 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-warning" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Module Permissions</span>
            </div>

            {form.is_superadmin ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-sm font-medium text-purple-700">
                  ✨ Role ini adalah Superadmin — memiliki akses penuh ke semua module tanpa perlu pengaturan permissions.
                </p>
              </div>
            ) : form.is_system ? (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-700">
                  🔒 Role ini adalah role sistem. Aksesnya diatur otomatis dan tidak bisa diubah melalui form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const DISPLAY_MODULES = [
                    { id: 'ppdb', label: 'PPDB (Pendaftar, Pembayaran, Seleksi, Notifikasi, Dashboard)', keys: ['ppdb'] },
                    { id: 'companyprofile', label: 'Company Profile (Konten Website)', keys: ['companyprofile'] },
                  ]

                  return DISPLAY_MODULES.map(({ id, label, keys }) => {
                    // Anggap level access dari module adalah level dari key pertama
                    const currentLevel = permissions[keys[0]] || 'none'
                    return (
                      <div key={id} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          {currentLevel !== 'none' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto px-2 py-0.5 text-[11px] font-normal text-destructive hover:text-destructive"
                              onClick={() => {
                                setPermissions(prev => {
                                  const next = { ...prev }
                                  keys.forEach(k => delete next[k])
                                  return next
                                })
                              }}
                            >
                              Reset ke None
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ACCESS_LEVELS.map(level => (
                            <Button
                              key={level.value}
                              type="button"
                              size="sm"
                              variant={currentLevel === level.value ? 'default' : 'outline'}
                              onClick={() => {
                                setPermissions(prev => {
                                  const next = { ...prev }
                                  keys.forEach(k => { next[k] = level.value as AccessLevel })
                                  return next
                                })
                              }}
                              title={level.description}
                            >
                              {level.label}
                            </Button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {ACCESS_LEVELS.find(l => l.value === currentLevel)?.description}
                        </p>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/roles')}
          >
            {form.is_system ? 'Kembali' : 'Batal'}
          </Button>
          {!form.is_system && (
            <Button type="submit" disabled={loading || form.is_superadmin}>
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Role'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
