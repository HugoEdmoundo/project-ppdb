import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { settingsService } from '@/services'
import { apiFetch } from '@/api/client'
import {
  ArrowRight, LogIn, Menu, X, Wallet, FileUp, ClipboardCheck, Trophy,
  LayoutDashboard, Zap, Headphones, GraduationCap, ArrowRightLeft, Waves,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveWave {
  active: boolean
  name?: string
  allowed_paths?: string[]
  allowed_levels?: string[]
  registration_start_date?: string | null
  registration_end_date?: string | null
}

const PATH_LABEL: Record<string, string> = {
  reguler: 'Reguler',
  pindahan: 'Pindahan',
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl] = useState('')
  const [wave, setWave] = useState<ActiveWave | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    settingsService.getAll()
      .then((settings) => {
        const logo = settings.find((s) => s.key === 'logo')?.value
        const favicon = settings.find((s) => s.key === 'favicon')?.value
        setLogoUrl(logo || favicon || '')
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch<ActiveWave>('/ppdb/waves/active-public')
      .then((data) => setWave(data.active ? data : { active: false }))
      .catch(() => setWave({ active: false }))
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isOpen = wave?.active === true
  const levels = wave?.allowed_levels ?? []
  const paths = (wave?.allowed_paths ?? []).map((p) => PATH_LABEL[p] ?? p)
  const year = new Date().getFullYear()

  const steps = [
    { icon: Wallet, title: 'Daftar & Bayar', desc: 'Isi formulir pendaftaran dan selesaikan biaya formulir pada gelombang yang aktif.' },
    { icon: FileUp, title: 'Upload Dokumen', desc: 'Unggah berkas persyaratan untuk diverifikasi oleh panitia.' },
    { icon: ClipboardCheck, title: 'Seleksi & Ujian', desc: 'Ikuti tahapan seleksi sesuai jadwal yang telah Anda pilih.' },
    { icon: Trophy, title: 'Pengumuman & MOU', desc: 'Lihat hasil kelulusan, tanda tangani MOU, dan selesaikan daftar ulang.' },
  ]

  const features = [
    { icon: LayoutDashboard, title: 'Sistem Terintegrasi', desc: 'Pendaftaran, seleksi, hingga pengumuman dapat dipantau dari satu dashboard.', tint: 'bg-emerald-light text-emerald-primary' },
    { icon: Zap, title: 'Transparan & Cepat', desc: 'Proses seleksi dan informasi kelulusan dilakukan secara transparan dan seketika.', tint: 'bg-gold-bg text-gold-dark' },
    { icon: Headphones, title: 'Dukungan Panitia', desc: 'Tim panitia siap sedia mendampingi proses pendaftaran Anda jika mengalami kendala.', tint: 'bg-emerald-light text-emerald-primary' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      {/* ── Navbar ── */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b bg-white/85 backdrop-blur-xl transition-shadow duration-300',
        scrolled ? 'border-slate-200/80 shadow-sm' : 'border-transparent'
      )}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
          <div className="flex min-w-0 items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="PTDARRAHMAN Logo" className="h-9 w-auto max-w-36 object-contain" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-lg text-white shadow-sm shadow-emerald-primary/20">
                ار
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-heading text-base font-bold text-foreground">Ar-Rahman</div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">PPDB Online</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" onClick={() => navigate('/auth/login')} className="gap-2 rounded-full font-semibold text-foreground hover:text-primary">
              <LogIn className="h-4 w-4" /> Masuk
            </Button>
            <Button onClick={() => navigate('/register')} className="gap-2 rounded-full bg-primary px-5 font-semibold shadow-md shadow-emerald-primary/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-lg">
              Daftar Sekarang
            </Button>
          </div>

          <button
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Buka/tutup menu"
            aria-expanded={mobileOpen}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-slate-100 sm:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur-xl sm:hidden">
            <Button variant="ghost" onClick={() => navigate('/auth/login')} className="mb-2 w-full justify-start gap-2 rounded-xl font-semibold">
              <LogIn className="h-4 w-4" /> Masuk
            </Button>
            <Button onClick={() => navigate('/register')} className="w-full gap-2 rounded-xl font-semibold">
              Daftar Sekarang <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,107,71,0.14),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(26,107,71,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        {/* Arabic watermark */}
        <div className="pointer-events-none absolute -right-8 top-4 select-none font-heading text-[15rem] font-bold leading-none text-emerald-primary/[0.05] md:text-[22rem]">
          ار
        </div>

        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          {/* Status pill */}
          {wave && (
            <div className="inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm transition-all animate-fade-in"
              style={{ borderColor: isOpen ? 'rgba(26,107,71,0.25)' : 'rgba(212,168,83,0.4)', background: isOpen ? 'rgba(232,245,238,0.9)' : 'rgba(254,250,238,0.9)', color: isOpen ? '#135235' : '#B88F3D' }}>
              {isOpen ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-bright opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-bright" />
                  </span>
                  <span>Pendaftaran <span className="font-bold">{wave.name ?? 'Gelombang Baru'}</span> Telah Dibuka</span>
                </>
              ) : (
                <>
                  <Waves className="h-4 w-4" />
                  <span>Menunggu Gelombang PPDB Baru</span>
                </>
              )}
            </div>
          )}

          <h1 className="mt-6 font-heading text-4xl leading-tight font-extrabold tracking-tight text-slate-900 md:text-6xl">
            Penerimaan Peserta Didik Baru<br className="hidden md:block" />
            <span className="mt-1 block bg-gradient-to-r from-emerald-dark via-emerald-primary to-emerald-bright bg-clip-text text-transparent">
              Pesantren Ar-Rahman
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 md:text-xl">
            Membangun generasi Qur'ani yang berakhlak mulia, unggul dalam ilmu pengetahuan, dan kompetitif di era digital.
          </p>

          {/* Wave chips */}
          {isOpen && (levels.length > 0 || paths.length > 0) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {levels.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {levels.join(' · ')}
                </div>
              )}
              {paths.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                  <ArrowRightLeft className="h-4 w-4 text-gold-dark" />
                  Jalur {paths.join(' · ')}
                </div>
              )}
            </div>
          )}

          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              onClick={() => navigate('/register')}
              disabled={!isOpen}
              className="h-14 w-full gap-2 rounded-full bg-primary px-9 text-base font-semibold text-primary-foreground shadow-xl shadow-emerald-primary/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-2xl hover:shadow-emerald-primary/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isOpen ? <>Daftar Sekarang <ArrowRight className="h-5 w-5" /></> : 'Pendaftaran Ditutup Sementara'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/auth/login')}
              className="h-14 w-full gap-2 rounded-full border-slate-200 bg-white px-9 text-base font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary sm:w-auto"
            >
              Sudah Punya Akun? <LogIn className="h-4 w-4" />
            </Button>
          </div>
          {!isOpen && (
            <p className="mt-4 text-sm text-slate-500">Silakan cek kembali di kemudian hari saat gelombang baru diumumkan.</p>
          )}

          {/* Gold ornament divider */}
          <div className="mt-12 flex items-center justify-center gap-3 opacity-80">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-accent" />
            <span className="h-2 w-2 rotate-45 bg-gold-accent" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-accent" />
          </div>
        </div>
      </section>

      {/* ── Alur Pendaftaran ── */}
      <section className="border-t border-slate-100 bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Alur Pendaftaran</p>
            <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Empat Langkah Menuju Ar-Rahman
            </h2>
            <p className="mt-3 text-slate-500">
              Simak dan ikuti setiap tahapan pendaftaran dengan teliti agar proses berjalan lancar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-ivory/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-primary/20 hover:bg-white hover:shadow-lg hover:shadow-emerald-primary/10">
                  <span className="pointer-events-none absolute -right-2 -top-3 select-none font-heading text-7xl font-extrabold text-emerald-primary/[0.06] transition-colors group-hover:text-emerald-primary/10">
                    {i + 1}
                  </span>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-primary to-emerald-bright shadow-md shadow-emerald-primary/20 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5 text-white" />
                    </span>
                    <span className="font-heading text-sm font-bold text-gold-dark">Langkah {i + 1}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Keunggulan ── */}
      <section className="bg-background py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Mengapa Ar-Rahman?</p>
            <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Sistem Pendaftaran Modern &amp; Terpercaya
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent" />
                  <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', f.tint)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className="bg-background pb-16 md:pb-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-obsidian via-emerald-dark to-emerald-primary px-6 py-14 text-center shadow-2xl shadow-emerald-dark/30 md:py-16">
            <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-emerald-bright/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-6 select-none font-heading text-[12rem] font-bold leading-none text-white/[0.06]">
              ار
            </div>
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-accent">PPDB {year === 2026 ? '2026' : year}</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Siap Membangun Generasi Qur'ani?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Bergabunglah bersama kami dan jadilah bagian dari generasi yang berakhlak mulia, unggul dalam ilmu, dan
                kompetitif di era digital.
              </p>
              <Button
                onClick={() => navigate('/register')}
                disabled={!isOpen}
                className="mt-8 gap-2 rounded-full bg-gold-accent px-9 py-3.5 text-base font-bold text-emerald-dark shadow-lg shadow-gold-accent/30 transition-all hover:-translate-y-0.5 hover:bg-gold-light hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isOpen ? <>Daftar Sekarang <ArrowRight className="h-5 w-5" /></> : 'Menunggu Gelombang Baru'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-neutral-950 py-10 text-slate-400">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div className="max-w-sm">
            <div className="flex items-center justify-center gap-2.5 md:justify-start">
              {logoUrl ? (
                <img src={logoUrl} alt="PTDARRAHMAN Logo" className="h-8 w-auto max-w-32 object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-primary font-bold text-white">ار</div>
              )}
              <span className="font-heading text-base font-bold text-white">Ar-Rahman</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Membangun generasi Qur'ani yang berakhlak mulia.
            </p>
          </div>
          <nav className="flex flex-col items-center gap-2 text-sm md:items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Navigasi</span>
            <button onClick={() => navigate('/')} className="transition-colors hover:text-white">Beranda</button>
            <button onClick={() => navigate('/register')} className="transition-colors hover:text-white">Daftar PPDB</button>
            <button onClick={() => navigate('/auth/login')} className="transition-colors hover:text-white">Masuk</button>
          </nav>
        </div>
        <div className="container mx-auto mt-8 px-4">
          <div className="border-t border-white/10 pt-6 text-center text-xs text-slate-500">
            &copy; {year} Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}