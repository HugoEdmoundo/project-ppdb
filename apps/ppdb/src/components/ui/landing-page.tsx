import { useEffect, useMemo, useRef, useState } from 'react'
import GlobeLogo from '@/components/ui/globe'
import { useSectionGlobe, type GlobeStop } from '@/components/ui/section-globe'
import { cn } from '@/lib/utils'

export interface GlobeSection {
  id: string
  badge?: string
  title: string
  subtitle?: string
  description: string
  align?: 'left' | 'center' | 'right'
  features?: { title: string; description: string }[]
  actions?: { label: string; variant: 'primary' | 'secondary'; onClick?: () => void }[]
}

export interface ScrollGlobeProps {
  sections: GlobeSection[]
  globeConfig?: {
    positions: { top: string; left: string; scale: number }[]
  }
  /** Key setting `favicon` — mark yang ditaruh di dalam bola. */
  markUrl?: string
  /** Key setting `logo` — wordmark yang diletakkan di samping bola. */
  wordmarkUrl?: string
  className?: string
}

const defaultGlobeConfig = {
  positions: [
    { top: '50%', left: '75%', scale: 1.4 }, // Hero: sisi kanan
    { top: '25%', left: '50%', scale: 0.9 }, // Innovation: atas, subtle
    { top: '15%', left: '90%', scale: 2 }, // Discovery: besar
    { top: '50%', left: '50%', scale: 1.8 }, // Future: tengah, backdrop
  ],
}

export function ScrollGlobe({
  sections,
  globeConfig = defaultGlobeConfig,
  markUrl,
  wordmarkUrl,
  className,
}: ScrollGlobeProps) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const animationFrameId = useRef<number | undefined>(undefined)

  const stops = useMemo<GlobeStop[]>(
    () =>
      globeConfig.positions.map((pos, index) => ({
        id: sections[index]?.id ?? `globe-stop-${index}`,
        top: pos.top,
        left: pos.left,
        scale: pos.scale,
        // Section terakhir diperlakukan sebagai backdrop, jadi lebih redup.
        opacity: index === sections.length - 1 ? 0.4 : 0.85,
      })),
    [globeConfig.positions, sections],
  )

  // Semua section di halaman ini setinggi layar, jadi tidak pernah "idle".
  const { transform, activeStop, activeIndex } = useSectionGlobe(stops, undefined, {
    fadeOutWhenIdle: false,
  })

  // Progress bar tetap pakai listener sendiri — hanya butuh posisi scroll global.
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      animationFrameId.current = requestAnimationFrame(() => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const progress = docHeight > 0 ? Math.min(Math.max(window.pageYOffset / docHeight, 0), 1) : 0
        setScrollProgress(progress)
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    animationFrameId.current = requestAnimationFrame(handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (animationFrameId.current !== undefined) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [])

  const activeSection = activeIndex >= 0 ? activeIndex : 0
  const hasPositions = stops.length > 0

  return (
    <div
      className={cn(
        'relative w-full max-w-screen overflow-x-hidden min-h-screen bg-background text-foreground',
        className,
      )}
    >
      {/* Progress bar */}
      <div className="fixed left-0 top-0 z-50 h-0.5 w-full bg-gradient-to-r from-border/20 via-border/40 to-border/20">
        <div
          className="h-full origin-left bg-gradient-to-r from-primary via-emerald-bright to-gold-accent"
          style={{
            transform: `scaleX(${scrollProgress})`,
            transition: 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* Navigasi section — disembunyikan di mobile */}
      <div className="fixed right-2 top-1/2 z-40 hidden -translate-y-1/2 sm:right-4 sm:block lg:right-8">
        <div className="relative">
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {sections.map((section, index) => (
              <div key={section.id} className="group relative">
                <div
                  className={cn(
                    'absolute right-5 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-background/95 px-2 py-1 text-xs font-medium shadow-xl backdrop-blur-md sm:right-6 sm:px-3 sm:py-1.5 sm:text-sm lg:right-8 lg:px-4 lg:py-2 lg:text-base',
                    activeSection === index ? 'animate-fadeOut' : 'opacity-0',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
                    <span>{section.badge || `Bagian ${index + 1}`}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  className={cn(
                    'relative h-2 w-2 rounded-full border-2 transition-all duration-300 hover:scale-125 sm:h-2.5 sm:w-2.5 lg:h-3 lg:w-3',
                    'before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300',
                    activeSection === index
                      ? 'border-primary bg-primary shadow-lg before:animate-ping before:bg-primary/20'
                      : 'border-muted-foreground/40 bg-transparent hover:border-primary/60 hover:bg-primary/10',
                  )}
                  aria-label={`Ke bagian ${section.badge || index + 1}`}
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-1/2 top-0 -z-10 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/20 to-transparent lg:w-0.5" />
        </div>
      </div>

      {/* Globe — posisi & skala berubah mengikuti section aktif */}
      {hasPositions && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-10 will-change-transform"
          style={{
            transform,
            opacity: activeStop?.opacity ?? 0.85,
            // Durasi & easing ditulis inline, bukan sebagai arbitrary value Tailwind:
            // utilitas `duration-*` dan `ease-*` ambigu (transition vs animation) sehingga
            // nilai arbitrary-nya dibuang oleh Tailwind v3.
            transitionProperty: 'transform, opacity',
            transitionDuration: '1600ms, 400ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.24, 1), ease-out',
          }}
        >
          <div className="scale-75 sm:scale-90 lg:scale-100">
            <GlobeLogo
              markUrl={markUrl}
              wordmarkUrl={wordmarkUrl}
              wordmarkSide={(activeStop?.leftNum ?? 0) > 55 ? 'left' : 'right'}
            />
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, index) => {
        // Hanya section pertama yang boleh jadi h1
        const Heading = index === 0 ? 'h1' : 'h2'
        return (
        <section
          key={section.id}
          id={section.id}
          ref={(el) => {
            sectionRefs.current[index] = el
          }}
          className={cn(
            'relative z-20 flex min-h-screen w-full max-w-full flex-col justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-20',
            section.align === 'center' && 'items-center text-center',
            section.align === 'right' && 'items-end text-right',
            section.align !== 'center' && section.align !== 'right' && 'items-start text-left',
          )}
        >
          <div
            className={cn(
              'w-full max-w-sm transition-all duration-700 will-change-transform sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
              section.align === 'center' ? 'mx-auto' : '',
              section.align === 'right' ? 'ml-auto' : '',
            )}
          >
            <Heading
              className={cn(
                'mb-6 font-bold leading-[1.1] tracking-tight sm:mb-8',
                index === 0
                  ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
                  : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
              )}
            >
              {section.subtitle ? (
                <div className="space-y-1 sm:space-y-2">
                  <div className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {section.title}
                  </div>
                  <div className="text-[0.65em] font-medium tracking-wider text-muted-foreground/90 sm:text-[0.7em]">
                    {section.subtitle}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                  {section.title}
                </div>
              )}
            </Heading>

            <div
              className={cn(
                'mb-8 text-base font-light leading-relaxed text-muted-foreground/80 sm:mb-10 sm:text-lg lg:text-xl',
                section.align === 'center' && 'mx-auto max-w-full text-center',
                section.align !== 'center' && 'max-w-full',
              )}
            >
              <p className="mb-3 sm:mb-4">{section.description}</p>
              {index === 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/60 sm:mt-6 sm:gap-4 sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                    <span>Informasi resmi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1 w-1 animate-pulse rounded-full bg-primary"
                      style={{ animationDelay: '0.5s' }}
                    />
                    <span>Gulir untuk menjelajah</span>
                  </div>
                </div>
              )}
            </div>

            {section.features && (
              <div className="mb-8 grid gap-3 sm:mb-10 sm:gap-4">
                {section.features.map((feature, featureIndex) => (
                  <div
                    key={feature.title}
                    className="group rounded-xl border bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 sm:rounded-xl sm:p-5 lg:p-6"
                    style={{ animationDelay: `${featureIndex * 0.1}s` }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60 transition-colors group-hover:bg-primary sm:mt-2 sm:h-2 sm:w-2" />
                      <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                        <h3 className="text-base font-semibold text-card-foreground sm:text-lg">
                          {feature.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground/80 sm:text-base">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.actions && (
              <div
                className={cn(
                  'flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-4',
                  section.align === 'center' && 'justify-center',
                  section.align === 'right' && 'justify-end',
                  (!section.align || section.align === 'left') && 'justify-start',
                )}
              >
                {section.actions.map((action, actionIndex) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      'group relative w-full rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-[0.98] sm:w-auto sm:rounded-xl sm:px-8 sm:py-4 sm:text-base',
                      action.variant === 'primary'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30'
                        : 'border-2 border-border/60 bg-background/50 text-foreground backdrop-blur-sm hover:border-primary/30 hover:bg-accent/50',
                    )}
                    style={{ animationDelay: `${actionIndex * 0.1 + 0.2}s` }}
                  >
                    <span className="relative z-10">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
        )
      })}
    </div>
  )
}

/** Halaman demo: 4 section dengan konten PPDB. */
export default function GlobeScrollDemo() {
  const demoSections: GlobeSection[] = [
    {
      id: 'hero',
      badge: 'Selamat Datang',
      title: 'Penerimaan Peserta',
      subtitle: 'Didik Baru',
      description:
        'Pesantren Tahfidz Qur’an dan Digital Ar-Rahman membuka pendaftaran peserta didik baru. Setiap santri belajar dengan ritme sendiri: tahfidz terstruktur, mata pelajaran tematik, dan literasi digital yang dekat dengan kehidupan sehari-hari.',
      align: 'left',
      actions: [
        { label: 'Daftar Sekarang', variant: 'primary' },
        { label: 'Lihat Syarat', variant: 'secondary' },
      ],
    },
    {
      id: 'inovasi',
      badge: 'Inovasi',
      title: 'Belajar',
      subtitle: 'Tematik & Digital',
      description:
        'Kurikulum memadukan tahfidz, ilmu pengetahuan terapan, dan literasi digital. Setiap peserta punya guru pembimbing, target hafalan harian, dan laporan perkembangan yang bisa dipantau orang tua dari mana saja.',
      align: 'center',
    },
    {
      id: 'program',
      badge: 'Program',
      title: 'Pilihan Jalur',
      subtitle: 'Sesuai Kebutuhan',
      description:
        'Pilihan jalur seleksi (Reguler, Prestasi, Tahfidz, dan Rapot) dibuka sesuai gelombang yang aktif. Halaman pendaftaran otomatis menyembunyikan opsi yang belum dibuka.',
      align: 'left',
      features: [
        {
          title: 'Tahfidz Intensif',
          description: 'Target hafalan harian dengan murojaah terjadwal dan pendampingan wali.',
        },
        {
          title: 'Digital Literacy',
          description: 'Pengenalan teknologi AI, keamanan data, dan etika digital sebagai bekal abad ke-21.',
        },
        {
          title: 'Life Skills',
          description: 'Kewirausahaan, pembiasaan ibadah, dan layanan masyarakat sebagai karakter.',
        },
      ],
    },
    {
      id: 'jadwal',
      badge: 'Jadwal',
      title: 'Daftar Gelombang',
      subtitle: 'Aktif',
      description:
        'Pendaftaran hanya bisa dilakukan ketika tepat satu Periode dan satu Gelombang berstatus aktif. Biaya pendaftaran tahap pertama mengikuti konfigurasi gelombang yang sedang berjalan.',
      align: 'center',
    },
  ]

  return (
    <ScrollGlobe
      sections={demoSections}
      className="bg-gradient-to-br from-background via-muted/20 to-background"
    />
  )
}
