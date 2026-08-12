import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    username: user?.username || '',
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (form.new_password && form.new_password !== form.confirm_password) {
      setMessage({ type: 'error', text: 'Password baru tidak cocok' })
      return
    }

    setSaving(true)
    try {
      const payload: any = {}
      if (form.username !== user?.username) payload.username = form.username
      if (form.full_name !== user?.full_name) payload.full_name = form.full_name
      if (form.avatar_url !== user?.avatar_url) payload.avatar_url = form.avatar_url
      if (form.new_password) {
        if (!form.old_password) {
          setMessage({ type: 'error', text: 'Password lama wajib diisi' })
          setSaving(false)
          return
        }
        payload.old_password = form.old_password
        payload.new_password = form.new_password
      }

      if (Object.keys(payload).length === 0) {
        setMessage({ type: 'error', text: 'Tidak ada perubahan' })
        setSaving(false)
        return
      }

      await api.updateProfile(payload)
      await refreshUser()
      setForm(f => ({ ...f, old_password: '', new_password: '', confirm_password: '' }))
      setMessage({ type: 'success', text: 'Profile berhasil diperbarui' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.full_name || user?.username || 'S')[0]?.toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola informasi profile Anda</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            {/* Avatar */}
            <div className="mb-4 flex items-center gap-4">
              <Avatar className="h-16 w-16 text-2xl">
                <AvatarImage src={user?.avatar_url || undefined} alt={initials} />
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.full_name || user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Badge className="mt-1 bg-purple-100 text-purple-700 hover:bg-purple-100">SUPERADMIN</Badge>
              </div>
            </div>

            {message && (
              <div
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-xs font-medium',
                  message.type === 'success'
                    ? 'border-success/20 bg-success/10 text-success'
                    : 'border-destructive/20 bg-destructive/10 text-destructive'
                )}
              >
                {message.text}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informasi Profile</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url" className="text-xs font-semibold text-foreground">Avatar URL</Label>
              <Input
                id="avatar_url"
                type="url"
                value={form.avatar_url}
                onChange={e => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Password Section */}
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-warning" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ganti Password</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="old_password" className="text-xs font-semibold text-foreground">Password Lama</Label>
                  <Input
                    id="old_password"
                    type="password"
                    value={form.old_password}
                    onChange={e => setForm({ ...form, old_password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-xs font-semibold text-foreground">Password Baru</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={form.new_password}
                    onChange={e => setForm({ ...form, new_password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-xs font-semibold text-foreground">Konfirmasi Password Baru</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={form.confirm_password}
                    onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  )
}
