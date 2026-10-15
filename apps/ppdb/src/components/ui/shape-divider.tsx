import { useId } from 'react'

/**
 * Batas antar section untuk halaman publik.
 *
 * Kenapa path-nya hanya bezier, tanpa perintah busur `A`: dengan
 * `preserveAspectRatio="none"` seluruh viewBox diregang horizontal mengikuti
 * lebar layar. Busur dan sudut tajam meregang jadi lekukan bersudut yang
 * terlihat seperti salah render — di footer, versi segitiga itu
 * memunculkan puncak tajam di tengah. Kurva bezier yang mulus tetap mulus ditulis
 * dalam arah horizontal, sehingga bentuknya sama rapi di 1024px maupun di 2560px.
 *
 * Kenapa perlu gradien: dua token ivory yang dipakai halaman publik
 * (`--bg` #F6F4EE dan turunannya) hanya berbeda sekitar 1.07:1, di bawah
 * ambang mata. Warna polos di batas section praktis tidak terlihat, jadi
 * fill berupa gradien: tepi atas memakai warna section sebelumnya secara
 * persis (biar sambungan tetap mulus) lalu dicampur `tint` ke ujung bawah.
 *
 * Warna diisi sebagai nilai utuh, bukan komponen HSL, karena `color-mix()`
 * tidak bisa membaca `--primary: 153 61% 26%` tanpa `hsl()`. Karena itu
 * index.css menyediakan alias `--bg`, `--bg-secondary`, `--color-emerald`.
 */

interface DividerProps {
  /** Warna section SEBELUMnya. Stop 0% memakai nilai persis ini supaya tepi
   *  gelombang menyatu tanpa garis sambungan. */
  fill?: string
  /** Warna yang dicampur ke ujung gelombang. */
  tint?: string
  /**
   * Berapa jauh `tint` dicampur, 0–1. Makin besar makin kontras dengan
   * section yang hosting. Pakai 0.14 di atas section terang dan 0.20 di
   *  atas section gelap — angka yang lebih kecil kontrasnya jatuh ke 1.13:1.
   */
  tintStrength?: number
}

function useDividerGradient(fill: string, tint: string, tintStrength: number) {
  const gradientId = useId()
  const pct = Math.min(1, Math.max(0, tintStrength))
  const mix = (amount: number) =>
    `color-mix(in srgb, ${tint} ${Math.round(pct * amount * 100)}%, ${fill})`

  return { gradientId, stops: [fill, mix(0.6), mix(1)] as const }
}

function GradientStops({
  gradientId,
  stops,
}: {
  gradientId: string
  stops: readonly [string, string, string]
}) {
  return (
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        {/* stopColor lewat style, bukan atribut: var() di presentation
            attribute tidak seragam di semua browser. */}
        <stop offset="0%" style={{ stopColor: stops[0] }} />
        <stop offset="45%" style={{ stopColor: stops[1] }} />
        <stop offset="100%" style={{ stopColor: stops[2] }} />
      </linearGradient>
    </defs>
  )
}

/**
 * Gelombang lebar setinggi 137px untuk batas antar section.
 *
 * Satu gelombang tunggal yang turun dari kanan lalu naik lagi ke kiri, dengan
 * tunggal, dengan semua titik sambungan dikendalikan horizontal. Kedua ujungnya
 * dijaga tetap datar supaya tepi yang menyentuh sisi layar tidak bersudut.
 */
export function ShapeDivider({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: DividerProps) {
  const { gradientId, stops } = useDividerGradient(fill, tint, tintStrength)

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden leading-[0]">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block h-[137px] w-[calc(100%+1.3px)]"
      >
        <GradientStops gradientId={gradientId} stops={stops} />
        <path
          d="M0,0H1200V104C1060,104 962,64 762,56C556,47 358,97 0,88Z"
          style={{ fill: `url(#${gradientId})` }}
        />
      </svg>
    </div>
  )
}

/**
 * Sapuan diagonal mulus setinggi 58px, untuk batas tipis seperti di atas
 * footer.
 *
 * Versi sebelumnya berupa segitiga `L0 0 892 114 1200 0`.  * horizontal, sudut lancipnya jadi lekukan tajam yang terbaca sebagai cacat,
 * bukan bentuk yang disengaja. Sekarang tepi bawahnya satu kurva bezier
 * tunggal: tipis di kiri, tebal di kanan, tanpa titik sudut sama sekali.
 */
export function ShapeDividerDiagonal({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: DividerProps) {
  const { gradientId, stops } = useDividerGradient(fill, tint, tintStrength)

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden leading-[0]">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block h-[58px] w-[calc(100%+1.3px)]"
      >
        <GradientStops gradientId={gradientId} stops={stops} />
        <path d="M0,0H1200V120C900,120 560,62 0,44Z" style={{ fill: `url(#${gradientId})` }} />
      </svg>
    </div>
  )
}
