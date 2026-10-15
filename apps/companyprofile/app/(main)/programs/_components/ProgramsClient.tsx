'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Program } from '@/app/lib/types'
import { BookOpen, Cpu, Globe, Award, Clock, Layers, Check, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  'language': Globe,
  'users': Award,
}

export default function ProgramsClient({ programs }: { programs: Program[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    document.title = 'Program Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  const count = programs?.length ?? 0

  // Panah kiri/kanan untuk pindah tab. Tanpa ini, satu-satunya cara pindah
  // program adalah hover — yang mustahil dilakukan dengan keyboard, jadi tab
  // ini praktis tidak bisa dipakai tanpa mouse.
  const onTabKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      e.preventDefault()
      const next = e.key === 'ArrowRight' ? (idx + 1) % count : (idx - 1 + count) % count
      setActiveIndex(next)
      tabRefs.current[next]?.focus()
    },
    [count],
  )

  if (!programs || programs.length === 0) return null

  const activeProg = programs[activeIndex]
  const info = activeProg.content ?? {}
  const Icon = iconMap[activeProg.icon] || BookOpen

  return (
    <>
      <PageHeader
        title="Program Kami"
        subtitle="Program pendidikan komprehensif yang mengintegrasikan keunggulan Al-Quran dengan inovasi digital"
        badge="KEUNGGULAN AKADEMIK"
      />

      <section ref={sectionRef} className="py-12 sm:py-16 md:py-20 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Tab program.
              Bentuk segmented bar, bukan pil terpisah yang melayang:
              keempatnya duduk di dalam satu track yang warnanya sekeluarga
              dengan tombol (bg-secondary + border), jadi terbaca sebagai satu
              kendali utuh. Hanya segmen terpilih yang memakai warna accent —
              kalau semua tombol punya warna sendiri, baris ini terlihat
              seperti empat tombol yang kebetulan berdekatan, bukan satu
              sakelar.

              Lebar penuh di mobile supaya tidak membungkus jadi dua baris,
              ikut lebar isinya di desktop. */}
          <div
            role="tablist"
            aria-label="Daftar program"
            className="mb-8 flex w-full flex-wrap justify-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--bg-secondary)] p-1.5 sm:mb-10 sm:w-auto sm:flex-nowrap sm:justify-start"
          >
            {programs.map((prog, idx) => {
              const TabIcon = iconMap[prog.icon] || BookOpen
              const isActive = activeIndex === idx
              return (
                <button
                  key={prog.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="panel-program"
                  tabIndex={isActive ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  onKeyDown={(e) => onTabKeyDown(e, idx)}
                  className={`relative flex-1 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors duration-300 sm:flex-none sm:px-5 ${
                    isActive
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-program-tab"
                      className="absolute inset-0 rounded-full bg-[var(--accent)] shadow-md"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                    <TabIcon className="w-4 h-4 shrink-0" />
                    {prog.content?.title || 'Program'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Kolom kiri sticky, tinggi penuh viewport. Konten di kanan mengalir
              mengikuti scroll halaman — bukan panel scroll sendiri. Versi
              lama memakai `h-[75vh]` + `overflow-y-auto`, jadi ada dua
              scroll bertumpuk: halaman dan panel. Di HP hasilnya conten terputus
              di tengah kartu dan tidak jelas masih bisa digulir atau tidak.
              Sticky membuat gambar tetap terlihat saat konten panjang dibaca,
              tanpa perlu scroll kedua. */}
          <div
            id="panel-program"
            role="tabpanel"
            aria-live="polite"
            className="glass-card grid overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-xl md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            {/* Banner gambar */}
            <div className="relative h-56 shrink-0 overflow-hidden bg-[var(--bg-secondary)] sm:h-72 md:h-auto md:min-h-[32rem] md:sticky md:top-24 md:self-start">
              <AnimatePresence initial={false}>
                <motion.div
                  key={activeProg.id}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  // Tanpa `mode="wait"`: exit dan enter tumpang tindih, jadi
                  // pindah tab terasa ~0.35 detik. Versi lama memakai
                  // mode="wait" dengan exit 0.4s + enter 0.4s, jadi ada
                  // ~0.8 detik layar kosong di setiap perpindahan.
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {activeProg.image ? (
                    <Image
                      src={activeProg.image}
                      alt={info.title || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-3 bg-[var(--bg-secondary)]">
                      <Icon className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-[var(--font-display)] font-bold text-white leading-tight">
                      {info.title}
                    </h2>
                    {info.tagline && <p className="text-white/80 mt-2 text-sm">{info.tagline}</p>}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Konten — tinggi mengikuti isinya sendiri */}
            <div className="relative bg-[var(--bg)] p-6 sm:p-8 md:p-10">
              {/* Sengaja tanpa AnimatePresence. Dengan AnimatePresence, konten
                  lama harus selesai animate keluar sebelum yang baru masuk;
                  karena blok ini berada di normal flow (bukan absolute),
                  keduanya akan menumpuk dan menggeser tata letak. Cukup
                  remount lewat `key` + animasi masuk: satu langkah, tanpa
                  jeda, dan tinggi kartu langsung mengikuti isi program aktif. */}
              <motion.div
                key={`content-${activeProg.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                {/* Ringkasan */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-b border-[var(--color-border)] pb-6">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                    <Clock className="w-5 h-5 text-[var(--accent)]" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Durasi
                      </div>
                      <div className="text-sm font-[var(--font-heading)] font-bold">
                        {info.duration || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                    <Layers className="w-5 h-5 text-[var(--accent)]" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                        Tingkat
                      </div>
                      <div className="text-sm font-[var(--font-heading)] font-bold">
                        {info.level || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {info.desc && (
                  <div>
                    <h3 className="text-lg font-[var(--font-display)] font-bold mb-3 text-[var(--text)]">
                      Gambaran Program
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed whitespace-pre-line">
                      {info.desc}
                    </p>
                  </div>
                )}

                {info.highlights && info.highlights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">
                      Keunggulan Utama
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {info.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]"
                        >
                          <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-[var(--text)] font-medium">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {info.curriculum && info.curriculum.length > 0 && (
                  <div>
                    <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">
                      Struktur Kurikulum
                    </h3>
                    <div className="space-y-2">
                      {info.curriculum.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] transition-colors hover:border-[var(--accent)]/30"
                        >
                          <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-sm text-[var(--text)] font-medium">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {info.outcomes && info.outcomes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">
                      Target Pencapaian
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {info.outcomes.map((o, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20"
                        >
                          <Award className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-[var(--accent)] font-semibold">{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-8 mt-8 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4">
                  <Link href={`/programs/${activeProg.slug}`} className="btn-primary">
                    Share Link Khusus
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  <a
                    href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                  >
                    Daftar Sekarang
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}