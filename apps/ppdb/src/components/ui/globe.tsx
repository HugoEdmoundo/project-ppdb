import { cn } from '@/lib/utils'

/**
 * GlobeLogo — bola "dot-sphere" murni CSS, di tengahnya berisi mark logo.
 *
 * Kenapa bukan gambar 2:1 seperti globe tekstur asli? Karena tekstur globe di-scroll
 * dengan `background-position`, yang hanya bekerja untuk gambar equirectangular yang
 * seam-nya nyambung. Logo adalah wordmark/mark, bukan peta bumi — tidak bisa di-scroll
 * tanpa terlihat geser keluar dari bola.
 *
 * Semua aset diambil dinamis dari API (aturan dynamic branding, tidak ada logo statis):
 * - `markUrl`      → key setting `favicon` (canvas 1:1, muat di dalam bola)
 * - `wordmarkUrl`  → key setting `logo` (rasio 2.61:1, diletakkan di samping bola)
 *
 * Seluruh komponen ini dekoratif, jadi diberi `aria-hidden` di level akar.
 * Palet diambil dari brand token PPDB (bukan warna hardcode): emerald-primary
 * #1A6B47 + gold-dark #B88F3D.
 */

const EMERALD = '26, 107, 71'
const GOLD = '184, 143, 61'

export interface GlobeLogoProps {
  /** Key setting `favicon` — mark/bentuk perseginya. Kalau kosong, tampilkan fallback 'A'. */
  markUrl?: string
  /** Key setting `logo` — wordmark lebar, diletakkan di samping bola. */
  wordmarkUrl?: string
  /** Sisi penempatan wordmark relatif terhadap bola. */
  wordmarkSide?: 'left' | 'right'
  className?: string
}

function GlobeLogo({ markUrl, wordmarkUrl, wordmarkSide = 'left', className }: GlobeLogoProps) {
  return (
    <div aria-hidden="true" className={cn('relative size-[250px] shrink-0', className)}>
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, rgba(${EMERALD}, 0.30) 0%, rgba(${GOLD}, 0.14) 45%, transparent 70%)`,
        }}
      />

      {/* Orbit rings — ilusi 3D tanpa WebGL */}
      <div
        aria-hidden="true"
        className="globe-motion absolute left-1/2 top-1/2 size-[286px] rounded-full border"
        style={{
          transform: 'translate(-50%, -50%) rotateX(74deg)',
          borderColor: `rgba(${EMERALD}, 0.35)`,
          animation: 'globeOrbit 18s linear infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="globe-motion absolute left-1/2 top-1/2 size-[262px] rounded-full border border-dashed"
        style={{
          transform: 'translate(-50%, -50%) rotateX(64deg)',
          borderColor: `rgba(${GOLD}, 0.30)`,
          animation: 'globeOrbitAlt 26s linear infinite',
        }}
      />

      {/* Dot sphere — dua lapisan titik berputar berlawanan arah (efek parallax) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          maskImage: 'radial-gradient(circle at 50% 50%, black 42%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 42%, transparent 72%)',
          background: `radial-gradient(circle at 34% 30%, rgba(${EMERALD}, 0.16), rgba(${GOLD}, 0.10) 55%, transparent 78%)`,
          boxShadow: `inset -18px -10px 40px rgba(${GOLD}, 0.28), inset 12px 8px 34px rgba(${EMERALD}, 0.20)`,
        }}
      >
        <div
          className="globe-motion absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(${EMERALD}, 0.90) 1.5px, transparent 1.7px)`,
            backgroundSize: '16px 16px',
            animation: 'globeDrift 30s linear infinite',
          }}
        />
        <div
          className="globe-motion absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(${GOLD}, 0.55) 1.1px, transparent 1.3px)`,
            backgroundSize: '24px 24px',
            animation: 'globeDriftAlt 46s linear infinite',
          }}
        />
      </div>

      {/* Mark logo di dalam bola */}
      <div className="absolute inset-0 grid place-items-center">
        {markUrl ? (
          <img
            src={markUrl}
            alt=""
            className="h-[44%] w-auto max-w-[62%] object-contain drop-shadow-[0_2px_10px_rgba(24,144,144,0.45)]"
          />
        ) : (
          <span className="grid h-[44%] w-[44%] place-items-center rounded-2xl bg-emerald-primary font-serif text-3xl font-bold text-white shadow-lg shadow-emerald-primary/25">
            A
          </span>
        )}
      </div>

      {/* Wordmark — disembunyikan di layar kecil supaya tidak berdesakan dengan konten */}
      {wordmarkUrl && (
        <img
          src={wordmarkUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 hidden h-8 w-auto max-w-44 -translate-y-1/2 object-contain opacity-90 sm:block',
            wordmarkSide === 'left' ? 'right-[calc(100%+30px)]' : 'left-[calc(100%+30px)]',
          )}
        />
      )}
    </div>
  )
}

export default GlobeLogo
