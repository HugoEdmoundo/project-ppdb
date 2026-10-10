import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { prefersReducedMotion } from '@/lib/motion'
import { ArabesquePattern, MihrabArch } from './HeroDecorations'

/**
 * Panjang runway scroll, dalam vh.
 *
 * Efek aslinya ~250vh, tapi itu 2.5 layar penuh sebelum pengguna melihat
 * tombol "Daftar" — gesekan nyata di halaman yang tugas utamanya justru
 * mendaftar. 220vh masih terbaca sinematik tanpa terlalu jauh.
 */
const RUNWAY_VH = 220

/**
 * Kata kunci dipecah tepat di garis sambungan panel.
 *
 * `PTDAR | RAHMAN` = 5 | 5. Yang pernah dipakai di navbar adalah
 * `PTD-Arrahman` (3 | 9 kalau dipotong di tengah) — timpang berat, dan karena
 * kedua panel bergerak simetris ke `∓100%`, teks pun harus simetris.
 * `PTDARRAHMAN` juga sudah dipakai Footer dan seluruh companyprofile.
 */
const WORDMARK_LEFT = 'PTDAR'
const WORDMARK_RIGHT = 'RAHMAN'

/**
 * Scroll-Driven Portal Reveal (curtain parting).
 *
 * Dua panel solid menutupi seluruh layar dan meet di tengah. Satu nilai
 * progress scroll menggerakkan semuanya sekaligus: panel bergeser ke `∓100%`,
 * tiap paruh kata kunci mengikuti panelnya sampai menempel di tepi, dan
 * lapisan latar menyusut dari `scale(1.15)` ke `1` — ilusi kamera mundur
 * menembus gerbang.
 *
 * Latar memakai dekorasi yang sudah ada (pola Arabesque + glow), bukan foto:
 * `HeroDecorations.tsx` secara eksplisit tidak boleh memuat aset eksternal
 * supaya hero tetap render offline dan di dalam Docker tanpa CDN. Tekstur
 * girih yang diperbesar/mengecil terbaca jauh lebih baik sebagai kedalaman
 * dibanding gradien rata-rata yang hanya berubah ukuran.
 *
 * Reduced motion: komponen ini tidak dirender sama sekali, jadi konten hero
 * langsung terlihat tanpa perlu menggulir 220vh.
 */
export default function PortalReveal({ children }: { children?: React.ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (prefersReducedMotion()) return

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const backdrop = section.querySelector('[data-portal-backdrop]')
      const panelLeft = section.querySelector('[data-portal-panel-left]')
      const panelRight = section.querySelector('[data-portal-panel-right]')
      const halfLeft = section.querySelector('[data-portal-half-left]')
      const halfRight = section.querySelector('[data-portal-half-right]')
      const wordmark = section.querySelectorAll('[data-portal-wordmark]')
      const seam = section.querySelector('[data-portal-seam]')
      const hint = section.querySelector('[data-portal-hint]')

      if (!backdrop || !panelLeft || !panelRight || !halfLeft || !halfRight) return

      // `xPercent` dipakai (bukan px) supaya proporsional terhadap lebar paruh
      // yang berubah mengikuti viewport — tidak ada magic number.
      //
      // Kenapa posisinya di-stagger dan bukan semua di 0: versi lama memakai
      // `ease: 'none'` untuk latar tapi `power2.inOut` untuk panel, jadi dua
// layer bergerak dengan kecepatan berbeda dan terasa terdesinkronisasi —
      // itu yang bikin gerak terasa kasar. Di sini latar menjadi "kamera" yang
      // sedikit mendahului panel, panel mendahului kata kunci, dan ketiganya
      // memakai ease yang masih berkerabat.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          // 0.6 terlalu jauh: tirai masih meluncur 0.6 detik setelah scroll
          // berhenti, dan itu terasa tidak sinkron dengan jarinya. 0.35 masih
          // halus tanpa terlambat jauh.
          scrub: 0.35,
          invalidateOnRefresh: true,
        },
      })

      tl
        // Latar: kamera mulai mundur sedikit lebih dulu.
        .fromTo(backdrop, { scale: 1.15 }, { scale: 1, ease: 'power1.inOut', duration: 0.95 }, 0)
        // Panel: mengikuti dengan jeda kecil.
        .to(
          [panelLeft, panelRight],
          { xPercent: (i: number) => (i === 0 ? -100 : 100), ease: 'power2.inOut', duration: 0.85 },
          0.05,
        )
        // Kata kunci: paling belakang, memberi kesan "tertinggal" dari panel.
        .to(
          [halfLeft, halfRight],
          { xPercent: (i: number) => (i === 0 ? -100 : 100), ease: 'power2.inOut', duration: 0.85 },
          0.08,
        )
        // Tracking merapat cepat — kesan presisi kinetik, selesai di awal.
        .to(wordmark, { letterSpacing: '0.02em', ease: 'power1.out', duration: 0.5 }, 0.05)
        // Lalu menghilang sepenuhnya, bukan berhenti di 0.25. Di layar sempit
        // paruh yang menempel di tepi menabrak h1 di tengah, jadi kata kunci
        // harus sudah selesai bergerak sebelum konten jadi menarik.
        .to(wordmark, { opacity: 0, ease: 'power1.in', duration: 0.35 }, 0.3)
        .to(seam, { opacity: 0, scale: 2.4, ease: 'power2.out', duration: 0.3 }, 0)
        .to(hint, { opacity: 0, ease: 'power2.out', duration: 0.18 }, 0)
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    // z-[60] di atas `z-50` navbar di LandingPage. Tanpa ini portal ikut
    // bersaing global dengan header dan navbar tetap melayang DI ATAS panel,
    // padahal panel seharusnya menutupi seluruh layar di posisi awal.
    //
    // `data-portal-section` dibaca LandingPage untuk fade-in navbar seiring
    // panel terbuka — headernya milik sana, bukan milik komponen ini.
    <section
      ref={sectionRef}
      data-portal-section=""
      style={{ height: `${RUNWAY_VH}vh` }}
      className="relative z-[60] w-full"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-obsidian">
        {/* Latar — zoom 1.15 -> 1 */}
        <div
          data-portal-backdrop
          className="absolute inset-0 origin-center bg-gradient-to-b from-ivory via-white to-[#F0EDE4]"
        >
          <div className="hero-wash-left absolute inset-y-0 left-0 hidden lg:block" />
          <div className="hero-wash-right absolute inset-y-0 right-0 hidden lg:block" />
          <div className="absolute -top-40 left-1/2 h-[46rem] w-[46rem] -translate-x-[calc(50%+28rem)] rounded-full bg-emerald-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/2 h-[34rem] w-[34rem] -translate-x-[calc(50%-24rem)] rounded-full bg-gold-accent/15 blur-3xl" />
          <div className="hero-texture-outside absolute inset-0 hidden text-emerald-primary/[0.13] lg:block">
            <ArabesquePattern />
          </div>
          {/* MihrabArch di belakang konten. Lebar 440px = setengah lebar kolom
              konten (896/2); rasio 5:7 mengikuti viewBox MihrabArch (200x280)
              supaya tidak teregang. */}
          <MihrabArch className="absolute inset-x-0 top-1/2 mx-auto aspect-[5/7] w-[min(440px,88vw)] -translate-y-1/2 text-gold-dark/20" />
        </div>

        {/* Vignette tepi — supaya panel yang menyisip terlihat berdiri tegak di
            atas latar, bukan menempel. */}
        <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(26,26,26,0.28)_100%)]" />

        {/* Konten hero — LETAKNYA DI DALAM portal, di belakang panel. Panel
            membelah untuk membukanya; kalau konten diletakkan sebagai section
            terpisah setelah portal, yang terlihat hanya gradien kosong selama
            220vh dan efeknya kehilangan seluruh gunanya.

            Padding dibuat ramping di mobile karena frame ini `overflow-hidden`:
            di viewport pendek (mis. 568px) konten yang lebih tinggi akan
            terpotong — dan yang terpotong adalah tombol "Daftar". */}
        <div data-portal-content className="absolute inset-0 z-[6] flex items-center justify-center overflow-hidden px-4 pb-14 pt-20 sm:pb-20 sm:pt-24">
          {children}
        </div>

        {/* Dua panel solid, meet tepat di tengah */}
        <div
          data-portal-panel-left
          className="absolute inset-y-0 left-0 z-10 w-1/2 bg-obsidian will-change-transform"
        />
        <div
          data-portal-panel-right
          className="absolute inset-y-0 right-0 z-10 w-1/2 bg-obsidian will-change-transform"
        />

        {/* Kata kunci: tiap paruh menempel ke tepi panelnya sendiri */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center px-6">
          <div
            data-portal-half-left
            className="flex w-1/2 justify-end pr-[1px] will-change-transform"
          >
            <span
              data-portal-wordmark
              className="whitespace-nowrap font-brand text-[clamp(1.6rem,9vw,9rem)] font-bold leading-none tracking-[0.06em] text-white"
            >
              {WORDMARK_LEFT}
            </span>
          </div>
          <div
            data-portal-half-right
            className="flex w-1/2 justify-start pl-[1px] will-change-transform"
          >
            <span
              data-portal-wordmark
              className="whitespace-nowrap font-brand text-[clamp(1.6rem,9vw,9rem)] font-bold leading-none tracking-[0.06em] text-white"
            >
              {WORDMARK_RIGHT}
            </span>
          </div>
        </div>

        {/* Aksen bercahaya di garis sambungan */}
        <div
          data-portal-seam
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-accent shadow-[0_0_18px_4px_rgba(212,168,83,0.55)]"
        />

        {/* Petunjuk arah scroll, hilang begitu panel mulai bergerak */}
        <div data-portal-hint className="pointer-events-none absolute inset-x-0 bottom-10 z-30 flex justify-center">
          <span className="animate-fade-in text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Gulir
          </span>
        </div>

        {/* Bottom fade — warna akhir disamakan persis dengan stop terakhir
            gradient hero (`#F0EDE4`), supaya tidak ada garis sambungan tipis
            di bawah layar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-48 bg-gradient-to-t from-[#F0EDE4] to-transparent" />
      </div>
    </section>
  )
}