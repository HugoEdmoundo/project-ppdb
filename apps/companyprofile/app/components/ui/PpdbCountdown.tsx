'use client'

import { useEffect, useState } from 'react'

import {
  getCountdownParts,
  needsSecondTick,
  parseApiDate,
  type ActivePpdbWave,
  type CountdownParts,
} from '@/app/lib/ppdb'

const UNITS: { key: keyof CountdownParts; label: string }[] = [
  { key: 'months', label: 'Bulan' },
  { key: 'days', label: 'Hari' },
  { key: 'hours', label: 'Jam' },
  { key: 'minutes', label: 'Menit' },
  { key: 'seconds', label: 'Detik' },
]

/**
 * `null` = belum dihitung (render pertama, server & client sama supaya tidak
 * hydration mismatch). `tick: null` = target sudah terlewat.
 */
type State = { tick: CountdownParts | null } | null

function useCountdown(target: Date) {
  const [state, setState] = useState<State>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const now = Date.now()
      setState({ tick: getCountdownParts(target, now) })
      // Tier "Bulan + Hari" tidak berubah tiap detik, jadi cukup 1 menit.
      timer = setTimeout(tick, needsSecondTick(target, now) ? 1000 : 60_000)
    }
    // Hitung pertama lewat timer supaya tidak setState sinkron di body effect.
    timer = setTimeout(tick, 0)

    return () => clearTimeout(timer)
  }, [target])

  return state
}

function CountdownBlock({
  label,
  date,
  variant,
}: {
  label: string
  date: Date
  variant: 'open' | 'close'
}) {
  const state = useCountdown(date)
  const tone =
    variant === 'open'
      ? 'text-[var(--color-gold-light)]'
      : 'text-[var(--color-emerald-bright)]'

  return (
    <div className="text-center">
      <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/50 mb-2">
        {label}
      </p>
      {state === null ? (
        // Placeholder setinggi baris angka supaya tidak ada lompatan layout.
        <div className="invisible" aria-hidden>
          <div className="flex justify-center gap-3 sm:gap-5 md:gap-8">
            {UNITS.slice(1, 4).map((u) => (
              <div key={u.key}>
                <div className="font-[var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums leading-none">
                  {'00'}
                </div>
                <div className="text-[10px] sm:text-xs font-[var(--font-heading)] uppercase tracking-widest text-white/50 mt-1">
                  {u.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : state.tick === null ? (
        <p className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-white/80">
          Sedang berlangsung
        </p>
      ) : (
        <div className="flex justify-center gap-3 sm:gap-5 md:gap-8">
          {UNITS.filter((u) => state.tick![u.key] !== null).map((u) => (
            <div key={u.key}>
              <div
                className={`font-[var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums leading-none ${tone}`}
              >
                {String(state.tick![u.key]).padStart(2, '0')}
              </div>
              <div className="text-[10px] sm:text-xs font-[var(--font-heading)] uppercase tracking-widest text-white/50 mt-1">
                {u.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Dua hitung mundur dari data gelombang PPDB aktif: satu ke tanggal dibuka,
 * satu ke batas akhir. Unit menyesuaikan jarak waktu (lihat `getCountdownParts`).
 * Render `null` kalau belum ada gelombang aktif — tidak ada angka karangan.
 */
export default function PpdbCountdown({ wave }: { wave: ActivePpdbWave | null }) {
  if (!wave) return null

  const start = parseApiDate(wave.registration_start_date)
  const end = parseApiDate(wave.registration_end_date)
  if (!start && !end) return null

  return (
    <div className="flex flex-col sm:flex-row sm:justify-center gap-8 sm:gap-12 mb-8 sm:mb-10">
      {start && (
        <CountdownBlock
          key={start.getTime()}
          label="Pendaftaran dibuka"
          date={start}
          variant="open"
        />
      )}
      {end && (
        <CountdownBlock
          key={end.getTime()}
          label="Batas akhir pendaftaran"
          date={end}
          variant="close"
        />
      )}
    </div>
  )
}
