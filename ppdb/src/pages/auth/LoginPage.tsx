import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, usePermission } from '../../contexts/AuthContext'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LayoutDashboard,
  User,
  ArrowRight,
  BookOpenCheck,
  MonitorSmartphone,
  HeartHandshake,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { settingsService } from '../../services/index'
import { cn } from '@/lib/utils'

const PATTERN_OVERLAY = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23D4A853' stroke-width='1'%3E%3Cpath d='M28 0 56 28 28 56 0 28Z'/%3E%3Ccircle cx='28' cy='28' r='9'/%3E%3C/g%3E%3C/svg%3E\")",
}

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "Tahfidz Al-Qur'an 30 Juz",
    desc: 'Hafalan terjaga dengan bimbingan intensif para ustadz',
  },
  {
    icon: MonitorSmartphone,
    title: 'Teknologi Digital',
    desc: 'Coding, AI, robotik & literasi digital mutakhir',
  },
  {
    icon: HeartHandshake,
    title: 'Bimbingan Profesional',
    desc: 'Pendampingan akademik & karakter setiap santri',
  },
]

const STATS = [
  { value: '30 Juz', label: "Tahfidz Qur'an" },
  { value: '4', label: 'Program Unggulan' },
  { value: '6 Tahun', label: 'Pendidikan Terpadu' },
]

function translateLoginError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid username') || m.includes('wrong password') || m.includes('incorrect')) {
    return 'Username atau password salah. Silakan coba lagi.'
  }
  if (m.includes('inactive')) return 'Akun ini tidak aktif. Hubungi admin.'
  if (m.includes('locked')) return 'Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi nanti.'
  if (m.includes('too many') || m.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  return message
}

export default function LoginPage() {
  const { login, user, logout } = useAuth()
  const { isAdmin, hasApplicantAccess } = usePermission()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [shakeKey, setShakeKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [logoUrl, setLogoUrl] = useState('/logo.png')

  useEffect(() => {
    settingsService
      .getAll()
      .then((settings) => {
        const logo = settings.find((s) => s.key === 'logo')?.value
        if (logo) setLogoUrl(logo)
      })
      .catch(() => {})
  }, [])

  const canAdmin = isAdmin()
  const canApplicant = hasApplicantAccess()
  const canChoose = canAdmin && canApplicant && user?.user_type !== 'superadmin'

  useEffect(() => {
    if (user) {
      if (canChoose) {
        // Do nothing, let user choose from the UI below
      } else if (canAdmin) {
        navigate('/admin/dashboard', { replace: true })
      } else if (canApplicant) {
        navigate('/applicant', { replace: true })
      } else {
        // No permission to any PPDB module or dashboard
        setErrorMsg('Akses ditolak: Anda tidak memiliki izin untuk modul PPDB.')
        logout()
      }
    }
  }, [user, navigate, canAdmin, canApplicant, canChoose, logout])

  function clearLoginError() {
    setErrorMsg('')
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: { username?: string; password?: string } = {}
    if (!username.trim()) errors.username = 'Username wajib diisi'
    if (!password) errors.password = 'Password wajib diisi'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setLoading(true)
    try {
      await login(username, password)
      setLoginSuccess(true)
      setErrorMsg('')
    } catch (err) {
      setLoginSuccess(false)
      setErrorMsg(translateLoginError(err instanceof Error ? err.message : 'Login gagal'))
      setShakeKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-[300px] w-[300px] rounded-full bg-primary/10 opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-[350px] w-[350px] rounded-full bg-gold-accent/20 opacity-20 blur-3xl" />

      {/* ── LEFT BRAND PANEL ── */}
      <aside className="relative flex w-full shrink-0 flex-col overflow-hidden bg-gradient-to-br from-emerald-dark via-emerald-primary to-[#103D27] px-6 py-7 lg:w-[46%] lg:min-h-dvh lg:justify-between lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={PATTERN_OVERLAY} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

        {/* Brand mark (mobile only — iklan tidak pakai logo) */}
        <div className="relative z-10 lg:hidden">
          <p className="font-heading text-lg font-bold text-white">Ar-Rahman</p>
          <p className="text-[11px] text-white/70">Pesantren Tahfidz Qur'an &amp; Digital</p>
        </div>

        {/* Showcase (desktop) */}
        <div className="relative z-10 mt-12 hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-light/40 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
            Penerimaan Peserta Didik Baru
          </span>
          <h2 className="font-heading mt-5 text-3xl xl:text-4xl font-bold leading-tight text-white">
            Mulai Perjalanan Anak Anda di <span className="text-gold-light">Ar-Rahman</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
            Membentuk generasi Qur'ani yang unggul secara spiritual, kompetitif secara digital, dan siap memimpin masa
            depan.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <f.icon className="h-5 w-5 text-gold-light" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-white/65">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats (desktop) */}
        <div className="relative z-10 mt-12 hidden grid-cols-3 gap-3 lg:grid">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md">
              <p className="font-heading text-lg font-bold text-gold-light">{s.value}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/70">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="relative z-10 mt-6 hidden text-[11px] text-white/45 lg:block">
          Pesantren Tahfidz Qur'an &amp; Digital Ar-Rahman · Sejak 2021 · Bekasi
        </p>
      </aside>

      {/* ── RIGHT FORM ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 lg:px-12 lg:py-12">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary/5 via-transparent to-gold-accent/10 blur-xl" />
            <Card
              key={shakeKey}
              className={cn('relative glass-panel p-8 md:p-10 text-center', shakeKey > 0 && 'animate-shake')}
            >
              <CardContent className="p-0">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                {/* Logo */}
                <img
                  src={logoUrl}
                  alt="Logo Ar-Rahman"
                  className="mx-auto mb-6 h-11 w-auto max-w-full object-contain"
                />

                <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
                  {user && canChoose ? 'Pilih Dashboard' : 'Masuk ke Akun'}
                </h1>
                <p className="mb-6 text-xs text-muted-foreground">
                  {user && canChoose
                    ? `Selamat datang, ${user.full_name || user.username}`
                    : 'Silakan masuk untuk melanjutkan ke PPDB Ar-Rahman'}
                </p>

                {/* Alerts */}
                {loginSuccess && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-primary/25 bg-emerald-light px-4 py-3 text-left text-xs font-medium text-emerald-dark animate-fade-in">
                    <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
                    <span>Login berhasil</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-danger/25 bg-rose-light px-4 py-3 text-left text-xs font-medium text-rose-dark animate-fade-in">
                    <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {user && canChoose ? (
                  <div className="space-y-4">
                    <Button className="w-full" size="lg" onClick={() => navigate('/admin/dashboard')}>
                      <LayoutDashboard className="h-5 w-5" />
                      Masuk Admin Dashboard
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/applicant')}>
                      <User className="h-5 w-5" />
                      Masuk Dashboard Peserta
                    </Button>
                  </div>
                ) : !user ? (
                  <form onSubmit={handleSubmit} className="space-y-5 text-left">
                    <div>
                      <Label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-foreground">
                        Username
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setFieldErrors((f) => ({ ...f, username: undefined })); clearLoginError() }}
                          placeholder="Masukkan username"
                          error={fieldErrors.username}
                          required
                          autoFocus
                          autoComplete="username"
                          className="h-11 rounded-xl bg-white/80 pl-9"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })); clearLoginError() }}
                          placeholder="Masukkan password"
                          error={fieldErrors.password}
                          required
                          autoComplete="current-password"
                          className="h-11 rounded-xl bg-white/80 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                          aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={loading} loading={loading}>
                      {loading ? (
                        'Memproses...'
                      ) : (
                        <>
                          Masuk
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Butuh bantuan? Silakan hubungi admin PPDB Ar-Rahman.
          </p>
        </div>
      </main>
    </div>
  )
}
