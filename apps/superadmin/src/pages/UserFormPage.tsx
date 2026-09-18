import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, UserRound, ShieldCheck, CheckCircle2 } from 'lucide-react'
import PageHero from '../components/PageHero'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from "../components/ui/confirmdialog"
import type { Role, Module } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Card, CardContent } from "@/components/ui"
import { Switch } from "@/components/ui"
import { Checkbox } from "@/components/ui"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui"
import { cn } from '@/lib/utils'
import { generateSecurePassword } from '../lib/password'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import * as z from 'zod'

const userFormSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  full_name: z.string().optional().or(z.literal('')),
  password: z.string().optional(),
  role_id: z.string().optional(),
  user_type: z.string().default('admin'),
  is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.user_type !== 'superadmin' && !data.role_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['role_id'],
      message: 'Role wajib diisi',
    })
  }
})

type UserFormValues = z.input<typeof userFormSchema>

export default function UserFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin' || !!currentUser?.is_superadmin
  const queryClient = useQueryClient()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    if (!authLoading && currentUser && !canCrud) {
      navigate('/users')
    }
  }, [currentUser, authLoading, canCrud, navigate])

  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [restrictedPages, setRestrictedPages] = useState<Record<string, string[]>>({})
  const [hasPageRestrictions, setHasPageRestrictions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue, control } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      full_name: '',
      password: '',
      role_id: '',
      user_type: 'admin',
      is_active: true,
    }
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const formUserType = watch('user_type')
  const formUsername = watch('username')
  const formIsActive = watch('is_active')

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
          reset({
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
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
  }, [id, isEdit, navigate, reset])

  function generatePassword() {
    setValue('password', generateSecurePassword(8), { shouldValidate: true })
  }

  const onSubmit = (data: UserFormValues) => {
    if (!isEdit && !data.password) {
      toast('error', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }

    if (!isEdit) {
      // Create: selalu konfirmasi karena kredensial akan dikirim
      setConfirmData({
        title: 'Konfirmasi Buat User',
        message: `Sistem akan otomatis mengirimkan kredensial login ke:\n\n📱 WhatsApp: ${data.phone || 'Tidak diisi'}\n📧 Email: ${data.email || 'Tidak diisi'}\n\nUsername: ${data.username}\nPassword: [akan di-generate sistem]\n\nPastikan nomor WA dan email sudah benar sebelum melanjutkan.`,
        onConfirm: () => {
          setConfirmOpen(false)
          executeSubmit(data)
        },
      })
      setConfirmOpen(true)
    } else if (data.password) {
      // Edit dengan password baru
      setConfirmData({
        title: 'Konfirmasi Ganti Password',
        message: `Password baru akan dikirim ke:\n\n📱 WhatsApp: ${data.phone || 'Tidak diisi'}\n📧 Email: ${data.email || 'Tidak diisi'}\n\nYakin ingin mengganti password user ini?`,
        onConfirm: () => {
          setConfirmOpen(false)
          executeSubmit(data)
        },
      })
      setConfirmOpen(true)
    } else {
      executeSubmit(data)
    }
  }

  async function executeSubmit(data: UserFormValues) {
    setLoading(true)
    try {
      if (isEdit && id) {
        const payload: any = {
          username: data.username,
          email: data.email || undefined,
          phone: data.phone || undefined,
          full_name: data.full_name || undefined,
          role_id: data.role_id || undefined,
          user_type: data.user_type,
          is_active: data.is_active,
        }
        if (data.password) payload.password = data.password
        await api.updateUser(id, payload)

        if (hasPageRestrictions) {
          const allPageIds = Object.values(restrictedPages).flat()
          await api.updateUserPagePermissions(id, allPageIds)
        } else {
          await api.updateUserPagePermissions(id, [])
        }
      } else {
        await api.createUser({
          username: data.username,
          email: data.email || undefined,
          phone: data.phone || undefined,
          full_name: data.full_name || undefined,
          password: data.password!,
          role_id: data.role_id || undefined,
          user_type: data.user_type,
        })
      }
      toast('success', isEdit ? 'User berhasil diperbarui' : 'User berhasil dibuat')
      queryClient.invalidateQueries({ queryKey: ['users'] })
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
    <>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmData?.onConfirm()}
        title={confirmData?.title || 'Konfirmasi'}
        message={confirmData?.message || ''}
        confirmLabel="Sudah Benar, Simpan"
      />
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Manajemen Akses"
        title={isEdit ? 'Edit User' : 'Buat User Baru'}
        description={isEdit ? 'Ubah informasi user' : 'Tambah admin baru ke sistem'}
        loading={fetching}
        chips={[
          { icon: UserRound, label: formUsername || 'Username baru' },
          { icon: ShieldCheck, label: formUserType === 'superadmin' ? 'Superadmin' : `Tipe: ${formUserType}` },
          { icon: CheckCircle2, label: formIsActive ? 'Aktif' : 'Nonaktif' },
        ]}
        actions={
          <button
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-foreground">Username *</Label>
              <Input
                id="username"
                type="text"
                {...register('username')}
                placeholder="Masukkan username"
                disabled={formUserType === 'superadmin'}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              <p className="text-[11px] text-muted-foreground">
                Notifikasi kredensial akan dikirim ke alamat ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-foreground">Nomor WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="6281234567890"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              <p className="text-[11px] text-muted-foreground">
                Notifikasi kredensial akan dikirim ke nomor ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                {...register('full_name')}
                placeholder="Nama lengkap"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password {isEdit ? '(kosongkan jika tidak ingin mengubah)' : '*'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  {...register('password')}
                  placeholder={isEdit ? '••••••••' : 'Klik Generate untuk membuat password'}
                  readOnly
                  className="select-none"
                  onKeyDown={(e) => e.preventDefault()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  title="Generate Password (dibuat otomatis oleh sistem)"
                >
                  <KeyRound className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Password dibuat otomatis oleh sistem — tidak bisa diisi manual.
              </p>
              {!isEdit && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <span className="mt-0.5 text-base leading-none">📱</span>
                  <span>Setelah user dibuat, kredensial login (username & password) akan otomatis dikirim ke <strong>WhatsApp</strong> dan <strong>Email</strong> yang terdaftar.</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Role</Label>
              <Controller
                control={control}
                name="role_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={formUserType === 'superadmin'}
                  >
                    <SelectTrigger className={cn(!field.value && 'text-muted-foreground', errors.role_id && 'border-destructive')}>
                      <SelectValue placeholder="Pilih role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(r => !r.is_superadmin && !r.is_system).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="status" className="text-xs font-semibold text-foreground">Status</Label>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="status"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={formUserType === 'superadmin'}
                  />
                )}
              />
              <span className="text-xs text-muted-foreground">{watch('is_active') ? 'Active' : 'Inactive'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Page Permissions Section - only on edit */}
        {isEdit && formUserType !== 'superadmin' && (
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:grid-cols-3">
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
    </>
  )
}
