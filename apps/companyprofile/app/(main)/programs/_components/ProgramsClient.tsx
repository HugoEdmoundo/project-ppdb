'use client'

import { useRef, useEffect, useState } from 'react'
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
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    document.title = 'Program Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

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

      <section ref={sectionRef} className="py-12 sm:py-16 md:py-24 bg-[var(--bg)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hover Tabs Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {programs.map((prog, idx) => {
              const TabIcon = iconMap[prog.icon] || BookOpen
              const isActive = activeIndex === idx
              return (
                <button
                  key={prog.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-program-tab"
                      className="absolute inset-0 bg-[var(--accent)] rounded-full shadow-md"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <TabIcon className="w-4 h-4" />
                    {prog.content?.title || 'Program'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Scrollable Content Container */}
          <div className="glass-card rounded-3xl border border-[var(--color-border)] shadow-xl overflow-hidden flex flex-col md:flex-row h-[75vh] min-h-[500px]">
            
            {/* Left Column: Image Banner */}
            <div className="w-full md:w-2/5 h-56 md:h-full relative bg-[var(--bg-secondary)] flex-shrink-0 border-b md:border-b-0 md:border-r border-[var(--color-border)] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeProg.id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
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

            {/* Right Column: Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 relative bg-[var(--bg)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`content-${activeProg.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  
                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-border)] pb-6">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                      <Clock className="w-5 h-5 text-[var(--accent)]" />
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Durasi</div>
                        <div className="text-sm font-[var(--font-heading)] font-bold">{info.duration || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                      <Layers className="w-5 h-5 text-[var(--accent)]" />
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Tingkat</div>
                        <div className="text-sm font-[var(--font-heading)] font-bold">{info.level || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
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

                  {/* Highlights */}
                  {info.highlights && info.highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">Keunggulan Utama</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {info.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                            <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text)] font-medium">{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Curriculum */}
                  {info.curriculum && info.curriculum.length > 0 && (
                    <div>
                      <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">Struktur Kurikulum</h3>
                      <div className="space-y-2">
                        {info.curriculum.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)] transition-colors hover:border-[var(--accent)]/30">
                            <div className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <span className="text-sm text-[var(--text)] font-medium">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Outcomes */}
                  {info.outcomes && info.outcomes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-[var(--font-display)] font-bold mb-4 text-[var(--text)]">Target Pencapaian</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {info.outcomes.map((o, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
                            <Award className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--accent)] font-semibold">{o}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Call to Actions */}
                  <div className="pt-8 mt-8 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4">
                    <Link href={`/programs/${activeProg.slug}`} className="btn-primary">
                      Share Link Khusus
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                    <a href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      Daftar Sekarang
                    </a>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
            
          </div>
        </div>
      </section>
    </>
  )
}
