import { cn } from '@/lib/utils'

// pseudo-random deterministik dari seed — `Math.random()` dilarang di render
// (react-hooks: components must be pure) dan akan membuat posisi meteor berubah
// tiap kali LandingPage re-render (mis. saat state `scrolled` berganti).
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const Meteors = ({
  number,
  className,
}: {
  number?: number
  className?: string
}) => {
  const meteorCount = number || 20
  const meteors = Array.from({ length: meteorCount }, (_, idx) => {
    // Sebar dalam PERSEN lebar container, bukan piksel tetap.
    //
    // Versi lama memakai `idx * (800 / count) - 400`, jadi posisinya selalu
    // terkurung di 800px di tengah. Di kartu CTA yang lebarnya 1120px, 160px
    // di tiap sisi tidak pernah dapat meteor sama sekali. Persen ikut lebar
    // container di semua ukuran tanpa magic number.
    const base = meteorCount === 1 ? 50 : (idx / (meteorCount - 1)) * 100
    // Jitter supaya tidak terlihat seperti baris titik yang jaraknya seragam.
    const jitter = (pseudoRandom(idx + 3) - 0.5) * 6

    return {
      key: `meteor${idx}`,
      left: Math.min(97, Math.max(3, base + jitter)),
      // Mula-mula di atas bidang, tapi tidak seragam: kalau semua start di
      // top yang sama, hasilnya deretan garis sejajar di tepi atas.
      top: -20 - pseudoRandom(idx + 11) * 60,
      // Sudut jatuh. WAJIB di sekitar 0deg, bukan di angka besar.
      //
      // Dalam `rotate(θ) translateY(d)`, translateY bergerak di sistem koordinat
      // yang sudah diputar: sumbu Y lokal (-> 0,1) terpetakan ke layar
      // (-sin θ, cos θ). Jadi θ=212deg (nilai yang dipakai versi lama) memetakan
      // Y lokal ke (0.53, -0.85) — ke ATAS-kanan, sehingga semua meteor
      // terbang keluar dari kartu dan tidak pernah terlihat di dalamnya.
      //
      // θ di kisaran 0-90deg memetakan Y lokal ke bawah. 18-48deg memberi
      // diagonal ke kiri bawah dengan variasi tipis.
      angle: 18 + pseudoRandom(idx + 17) * 30,
      travel: 620 + pseudoRandom(idx + 23) * 220,
      delay: pseudoRandom(idx + 1) * 6,
      duration: Math.floor(pseudoRandom(idx + 7) * 4 + 7),
    }
  })

  return (
    <div className={cn('pointer-events-none animate-fade-in text-white', className)} aria-hidden="true">
      {meteors.map((meteor) => (
        <span
          key={meteor.key}
          className={cn(
            // Kepala 3px + glow, bukan 2px polos. Versi lama 2x2px Abu-abu
            // slate (#64748b) di atas kartu emerald gelap nyaris tak terlihat
            // dan lebih mirip goresan daripada meteor.
            'animate-meteor-effect absolute block h-[3px] w-[3px] rounded-[9999px] bg-current shadow-[0_0_10px_1px_currentColor] will-change-transform motion-reduce:hidden',
            // Ekor 110px (dari 50px) di belakang kepala, lalu memudar ke transparan.
            // Dipasang di sisi lokal -Y, yaitu arah sebaliknya dari perjalanan,
            // supaya selalu trail di belakang kapan pun sudutnya.
            "before:absolute before:bottom-full before:left-1/2 before:h-px before:w-[110px] before:-translate-x-1/2 before:bg-gradient-to-b before:from-transparent before:to-current before:content-['']",
          )}
          style={
            {
              top: `${meteor.top}px`,
              left: `${meteor.left}%`,
              animationDelay: `${meteor.delay}s`,
              animationDuration: `${meteor.duration}s`,
              '--meteor-angle': `${meteor.angle}deg`,
              '--meteor-travel': `${meteor.travel}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
