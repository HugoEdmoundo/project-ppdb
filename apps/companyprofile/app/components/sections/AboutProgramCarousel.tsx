'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import SectionTitle from '@/app/components/ui/SectionTitle'

interface ProgramCard {
  image: string
  category: string
  title: string
}

const CARD_WIDTH = 356
const CARD_GAP = 24
const CARD_HEIGHT = 480
const STEP = CARD_WIDTH + CARD_GAP

const programs: ProgramCard[] = [
  {
    image: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=1600&auto=format&fit=crop',
    category: 'TAHFIDZ',
    title: 'Tahfizh 30 Juz',
  },
  {
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1600&auto=format&fit=crop',
    category: 'TAHSIN',
    title: 'Tahsin & Qiraat',
  },
  {
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1600&auto=format&fit=crop',
    category: 'DIGITAL',
    title: 'Coding & Programming',
  },
  {
    image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1600&auto=format&fit=crop',
    category: 'DIGITAL',
    title: 'AI & Robotic',
  },
  {
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1600&auto=format&fit=crop',
    category: 'BAHASA',
    title: 'Arabic & English',
  },
  {
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop',
    category: 'KARAKTER',
    title: 'Leadership Camp',
  },
  {
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1600&auto=format&fit=crop',
    category: 'OLAHRAGA',
    title: 'Santri Sports',
  },
  {
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=1600&auto=format&fit=crop',
    category: 'SENI',
    title: 'Kaligrafi & Seni',
  },
]

function ProgramCardView({ p, index }: { p: ProgramCard; index: number }) {
  return (
    <motion.div
      key={index}
      whileHover={{ scale: 1.05, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex-shrink-0 cursor-pointer relative overflow-hidden"
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      }}
    >
      <Image
        src={p.image}
        alt={p.title}
        fill
        sizes={`${CARD_WIDTH}px`}
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%)',
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]"
          style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)' }}
        >
          {p.category}
        </span>
        <h3 className="font-[var(--font-display)] text-2xl font-semibold text-white leading-tight">
          {p.title}
        </h3>
      </div>
    </motion.div>
  )
}

export default function AboutProgramCarousel() {
  const reduced = useReducedMotion()
  const distance = programs.length * STEP
  const duration = programs.length * 3

  return (
    <section className="relative py-16 sm:py-20 md:py-28 bg-[var(--bg-secondary)] overflow-hidden">
      <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 sm:mb-14 relative z-10">
        <SectionTitle
          center
          badge="PROGRAM UNGGULAN"
          title="Tahfidz & Digital dalam Satu Kurikulum"
        />
        <p className="text-center text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto text-sm">
          {'Perpaduan hafalan Al-Quran dengan kompetensi teknologi, bahasa, dan kepemimpinan — membentuk santri unggul sejak hari pertama.'}
        </p>
      </div>

      {/* Edge fade overlays */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-[120px]"
        style={{ background: 'linear-gradient(90deg, var(--bg-secondary) 0%, transparent 100%)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-[120px]"
        style={{ background: 'linear-gradient(270deg, var(--bg-secondary) 0%, transparent 100%)' }}
      />

      {reduced ? (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((p, i) => (
            <ProgramCardView key={i} p={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="relative z-10 w-full overflow-hidden">
          <motion.div
            className="flex items-center"
            animate={{ x: [0, -distance] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration,
                ease: 'linear',
              },
            }}
            style={{ gap: CARD_GAP, paddingLeft: CARD_GAP, width: 'max-content' }}
          >
            {[...programs, ...programs].map((p, i) => (
              <ProgramCardView key={i} p={p} index={i} />
            ))}
          </motion.div>
        </div>
      )}
    </section>
  )
}
