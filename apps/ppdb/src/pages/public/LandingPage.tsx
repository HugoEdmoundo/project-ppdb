import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SectionGlobe, type GlobeStop } from '@/components/ui'
import { apiFetch, API_BASE } from '@/api/client'
import { useBrand } from '@repo/ui'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  ArrowRight, LogIn, Menu, X, Wallet, FileUp, ClipboardCheck, Trophy,
  LayoutDashboard, Zap, Headphones, Waves,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/motion'
import { ArabesquePattern, MihrabArch } from '@/components/landing/HeroDecorations'
import Footer from '@/components/layout/Footer'

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
  prestasi: 'Prestasi',
  tahfidz: 'Tahfidz',
  rapot: 'Rapot',
}

// Hoisted di luar component: array-nya stateless, jadi tidak perlu dibuat ulang
// tiap render (kalau tidak, `useMemo` di dalam hook ikut recompute terus).
// Di desktop bola kecil di luar tepi kanan kolom "Alur", lalu membesar di tengah
// kolom "Mengapa Ar-Rahman?". Di mobile diturunkan ke pojok kanan bawah biar
// tidak menutupi kartu.
//
// `leftPx` diukur dari titik tengah kolom konten (`hero-column`, 896px):
//   - alur   : +560px. Tepi kanan kolom ada di +448px, jadi bola ini berada
//              112px di luar kolom. Jari-jarinya 250 x 0.55 = 137px (setengah
//              69px), jadi masih ada 43px jarak bersih dari tepi kolom.
//   - mengapa : 0, tepat di sumbu kolom supaya simetris terhadap heading.
//
// Section CTA tidak punya globe lagi, jadi sengaja tidak ada stop di sini —
// follower fade out sebelum sampai sana.
const GLOBE_STOPS: GlobeStop[] = [
  { id: 'alur', top: '16%', left: '50%', leftPx: 560, scale: 0.55, opacity: 0.8 },
  { id: 'mengapa', top: '48%', left: '50%', leftPx: 0, scale: 1.8, opacity: 0.28 },
]

// Mobile: pojok memakai persen viewport, bukan `leftPx` — di layar 375px kolom hanya
// 345px sehingga jarak tetap 560px akan mendorong bola keluar layar.
const GLOBE_STOPS_MOBILE: GlobeStop[] = [
  { id: 'alur', top: '86%', left: '84%', scale: 0.4, opacity: 0.55 },
  { id: 'mengapa', top: '88%', left: '86%', scale: 0.45, opacity: 0.45 },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [wave, setWave] = useState<ActiveWave | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const parallaxRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const { logoUrl, faviconUrl } = useBrand(API_BASE)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // prefers-reduced-motion: Lenis & parallax GSAP dimatikan, posisi navbar dan
    // garis progress tetap jalan lewat listener scroll native (dibaca langsung,
    // bukan dari `lenis.scroll` yang tidak akan pernah update).
    if (prefersReducedMotion()) {
      const onScroll = () => {
        setScrolled(window.scrollY > 80)
        const bar = progressRef.current
        if (bar) {
          const max = document.documentElement.scrollHeight - window.innerHeight
          const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
          bar.style.transform = `scaleX(${ratio})`
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      onScroll()
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }

    const ctx = gsap.context(() => {
      const triggerElement = parallaxRef.current?.querySelector('[data-parallax-layers]')

      if (triggerElement) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "top top",
            end: "bottom top",
            scrub: 0
          }
        });

        const layers = [
          { layer: "1", yPercent: 70 },
          { layer: "2", yPercent: 55 },
          { layer: "3", yPercent: 40 },
          { layer: "4", yPercent: 10 }
        ];

        layers.forEach((layerObj, idx) => {
          tl.to(
            triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
            {
              yPercent: layerObj.yPercent,
              ease: "none"
            },
            idx === 0 ? undefined : "<"
          );
        });
      }
    }, parallaxRef)

    const lenis = new Lenis()
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)

    // Ambang 80px, sama dengan Navbar companyprofile.
    //
    // PENTING: nilainya dibaca di rAF yang sama dengan `lenis.raf()`, bukan dari
    // event `scroll` native. Event scroll Api变量的 asynchronously terhadap rAF
    // Lenis, jadi kelas baru datang terlambat — lalu transition CSSIDC.smoothen
    // untuk kedua kalinya, dan navbar terlihat \"nge-lag\" di belakang scroll.
    // Dengan membacanya se-frame, hanya ada satu sumber smoothening.
    let navScrolled = false
    const applyNavScrolled = () => {
      const next = lenis.scroll > 80
      if (next === navScrolled) return
      navScrolled = next
      setScrolled(next)
    }

    // Garis progress di navbar (efek yang sama dengan Navbar companyprofile).
    // Ditulis langsung ke DOM lewat `style` — bukan state — supaya tidak memicu
    // re-render 60x/detik. `ScrollTrigger.maxScroll` dipakai supaya tidak perlu
    // baca `scrollHeight` tiap frame (yang memaksa layout).
    const updateScrollProgress = () => {
      const bar = progressRef.current
      if (!bar) return
      const max = ScrollTrigger.maxScroll(window)
      const ratio = max > 0 ? Math.min(1, Math.max(0, lenis.scroll / max)) : 0
      bar.style.transform = `scaleX(${ratio})`
    }

    const tick = (time: number) => {
      lenis.raf(time * 1000)
      updateScrollProgress()
      applyNavScrolled()
    }

    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    updateScrollProgress()
    applyNavScrolled()

    return () => {
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (lenisRef.current === lenis) lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    apiFetch<ActiveWave>('/ppdb/waves/active-public')
      .then((data) => setWave(data.active ? data : { active: false }))
      .catch(() => setWave({ active: false }))
  }, [])

  const isOpen = wave?.active === true
  const paths = (wave?.allowed_paths ?? []).map((p) => PATH_LABEL[p] ?? p)
  const year = new Date().getFullYear()

  const waveMeta = paths.length > 0 ? `Jalur: ${paths.join(', ')}` : ''

  const scrollToAlur = () => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo('#alur', { offset: -64, duration: 1.2 })
      return
    }
    document.getElementById('alur')?.scrollIntoView({ behavior: 'smooth' })
  }

  const steps = [
    { icon: Wallet, title: 'Daftar & Bayar', desc: 'Isi formulir pendaftaran dan selesaikan biaya formulir pada gelombang yang aktif.' },
    { icon: FileUp, title: 'Upload Dokumen', desc: 'Unggah berkas persyaratan untuk diverifikasi oleh panitia.' },
    { icon: ClipboardCheck, title: 'Seleksi & Ujian', desc: 'Ikuti tahapan seleksi sesuai jadwal yang telah Anda pilih.' },
    { icon: Trophy, title: 'Pengumuman & MOU', desc: 'Lihat hasil kelulusan, tanda tangani MOU, dan selesaikan daftar ulang.' },
  ]

  // Radius navbar, dipakai bersama oleh <header> DAN wrapper garis progress
  // supaya sudutnya tidak desync saat transisi.
  //
  // Setengah tinggi bar: h-16 = 64px → 32px, md:h-20 = 80px → 40px. Angka ini
  // membuat bentuknya tetap persis stadium/pill seperti `rounded-full`, TAPI
  // rentang interpolasinya realistis (32px ↔ 40px, bukan 9999px ↔ 0) sehingga
  // transisi lengkung → kotak terasa linear dan halus.
  const PILL_RADIUS = 'rounded-[2rem] md:rounded-[2.5rem]'
  const PILL_RADIUS_OFF = 'rounded-none'

  const features = [
    { icon: LayoutDashboard, title: 'Sistem Terintegrasi', desc: 'Pendaftaran, seleksi, hingga pengumuman dapat dipantau dari satu dashboard.', tint: 'bg-emerald-light text-emerald-primary' },
    { icon: Zap, title: 'Transparan & Cepat', desc: 'Proses seleksi dan informasi kelulusan dilakukan secara transparan dan seketika.', tint: 'bg-gold-bg text-gold-dark' },
    { icon: Headphones, title: 'Dukungan Panitia', desc: 'Tim panitia siap sedia mendampingi proses pendaftaran Anda jika mengalami kendala.', tint: 'bg-emerald-light text-emerald-primary' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      {/* ── Navbar ──
          Efek disamakan dengan `apps/companyprofile/app/components/layout/Navbar.tsx`:
          saat di-scroll, navbar lepas dari tepi layar dan berubah jadi pil
          melayang (inset + rounded penuh + shadow lembut), dan muncul garis
          progress gold → emerald di tepi bawahnya.

          PENTING soal radius: state "melayang" sengaja TIDAK pakai
          `rounded-full`. `rounded-full` = 9999px, jadi interpolasi 9999px → 0
          (lengkung → kotak) nyaris tidak kelihatan selama ~90% durisi, baru
          snap ke kotak di frame terakhir. Itu yang bikin transisinya terasa
          "nge-lag"/kurang halus. Nilai px yang realistis (setengah tinggi bar)
          bikin interpolasinya linear, dan secara visual tetap persis pill. */}
      <header className={cn(
        'fixed z-50 ease-brand-pill',
        'transition-[left,right,top,max-width,border-radius,background-color,box-shadow,border-color]',
        scrolled
          ? cn('left-2 right-2 top-2 mx-auto max-w-6xl border border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl md:left-8 md:right-8 md:top-4', PILL_RADIUS)
          : cn('left-0 right-0 top-0 mx-auto max-w-[100vw] border border-transparent bg-white/85 shadow-sm backdrop-blur-2xl', PILL_RADIUS_OFF)
      )}>
        {/* Scroll progress line — radiusnya HARUS sama persis dengan header,
            kalau tidak sudutnya desync saat transisi. */}
        <div className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden ease-brand-pill transition-[border-radius]',
          scrolled ? PILL_RADIUS : PILL_RADIUS_OFF
        )}>
          <div
            ref={progressRef}
            className="absolute bottom-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-gold-accent to-emerald-primary"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
            <div className="flex min-w-0 items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="PTD-Arrahman Logo" className="h-9 w-auto max-w-36 object-contain" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-lg text-white shadow-sm shadow-emerald-primary/20">
                  ار
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-heading text-base font-bold text-foreground">PTD-Arrahman</div>
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

          {/* Mobile menu — ikut rounding pil biar panelnya tidak "gantung"
              dari bar atas yang sudah rounded. */}
          {mobileOpen && (
            <div className={cn(
              'border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur-2xl sm:hidden',
              scrolled ? 'rounded-b-2xl' : 'rounded-b-none'
            )}>
              <Button variant="ghost" onClick={() => navigate('/auth/login')} className="mb-2 w-full justify-start gap-2 rounded-xl font-semibold">
                <LogIn className="h-4 w-4" /> Masuk
              </Button>
              <Button onClick={() => navigate('/register')} className="w-full gap-2 rounded-xl font-semibold">
                Daftar Sekarang <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
      </header>

      {/* ── Hero (Parallax) ── */}
      <section
        ref={parallaxRef}
        className="relative h-[100svh] w-full overflow-hidden bg-gradient-to-b from-ivory via-white to-[#F0EDE4]"
      >
        <div className="absolute inset-0 h-full w-full">
          <div data-parallax-layers className="relative h-[100svh] w-full">
            {/* Layer 1 - Colour fields outside the content column + ambient glows */}
            <div data-parallax-layer="1" className="pointer-events-none absolute inset-0 z-0">
              <div className="hero-wash-left absolute inset-y-0 left-0 hidden lg:block" />
              <div className="hero-wash-right absolute inset-y-0 right-0 hidden lg:block" />
              <div className="absolute -top-40 left-1/2 h-[46rem] w-[46rem] -translate-x-[calc(50%+28rem)] rounded-full bg-emerald-primary/10 blur-3xl" />
              <div className="absolute -bottom-32 left-1/2 h-[34rem] w-[34rem] -translate-x-[calc(50%-24rem)] rounded-full bg-gold-accent/15 blur-3xl" />
            </div>

            {/* Layer 2 - Arabesque texture. Density rises away from the text:
                faint band behind the column (a), full strength outside it (b). */}
            <div
              data-parallax-layer="2"
              className="pointer-events-none absolute inset-0 z-0 flex justify-center"
            >
              <div className="hero-texture-outside absolute inset-0 hidden text-emerald-primary/[0.13] lg:block">
                <ArabesquePattern />
              </div>
              <div className="hero-column relative text-emerald-primary/[0.07]">
                <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
                  <ArabesquePattern />
                </div>
              </div>
            </div>

            {/* Layer 3 - Foreground Content. Tanpa padding horizontal: `--hero-col-width`
                sudah menyisakan 4vw di tiap sisi, jadi `px-4` di sini cuma
                menambah 2px limpahan pada layar 375px. */}
            <div data-parallax-layer="3" className="absolute inset-0 z-20 flex items-center justify-center pt-20">
              <div className="hero-column relative flex flex-col items-center text-center">
                {/* Status pill (PPDB specific) */}
                {wave && (
                  <div className="mb-8 flex flex-col items-center gap-2 animate-fade-in sm:mb-12">
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-primary/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
                      {isOpen ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                          </span>
                          <span>
                            Pendaftaran <span className="text-emerald-primary">{wave.name ?? 'Gelombang Baru'}</span> dibuka
                          </span>
                        </>
                      ) : (
                        <>
                          <Waves className="h-4 w-4 text-slate-400" />
                          <span>Menunggu Gelombang Baru</span>
                        </>
                      )}
                    </div>
                    {waveMeta && (
                      <p className="text-xs font-medium tracking-wide text-slate-500">{waveMeta}</p>
                    )}
                  </div>
                )}

                {/* Arabic Quote — satu unit dengan terjemahannya di bawah */}
                <div className="arabic-quote mb-2 text-xl text-gold-dark opacity-90 sm:text-2xl md:text-3xl">
                  «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
                </div>
                <p className="text-sm italic text-slate-500 sm:text-base">
                  {'"Bacalah dengan nama Tuhanmu yang menciptakan" — Al-Alaq 96:1'}
                </p>

                {/* 2 baris, bukan 3. Sebelumnya "Pesantren" (9) / "Tahfidz" (7) /
                    "& Digital Arrahman" (17) — baris ketiga hampir dua kali
                    lebar baris pertama, jadi rag-nya rusak. Sekarang 17/17. */}
                <h1 className="mt-8 text-center font-brand text-[2.25rem] font-bold leading-[1.06] tracking-[-0.015em] text-obsidian sm:mt-10 sm:text-5xl sm:leading-[1.02] md:text-6xl lg:text-7xl lg:leading-[0.98] xl:text-[5.5rem]">
                  Pesantren Tahfidz
                  <br />
                  <span className="text-emerald-primary">&amp; Digital Arrahman</span>
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg md:text-xl">
                  {"Mencetak penghafal Al-Qur'an yang khatam sekaligus melek teknologi digital — dua hal yang berjalan beriringan."}
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-5">
                  <Button
                    onClick={() => navigate('/register')}
                    disabled={!isOpen}
                    className={cn(
                      'h-auto gap-2 rounded-full px-6 py-3 text-sm font-bold sm:px-8 sm:py-4 sm:text-base',
                      isOpen
                        ? 'bg-emerald-primary text-white shadow-lg shadow-emerald-primary/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-xl'
                        : 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {isOpen ? 'Daftar Sekarang' : 'Menunggu Gelombang Baru'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={scrollToAlur}
                    className="h-auto gap-2 rounded-full border-emerald-primary/45 bg-white/60 px-6 py-3 text-sm font-bold text-emerald-primary backdrop-blur-md transition-all hover:border-emerald-primary hover:bg-emerald-primary/10 sm:px-8 sm:py-4 sm:text-base"
                  >
                    Lihat Alur Pendaftaran
                  </Button>
                </div>
              </div>
            </div>

            {/* Layer 4 - Foreground Decorations.
                Sengaja di BAWAH konten (z-10, bukan z-30): lebar H1 baris ketiga
                ("& Digital Arrahman") jauh lebih besar dari kotak lengkung, jadi
                kalau lengkungnya di depan, garis emasnya memotong glif H1 dan
                terbaca sebagai cacat, bukan hiasan. */}
            <div data-parallax-layer="4" className="pointer-events-none absolute inset-0 z-10">
              {/* Lebar 440px = setengah lebar kolom konten (896/2). Rasio 5:7 mengikuti
                  viewBox MihrabArch (200x280) supaya tidak teregang, dan mx-auto
                  menengahkan secara horizontal tanpa translate yang bisa ketimpa GSAP. */}
              <MihrabArch className="absolute inset-x-0 top-1/2 mx-auto aspect-[5/7] w-[min(440px,88vw)] -translate-y-1/2 text-gold-dark/20" />
            </div>
          </div>

          {/* Bottom fade — warna akhir disamakan persis dengan stop terakhir
              gradient hero (`#F0EDE4`), bukan `background`, supaya tidak ada
              garis sambungan tipis di bawah layar. */}
          <div className="pointer-events-none absolute bottom-0 left-0 z-40 h-48 w-full bg-gradient-to-t from-[#F0EDE4] to-transparent" />
        </div>
      </section>

      {/* ── Alur Pendaftaran ── */}
      <section id="alur" className="scroll-mt-16 border-t border-slate-100 bg-white py-16 md:py-20">
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
                <div key={step.title} className="group relative z-30 overflow-hidden rounded-2xl border border-slate-100 bg-ivory/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-primary/20 hover:bg-white hover:shadow-lg hover:shadow-emerald-primary/10">
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
      <section id="mengapa" className="bg-background py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          {/* z-10: teks sengaja di belakang globe (SectionGlobe z-20) */}
          <div className="relative z-10 mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Mengapa Ar-Rahman?</p>
            <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Sistem Pendaftaran Modern &amp; Terpercaya
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="relative z-30 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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

      {/* Globe z-20: di belakang kartu (z-30), di depan teks heading (z-10) */}
      <SectionGlobe stops={GLOBE_STOPS} mobileStops={GLOBE_STOPS_MOBILE} markUrl={faviconUrl || logoUrl} />

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
                className="mt-8 h-auto gap-2 rounded-full bg-gold-accent px-9 py-3.5 text-base font-bold text-emerald-dark shadow-lg shadow-gold-accent/30 transition-all hover:-translate-y-0.5 hover:bg-gold-light hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isOpen ? <>Daftar Sekarang <ArrowRight className="h-5 w-5" /></> : 'Menunggu Gelombang Baru'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  )
}
