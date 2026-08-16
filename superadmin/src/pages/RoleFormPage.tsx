import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ACCESS_LEVELS } from '../types'
import type { AccessLevel } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { cn } from '@/lib/utils'

export default function RoleFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin'

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

  function setPermission(module: string, level: AccessLevel) {
    setPermissions(prev => ({ ...prev, [module]: level }))
  }

  function removePermission(module: string) {
    setPermissions(prev => {
      const next = { ...prev }
      delete next[module]
      return next
    })
  }

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/roles')}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? (form.is_system ? 'Detail Role Sistem' : 'Edit Role') : 'Buat Role Baru'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? (form.is_system ? 'Melihat informasi role sistem' : 'Ubah informasi dan hak akses role') : 'Buat role baru dengan hak akses yang ditentukan'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
                    { id: 'companyprofile', label: 'Company Profile', keys: ['companyprofile'] },
                    { id: 'ppdb', label: 'PPDB (Dashboard, Periode)', keys: ['ppdb'] }
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
