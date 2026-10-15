'use client'

import { useId } from 'react'

interface ShapeDividerDiagonalProps {
  /** Warna section SEBELUMnya. Stop 0% memakai nilai persis ini. */
  fill?: string
  /** Warna yang dicampur ke ujung gelombang. */
  tint?: string
  /** Berapa jauh `tint` dicampur, 0–1. Lihat ShapeDivider. */
  tintStrength?: number
}

/**
 * Tear-off diagonal tipis (58px) untuk batas yang butuh aksen tear-off, bukan
 * wave besar — di atas Footer dan hero 3D PPDB. Gradien dengan alasan yang sama
 * seperti ShapeDivider: warna polos di antara dua ivory nyaris tak terlihat.
 */
export default function ShapeDividerDiagonal({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: ShapeDividerDiagonalProps) {
  // `useId()` di React 19 sudah menghasilkan ident CSS yang valid (`_R_x_`).
  const gradientId = useId()
  const pct = Math.min(1, Math.max(0, tintStrength))
  const mix = (amount: number) =>
    `color-mix(in srgb, ${tint} ${Math.round(pct * amount * 100)}%, ${fill})`

  return (
    <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] z-0 pointer-events-none">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block w-[calc(100%+1.3px)] h-[58px]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* `stopColor` lewat style, bukan atribut — lihat ShapeDivider. */}
            <stop offset="0%" style={{ stopColor: fill }} />
            <stop offset="45%" style={{ stopColor: mix(0.6) }} />
            <stop offset="100%" style={{ stopColor: mix(1) }} />
          </linearGradient>
        </defs>
        <path d="M0,0H1200V120C900,120 560,62 0,44Z" style={{ fill: `url(#${gradientId})` }} />
      </svg>
    </div>
  )
}
