import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import type { Role, Module } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { Switch } from '../components/ui/switch'
import { Checkbox } from '../components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'
import { cn } from '@/lib/utils'

export default function UserFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin'

  useEffect(() => {
    if (!authLoading && currentUser && !canCrud) {
      navigate('/users')
    }
  }, [currentUser, authLoading, canCrud, navigate])

  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [restrictedPages, setRestrictedPages] = useState<Record<string, string[]>>({})
  const [hasPageRestrictions, setHasPageRestrictions] = useState(false)
  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_id: '',
    user_type: 'admin',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  useEffect(() => {
    let active = true
    async function fetchData() {
      try {
        const [rolesData, modulesData] = await Promise.all([
          api.getRoles(),
          api.getModules(),
        ])
        if (!active) return
        setRoles(rolesData)
        setModules(modulesData)

        if (isEdit && id) {
          const [user, perms] = await Promise.all([
            api.getUser(id),
            api.getUserPagePermissions(id),
          ])
          if (!active) return
          setForm({
            username: user.username || '',
            email: user.email || '',
            full_name: user.full_name || '',
            password: '',
            role_id: user.role_id || '',
            user_type: user.user_type || 'admin',
            is_active: user.is_active ?? true,
          })
          if (perms.page_ids.length > 0) {
            setHasPageRestrictions(true)
            const byModule: Record<string, string[]> = {}
            for (const pid of perms.page_ids) {
              for (const mod of modulesData) {
                const page = mod.pages.find(p => p.id === pid)
                if (page) {
                  if (!byModule[mod.key]) byModule[mod.key] = []
                  byModule[mod.key].push(pid)
                  break
                }
              }
            }
            setRestrictedPages(byModule)
          }
        }
      } catch {
        if (active && isEdit) navigate('/users')
      } finally {
        if (active) setFetching(false)
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [id, isEdit, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit && id) {
        const payload: any = {
          username: form.username,
          email: form.email || undefined,
          full_name: form.full_name || undefined,
          role_id: form.role_id || undefined,
          user_type: form.user_type,
          is_active: form.is_active,
        }
        if (form.password) payload.password = form.password
        await api.updateUser(id, payload)

        if (hasPageRestrictions) {
          const allPageIds = Object.values(restrictedPages).flat()
          await api.updateUserPagePermissions(id, allPageIds)
        } else {
          await api.updateUserPagePermissions(id, [])
        }
      } else {
        if (!form.password) throw new Error('Password wajib diisi')
        await api.createUser({
          username: form.username,
          email: form.email || undefined,
          full_name: form.full_name || undefined,
          password: form.password,
          role_id: form.role_id || undefined,
          user_type: form.user_type,
        })
      }
      toast('success', isEdit ? 'User berhasil diperbarui' : 'User berhasil dibuat')
      navigate('/users')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  function togglePageRestriction(moduleKey: string, pageId: string) {
    setRestrictedPages(prev => {
      const current = prev[moduleKey] || []
      if (current.includes(pageId)) {
        const next = current.filter(id => id !== pageId)
        const copy = { ...prev }
        if (next.length === 0) delete copy[moduleKey]
        else copy[moduleKey] = next
        return copy
      } else {
        return { ...prev, [moduleKey]: [...current, pageId] }
      }
    })
  }

  function isPageChecked(moduleKey: string, pageId: string): boolean {
    return (restrictedPages[moduleKey] || []).includes(pageId)
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? 'Edit User' : 'Buat User Baru'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? 'Ubah informasi user' : 'Tambah admin baru ke sistem'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-foreground">Username *</Label>
              <Input
                id="username"
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Masukkan username"
                required
                disabled={form.user_type === 'superadmin'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password {isEdit ? '(kosongkan jika tidak ingin mengubah)' : '*'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? '••••••••' : 'Masukkan atau generate password'}
                  required={!isEdit}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                    let pass = ''
                    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
                    setForm(prev => ({ ...prev, password: pass }))
                  }}
                  title="Generate Password"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Role</Label>
              <Select
                value={form.role_id || undefined}
                onValueChange={(v) => setForm({ ...form, role_id: v })}
                disabled={form.user_type === 'superadmin'}
              >
                <SelectTrigger className={cn(!form.role_id && 'text-muted-foreground')}>
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => !r.is_superadmin).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="status" className="text-xs font-semibold text-foreground">Status</Label>
              <Switch
                id="status"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                disabled={form.user_type === 'superadmin'}
              />
              <span className="text-xs text-muted-foreground">{form.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Page Permissions Section - only on edit */}
        {isEdit && form.user_type !== 'superadmin' && (
          <Card>
            <CardContent className="space-y-4 p-6 md:p-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-warning" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pengecualian / Pembatasan Halaman (Opsional)
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Secara bawaan, user ini bisa mengakses semua halaman sesuai dengan rolenya. Jika Anda ingin membatasinya hanya ke beberapa halaman tertentu saja (mengecualikan halaman lain), centang opsi di bawah ini.
              </p>

              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={hasPageRestrictions}
                  onCheckedChange={(checked) => {
                    setHasPageRestrictions(Boolean(checked))
                    if (!checked) setRestrictedPages({})
                  }}
                />
                <span className="text-sm font-medium text-foreground">Saya ingin membatasi akses halaman user ini</span>
              </label>

              {hasPageRestrictions && (
                <div className="space-y-4 border-l-2 border-warning/30 pl-4">
                  <p className="text-xs font-medium text-warning">
                    Pilih halaman spesifik yang BOLEH diakses oleh user ini:
                  </p>
                  {modules.map(mod => (
                    <div key={mod.id}>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">{mod.name}</h4>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {mod.pages.map(page => (
                          <label
                            key={page.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                          >
                            <Checkbox
                              checked={isPageChecked(mod.key, page.id)}
                              onCheckedChange={() => togglePageRestriction(mod.key, page.id)}
                            />
                            <span className="text-muted-foreground">{page.label}</span>
                          </label>
                        ))}
                      </div>
                      {restrictedPages[mod.key]?.length > 0 && (
                        <p className="mt-1 text-[11px] text-warning">
                          {restrictedPages[mod.key].length} dari {mod.pages.length} halaman dipilih
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
          >
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat User'}
          </Button>
        </div>
      </form>
    </div>
  )
}
