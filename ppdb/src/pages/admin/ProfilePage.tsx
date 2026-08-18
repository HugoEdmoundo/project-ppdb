import { useState } from 'react'
import {
  ArrowLeft,
  AtSign,
  BadgeCheck,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  User as UserIcon,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'
import { useToast } from '../../components/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AvatarEditor } from '../../components/profile/AvatarEditor'
import { SectionCard } from '../../components/profile/SectionCard'
import { cn } from '@/lib/utils'

function FieldLabel({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </Label>
  )
}

export default function AdminProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || '',
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [saving, setSaving] = useState(false)

  const isSuper = user?.user_type === 'superadmin' || user?.is_superadmin
  const initials = (user?.full_name || user?.username || 'A')[0]?.toUpperCase()
  const roleLabel = isSuper ? 'SUPERADMIN' : (user?.role_name || user?.user_type || 'ADMIN').toUpperCase()

  function handleChange(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleAvatarUploaded(file: File): Promise<string> {
    const res = await authService.uploadAvatar(file)
    return res.url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.new_password && form.new_password !== form.confirm_password) {
      toast('error', 'Konfirmasi password baru tidak cocok.')
      return
    }

    const payload: Record<string, string> = {}
    if (form.username !== user?.username) payload.username = form.username
    if (form.full_name !== user?.full_name) payload.full_name = form.full_name
    if (isSuper && form.email !== user?.email) payload.email = form.email
    if (form.avatar_url !== user?.avatar_url) payload.avatar_url = form.avatar_url
    if (form.new_password) {
      if (!form.old_password) {
        toast('error', 'Password lama wajib diisi untuk mengganti password.')
        return
      }
      payload.old_password = form.old_password
      payload.new_password = form.new_password
    }

    if (Object.keys(payload).length === 0) {
      toast('warning', 'Tidak ada perubahan untuk disimpan.')
      return
    }

    setSaving(true)
    try {
      await authService.updateProfile(payload)
      await refreshUser()
      setForm((f) => ({ ...f, old_password: '', new_password: '', confirm_password: '' }))
      toast('success', 'Profile berhasil diperbarui.')
    } catch (err: any) {
      toast('error', err.message || 'Gagal menyimpan profile.')
    } finally {
      setSaving(false)
    }
  }

  const metaRows = [
    { icon: UserRound, label: 'Username', value: form.username || '—' },
    { icon: Mail, label: 'Email', value: form.email || '—' },
    {
      icon: BadgeCheck,
      label: 'Status',
      value: user?.is_active === false ? 'Inactive' : 'Active',
      valueClass: user?.is_active === false ? 'text-rose-danger' : 'text-emerald-primary',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="rounded-xl">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola informasi dan keamanan akun Anda</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Identity card ── */}
        <aside className="space-y-6">
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="px-5 pt-6 pb-5">
              <div className="flex justify-center">
                <AvatarEditor
                  value={form.avatar_url}
                  initials={initials}
                  alt={user?.full_name || user?.username}
                  onUpload={handleAvatarUploaded}
                  onUrlApplied={(url) => handleChange('avatar_url', url)}
                />
              </div>

              <div className="mt-4 text-center">
                <h2 className="truncate font-heading text-lg font-bold text-foreground">
                  {form.full_name || form.username || '—'}
                </h2>
                <p className="truncate text-xs text-muted-foreground">@{form.username}</p>
                <Badge
                  variant={isSuper ? 'default' : 'gold'}
                  className={cn('mt-2.5', isSuper && 'gap-1')}
                >
                  {isSuper && <ShieldCheck className="h-3 w-3" />}
                  {roleLabel}
                </Badge>
              </div>

              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {metaRows.map((row) => {
                  const Icon = row.icon
                  return (
                    <div key={row.label} className="flex items-start gap-2.5 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {row.label}
                        </p>
                        <p className={cn('truncate font-medium text-foreground', row.valueClass)}>{row.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* ── Form sections ── */}
        <div className="space-y-6">
          <SectionCard
            title="Informasi Profile"
            description="Data dasar akun Anda yang tampil di sistem."
            icon={UserIcon}
            accent="bg-primary"
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel icon={AtSign}>Username</FieldLabel>
                  <Input
                    value={form.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="Masukkan username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={UserRound}>Full Name</FieldLabel>
                  <Input
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel icon={Mail}>Email</FieldLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                  disabled={!isSuper}
                />
                {isSuper ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Email dapat diubah — Anda memiliki akses Superadmin.
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Email hanya dapat diubah oleh Superadmin. Hubungi admin bila perlu mengubahnya.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Ganti Password"
            description="Gunakan minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, dan angka."
            icon={KeyRound}
            accent="bg-gold-accent"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <FieldLabel icon={KeyRound}>Password Lama</FieldLabel>
                <Input
                  type="password"
                  value={form.old_password}
                  onChange={(e) => handleChange('old_password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel icon={KeyRound}>Password Baru</FieldLabel>
                  <Input
                    type="password"
                    value={form.new_password}
                    onChange={(e) => handleChange('new_password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={KeyRound}>Konfirmasi Password Baru</FieldLabel>
                  <Input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
