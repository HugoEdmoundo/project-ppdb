'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { GalleryItem } from '@/app/lib/types'
import { X, Play } from 'lucide-react'

const categories = [
  { key: 'all', idn: 'Semua' },
  { key: 'campus', idn: 'Pesantren' },
  { key: 'academic', idn: 'Akademik' },
  { key: 'sports', idn: 'Olahraga' },
  { key: 'arts', idn: 'Seni' },
  { key: 'events', idn: 'Acara' },
]

function BodyLock({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const scrollY = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return null
}

function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <>
      <BodyLock onClose={onClose} />
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.92) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
          <button
            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all z-10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            className="w-full h-full rounded-xl shadow-2xl"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.93)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <BodyLock onClose={onClose} />
      {children}
    </motion.div>
  )
}

export default function GalleryClient({ gallery }: { gallery: GalleryItem[] }) {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [videoModal, setVideoModal] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const filtered = filter === 'all' ? gallery : gallery.filter((g) => g.category === filter)

  const closeAll = () => { setSelected(null); setVideoModal(null) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
      if (e.key === 'ArrowRight' && selected) {
        const idx = filtered.findIndex((g) => g.id === selected.id)
        if (idx < filtered.length - 1) setSelected(filtered[idx + 1])
      }
      if (e.key === 'ArrowLeft' && selected) {
        const idx = filtered.findIndex((g) => g.id === selected.id)
        if (idx > 0) setSelected(filtered[idx - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, filtered])

  useEffect(() => {
    document.title = 'Galeri | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.06 })

  const selectedIndex = selected ? filtered.findIndex((g) => g.id === selected.id) : -1

  return (
    <>
      <PageHeader
        title="Galeri"
        subtitle="Jelajahi momen dan kenangan dari seluruh pesantren dan komunitas kami"
        badge="MOMEN"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat.key
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--accent)]'
                }`}
                aria-label={`Filter ${cat.idn}`}
                aria-pressed={filter === cat.key}
              >
                {cat.idn}
              </button>
            ))}
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {filtered.map((item) => {
              const info = item.content ?? {}
              return (
                <div
                  key={item.id}
                  className="break-inside-avoid img-overlay rounded-2xl shadow-sm cursor-pointer"
                  onClick={() => setSelected(item)}
                >
                  <div className="relative w-full">
                    {item.image ? <Image src={item.image} alt={info.title || ''} width={800} height={600} className="w-full h-auto object-cover" loading="lazy" /> : <div className="w-full h-full bg-[var(--bg-secondary)]" />}
                  </div>
                  <div className="overlay">
                    <h4 className="text-white text-base font-bold font-[var(--font-heading)]">{info.title}</h4>
                    <span className="text-white/60 text-xs uppercase tracking-wider">{item.category}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 sm:mt-16 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-6">
                <Play className="w-6 sm:w-8 h-6 sm:h-8 text-[var(--accent)]" />
                <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold">
                  Video Kehidupan Pesantren
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 max-w-lg">
                Ikuti tur virtual dan lihat pesantren, fasilitas, dan kehidupan santri kami.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'D0ylXygFwbc', title: 'Sorotan Kampus' },
                  { id: 'CthN0Nj8eZ4', title: 'Kehidupan Santri' },
                ].map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setVideoModal(video.id)}
                    className="rounded-xl overflow-hidden shadow-md bg-[var(--bg)] text-left w-full group cursor-pointer"
                  >
                    <div className="aspect-[16/9] relative">
                      <Image
                        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-all">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-[var(--accent)] ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold font-[var(--font-heading)] truncate">{video.title}</p>
                      <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-0.5">YouTube</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {videoModal && (
        <VideoModal videoId={videoModal} onClose={() => setVideoModal(null)} />
      )}

      <AnimatePresence>
        {selected && (
          <ModalOverlay key="gallery-lightbox" onClose={() => setSelected(null)}>
            <div 
              className="w-[95vw] max-w-4xl md:max-w-5xl flex flex-col items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[75vh] bg-black/40 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                
                <div className="absolute inset-0 p-2 sm:p-4 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selected.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      {selected.image ? (
                        <Image
                          src={selected.image}
                          alt={selected.content?.title || ''}
                          fill
                          style={{ objectFit: 'contain' }}
                          className="select-none pointer-events-none"
                          draggable={false}
                          sizes="(max-width: 768px) 95vw, 85vw"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-2xl">No Image</div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div 
                  className="absolute inset-0 z-10 md:hidden bg-transparent"
                  onTouchStart={(e) => {
                    const startX = e.touches[0].clientX
                    const currentEl = e.currentTarget
                    const handler = (ev: TouchEvent) => {
                      const diff = ev.changedTouches[0].clientX - startX
                      if (Math.abs(diff) > 50) {
                        if (diff > 0 && selectedIndex > 0) setSelected(filtered[selectedIndex - 1])
                        else if (diff < 0 && selectedIndex < filtered.length - 1) setSelected(filtered[selectedIndex + 1])
                      }
                      currentEl.removeEventListener('touchend', handler)
                    }
                    currentEl.addEventListener('touchend', handler, { passive: true })
                  }}
                />

                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium z-20">
                  {selectedIndex + 1} / {filtered.length}
                </div>

                <button
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all z-20"
                  onClick={() => setSelected(null)}
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>

                <div className="absolute bottom-4 right-4 flex gap-2 z-20 hidden sm:flex">
                  {filtered.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(filtered[i])}
                      className={`rounded-full transition-all duration-300 ${
                        i === selectedIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 text-center max-w-2xl px-4">
                <p className="text-white text-sm sm:text-base font-medium tracking-wide drop-shadow-md">
                  {selected.content?.title}
                </p>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  )
}
