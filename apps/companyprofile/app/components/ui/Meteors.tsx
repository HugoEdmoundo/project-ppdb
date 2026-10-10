'use client'

import { useEffect, useRef } from 'react'

/** Warna ditulis sebagai [r, g, b] 0-255 supaya rgba() selalu bisa dibentuk. */
export type MeteorColor = [number, number, number]

interface MeteorsProps {
  /** Jumlah meteor yang boleh aktif bersamaan. Makin banyak makin ramai. */
  count?: number
  className?: string
  /**
* Warna kepala dan ekor. Emerald hampir tak terlihat di atas hijau tua, jadi
   * default-nya emas — kontrasnya kuat di section gelap.
   *
   * Sengaja module-level constant: kalau dipanggil dengan array literal,
   * identitasnya baru tiap render, effect restart terus dan meteor berkedip.
   */
  colors?: MeteorColor[]
  /**
   * `lighter` = additive, memberi kesan bercahaya. Bagus di atas CTA gelap,
   * tapi membuat meteor washed out kalau dipakai di atas latar terang.
   */
  composite?: GlobalCompositeOperation
  /**
   * Batas atas zona lintasan dalam fraksi tinggi kanvas (0–1). Default 0 = penuh.
   * Batasi ke pita atas supaya meteor tidak pernah terpotong di tengah oleh
   * elemen opaque (kartu) yang menutupi lebar penuh section.
   *
   * Sengaja dua angka terpisah, bukan objek `{ from, to }`: objek literal
   * punya identitas baru tiap render, jadi kalau masuk ke dependency array
   * effect akan restart terus dan meteor berkedip.
   */
  from?: number
  to?: number
}

const DEFAULT_COLORS: MeteorColor[] = [
  [212, 168, 83], // --color-gold
  [240, 200, 120], // --color-gold-light
]

const rgba = ([r, g, b]: MeteorColor, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`

/**
 * Pola lintasan tetap, dipilih per indeks. Ini sengaja bukan `Math.random()`
 * tiap kemunculan: acak penuh membuat tiap meteor jatuh dari sudut dan titik
 * yang selalu berbeda sehingga posisinya terbaca sebagai tidak sengaja. Yang
 * berubah tiap siklus cuma warnanya.
 */
const LANES = {
  angle: [0.62, 0.78, 0.68, 0.86, 0.72],
  duration: [1.15, 0.95, 1.3, 1.05, 1.2],
  length: [90, 70, 110, 80, 100],
  dist: [1, 1.1, 0.95, 1.05, 1.02],
  peak: [0.55, 0.75, 0.45, 0.68, 0.6],
}

const at = (list: number[], i: number) => list[i % list.length]

interface Meteor {
  dx: number
  dy: number
  dist: number
  length: number
  duration: number
  wait: number
  t: number
  peak: number
  color: MeteorColor
  sx: number
  sy: number
  top: number
  span: number
}

/**
 * Meteor (bintang jatuh): garis berekor yang melintas diagonal, muncul satu per
 * satu dengan jeda. Berbeda dari `Particles` yang partikelnya bergerak terus.
 * Pakai untuk section gelap; di atas latar terang nyaris tak terlihat.
 *
 * Catatan penempatan: canvas selalu `absolute inset-0` terhadap elemen induknya,
 * jadi untuk membatasi zona lintasan, bungkus di elemen dengan tinggi sendiri
 * dan set `region` — jangan mengandalkan ukuran section.
 */
export default function Meteors({
  count = 5,
  className = '',
  colors = DEFAULT_COLORS,
  composite = 'lighter',
  from = 0,
  to = 1,
}: MeteorsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let running = false
    let w = 0
    let h = 0

    const top = Math.min(from, to)
    const span = Math.max(0.05, Math.abs(to - from))

    const size = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      // Garis tipis butuh DPR, kalau tidak ekornya pecah dan blur.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const palette = colors.length ? colors : DEFAULT_COLORS

    // Jeda antar-meteor menentukan berapa sering layar benar-benar kosong.
    const GAP_MIN = 1.2
    const GAP_MAX = 4.2

    const build = (index: number, total: number): Meteor => {
      const lane = index
      // Titik mulai tersebar merata di sepanjang tepi atas zona, semua dari luar
      // zona (sy < top) supaya ekor tidak muncul menggantung di dalam frame.
      const spread = total > 1 ? index / (total - 1) : 0.5
      return {
        dx: 1,
        dy: at(LANES.angle, lane),
        dist: at(LANES.dist, lane),
        length: at(LANES.length, lane),
        duration: at(LANES.duration, lane),
        peak: at(LANES.peak, lane),
        sx: -0.12 + spread * 1.2,
        sy: top - span * 0.22,
        top,
        span,
        wait: index * ((GAP_MAX - GAP_MIN) / Math.max(1, total)),
        t: 0,
        color: palette[index % palette.length],
      }
    }

    let meteors: Meteor[] = Array.from({ length: count }, (_, i) => build(i, count))

    const respawn = (m: Meteor) => {
      // Hanya jeda dan warna yang berubah; lintasan tetap pada polanya.
      m.wait = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)
      m.t = 0
      m.color = palette[(Math.random() * palette.length) | 0]
    }

    let last = 0

    const draw = (now: number) => {
      // Dibatasi 50ms supaya tab yang di-suspend tidak melompatikan semua
      // meteor sekaligus saat kembali aktif.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = composite

      for (const m of meteors) {
        if (m.wait > 0) {
          m.wait -= dt
          continue
        }

        m.t += dt / m.duration
        if (m.t >= 1) {
          respawn(m)
          continue
        }

        // Envelope sinus: masuk dan keluar sama lembutnya, bukan terputus
        // mendadak di ujung lintasan.
        const alpha = m.peak * Math.sin(Math.PI * m.t)
        if (alpha <= 0.01) continue

        const px = (m.sx + m.dx * m.dist * m.t) * w
        const py = (m.sy + m.dy * m.dist * m.t * m.span) * h

        // Ekor mengikuti arah gerak sebenarnya di ruang layar — koordinat
        // ternormalisasi memakai w dan h berbeda, jadi tidak bisa asal
        // mengurangi `dy * length` langsung tanpa normalisasi.
        const vx = m.dx * m.dist * w
        const vy = m.dy * m.dist * m.span * h
        const speed = Math.hypot(vx, vy) || 1
        const tailX = px - (vx / speed) * m.length
        const tailY = py - (vy / speed) * m.length

        const grad = ctx.createLinearGradient(tailX, tailY, px, py)
        grad.addColorStop(0, rgba(m.color, 0))
        grad.addColorStop(0.65, rgba(m.color, 0.45))
        grad.addColorStop(1, rgba(m.color, 1))

        ctx.globalAlpha = alpha
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.8
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(px, py)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      animId = requestAnimationFrame(draw)
    }

    const start = () => {
      // Ukur ulang tepat sebelum start: canvas bisa masih 0px saat effect
      // pertama jalan (belum ada layout), dan tanpa ini animasi tidak akan
      // pernah hidup sampai terjadi resize.
      if (!w || !h) size()
      if (running || !w || !h) return
      running = true
      last = performance.now()
      animId = requestAnimationFrame(draw)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(animId)
    }

    size()

    // Meteor disimpan dinormalisasi (0..1), jadi cukup bangun ulang setelah
    // resize — tidak perlu menyimpan posisi absolut lalu mentransformasinya.
    const resize = () => {
      stop()
      size()
      meteors = meteors.map((_, i) => build(i, count))
      start()
    }

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    io.observe(canvas)
    window.addEventListener('resize', resize)
    start()

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [count, colors, composite, from, to])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}