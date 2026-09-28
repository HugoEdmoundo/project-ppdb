import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { BookOpenCheck, MonitorSmartphone, HeartHandshake } from 'lucide-react'
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { apiFetch, API_BASE } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useBrand, AuthCard } from '@repo/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const recoverSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
  dob: z.string().min(1, 'Tanggal lahir wajib diisi'),
})

type RecoverData = z.infer<typeof recoverSchema>

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
  // Blokir module: semua modul dinonaktifkan oleh superadmin
  if (m.startsWith('module_disabled:') || m.includes('module_disabled')) {
    return 'Akses ditolak: semua modul dinonaktifkan oleh superadmin. Hubungi superadmin untuk mengaktifkan akses.'
  }
  if (m.includes('invalid username') || m.includes('wrong password') || m.includes('incorrect')) {
    return 'Username atau password salah. Silakan coba lagi.'
  }
  if (m.includes('inactive')) return 'Akun ini tidak aktif. Hubungi admin.'
  if (m.includes('locked')) return 'Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi nanti.'
  if (m.includes('too many') || m.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  return message
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const {
    register: registerRecover,
    handleSubmit: handleRecoverSubmit,
    reset: resetRecover,
    formState: { errors: recoverErrors, isSubmitting: recoverLoading },
  } = useForm<RecoverData>({
    resolver: zodResolver(recoverSchema),
  })

  const [loginSuccess, setLoginSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [successName, setSuccessName] = useState('')
  const { logoUrl } = useBrand(API_BASE)

  const [showRecover, setShowRecover] = useState(false)
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null)

  // Redirect to dashboard logic
  useEffect(() => {
    if (!user) return
    const isApplicantUser = user.user_type === 'applicant'
    const dest = isApplicantUser ? '/applicant' : '/admin/dashboard'

    if (loginSuccess) {
      const timer = setTimeout(() => navigate(dest, { replace: true }), 500)
      return () => clearTimeout(timer)
    } else {
      navigate(dest, { replace: true })
    }
  }, [loginSuccess, user, navigate])

  if (user && !loginSuccess) {
    return null
  }

  const onRecover = async (data: RecoverData) => {
    try {
      const res = await apiFetch<any>('/auth/recover-applicant', {
        method: 'POST',
        body: JSON.stringify({ nik: data.nik, birth_date: data.dob })
      })
      setRecoverMessage(res.message || 'Password baru sudah dikirim ke email/WhatsApp Anda.')
    } catch (err: any) {
      toast('error', err.message || 'Data tidak ditemukan')
    }
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      setErrorMsg('')
      setLoading(true)
      await login(username, password)
      setSuccessName(username)
      setLoginSuccess(true)
    } catch (err) {
      setLoginSuccess(false)
      setErrorMsg(translateLoginError(err instanceof Error ? err.message : 'Login gagal'))
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
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          <AuthCard
            title="Selamat Datang"
            subtitle="Sistem PTDARRAHMAN"
            logoUrl={logoUrl || undefined}
            loading={loading}
            success={loginSuccess}
            error={errorMsg}
            successName={successName}
            onSubmit={handleLogin}
            submitText="Masuk"
            forgotText="Pulihkan Akun"
            onForgotClick={() => setShowRecover(true)}
          />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Butuh bantuan? Silakan hubungi admin PPDB Ar-Rahman.
          </p>
        </div>
      </main>

      <Dialog open={showRecover} onOpenChange={(open) => {
        setShowRecover(open)
        if (!open) { setRecoverMessage(null); resetRecover() }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pulihkan Kredensial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {recoverMessage ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
                  {recoverMessage}
                </div>
                <p className="text-sm text-muted-foreground">
                  Periksa email/WhatsApp Anda. Gunakan password baru tersebut untuk login.
                </p>
                <Button className="w-full" onClick={() => setShowRecover(false)}>Tutup</Button>
              </div>
            ) : (
              <form onSubmit={handleRecoverSubmit(onRecover)} className="space-y-4">
                <p className="text-sm text-muted-foreground">Masukkan NIK dan Tanggal Lahir pendaftar untuk mereset dan memulihkan akses login.</p>
                <div>
                  <Label htmlFor="rec_nik">NIK Pendaftar</Label>
                  <Input id="rec_nik" {...registerRecover('nik')} placeholder="320..." error={recoverErrors.nik?.message} />
                  {recoverErrors.nik && <p className="mt-1 text-xs text-red-500">{recoverErrors.nik.message}</p>}
                </div>
                <div>
                  <Label htmlFor="rec_dob">Tanggal Lahir</Label>
                  <Input id="rec_dob" type="date" {...registerRecover('dob')} error={recoverErrors.dob?.message} />
                  {recoverErrors.dob && <p className="mt-1 text-xs text-red-500">{recoverErrors.dob.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={recoverLoading}>
                  {recoverLoading ? 'Mencari Data...' : 'Cari Data & Reset Password'}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
