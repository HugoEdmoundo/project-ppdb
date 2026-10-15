'use client'

import { useId } from 'react'

interface ShapeDividerProps {
  /** Warna section SEBELUMnya. Stop 0% memakai nilai persis ini supaya tepi
   *  gelombang menyatu tanpa garis sambungan. */
  fill?: string
  /** Warna yang dicampur ke ujung gelombang. */
  tint?: string
  /** Berapa jauh `tint` dicampur, 0–1. Makin besar makin kontras dengan
   *  section yang hosting. 0.14 di atas section terang, 0.20 di atas
   *  section gelap — angka yang lebih kecil kontrasnya jatuh ke ~1.13:1. */
  tintStrength?: number
}

/**
 * Wave pembatas section. Isi `--bg` vs `--bg-secondary` cuma berbeda 1.07:1,
 * jadi warna polos praktis tidak terbaca. Shapes ini karena itu memakai gradien:
 * mulai persis dari warna section sebelumnya, lalu makin dicampur `tint`
 * ke ujung bawah gelombang (kontras jadi ~1.28:1).
 */
export default function ShapeDivider({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: ShapeDividerProps) {
  // `useId()` di React 19 sudah menghasilkan ident CSS yang valid (`_R_x_`),
  // jadi aman dipakai langsung sebagai fragment `url(#...)`.
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
        className="relative block w-[calc(100%+1.3px)] h-[137px]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* `stopColor` lewat style, bukan atribut: `var()` di presentation
                attribute tidak seragam di semua browser, sedangkan inline style
                pasti resolve — sama seperti `style={{ fill }}` yang dipakai
                versi sebelum gradien. */}
            <stop offset="0%" style={{ stopColor: fill }} />
            <stop offset="45%" style={{ stopColor: mix(0.6) }} />
            <stop offset="100%" style={{ stopColor: mix(1) }} />
          </linearGradient>
        </defs>
        <path
          d="M0,0H1200V104C1060,104 962,64 762,56C556,47 358,97 0,88Z"
          style={{ fill: `url(#${gradientId})` }}
        />
      </svg>
    </div>
  )
}
