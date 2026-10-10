import { useId } from 'react'

/**
 * Berisi dua bentuk wave pembatas section, hasil port dari
 * apps/companyprofile/app/components/ui/.
 *
 * Kenapa perlu gradien: dua token ivory yang dipakai halaman publik
 * (`--bg` #F6F4EE dan turunannya) hanya berbeda sekitar 1.07:1, di bawah
 * ambang mata. Warna polos di batas section praktis tidak terlihat, jadi
 * fill berupa gradien: tepi atas memakai warna section sebelumnya secara
 * persis (biar sambungan tetap mulus) laludicampur `tint` ke ujung bawah.
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
   * atas section gelap — angka yang lebih kecil kontrasnya jatuh ke 1.13:1.
   */
  tintStrength?: number
}

/** Wave lembut setinggi 137px, untuk batas antar section. */
export function ShapeDivider({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: DividerProps) {
  const gradientId = useId()
  const pct = Math.min(1, Math.max(0, tintStrength))
  const mix = (amount: number) =>
    `color-mix(in srgb, ${tint} ${Math.round(pct * amount * 100)}%, ${fill})`

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden leading-[0]">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block h-[137px] w-[calc(100%+1.3px)]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {/* stopColor lewat style, bukan atribut: var() di presentation
                attribute tidak seragam di semua browser. */}
            <stop offset="0%" style={{ stopColor: fill }} />
            <stop offset="45%" style={{ stopColor: mix(0.6) }} />
            <stop offset="100%" style={{ stopColor: mix(1) }} />
          </linearGradient>
        </defs>
        <path
          d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
          style={{ fill: `url(#${gradientId})` }}
        />
      </svg>
    </div>
  )
}

/** Tear-off diagonal tipis setinggi 58px, untuk batas yang lebih halus. */
export function ShapeDividerDiagonal({
  fill = 'var(--bg)',
  tint = 'var(--color-emerald)',
  tintStrength = 0.14,
}: DividerProps) {
  const gradientId = useId()
  const pct = Math.min(1, Math.max(0, tintStrength))
  const mix = (amount: number) =>
    `color-mix(in srgb, ${tint} ${Math.round(pct * amount * 100)}%, ${fill})`

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden leading-[0]">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block h-[58px] w-[calc(100%+1.3px)]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: fill }} />
            <stop offset="45%" style={{ stopColor: mix(0.6) }} />
            <stop offset="100%" style={{ stopColor: mix(1) }} />
          </linearGradient>
        </defs>
        <path d="M1200 0L0 0 892.25 114.72 1200 0z" style={{ fill: `url(#${gradientId})` }} />
      </svg>
    </div>
  )
}