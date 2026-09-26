"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

const ProgressContext = createContext<MotionValue<number> | null>(null);

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOutCubic = (n: number) => 1 - Math.pow(1 - n, 3);

// Hijau muda: 10% emerald + 90% putih, tetap sinkron dengan brand token.
const TINT = "color-mix(in srgb, var(--color-emerald) 10%, #FFFFFF)";
// Greensilan sudah hilang sepenuhnya di progress ini agar teks tetap tajam.
const TINT_FADE_END = 0.5;
const TINT_START = 0.05;

/** Progress scroll; fallback ke 0 bila dipakai tanpa `ScrollExpand` root. */
const useScrollExpandProgress = () => {
  const contextProgress = useContext(ProgressContext);
  const fallbackProgress = useMotionValue(0);
  return contextProgress ?? fallbackProgress;
};

/**
 * Opacity hijau muda: penuh saat lingkaran masih kecil, lalu hilang total di
 * `TINT_FADE_END`. Dipakai bersama oleh lapisan dalam & luar lingkaran agar
 * keduanya memudar dalam ritme yang sama.
 */
const useTintOpacity = () => {
  const progress = useScrollExpandProgress();
  const reduced = useReducedMotion();
  return useTransform(progress, (p) =>
    reduced ? 0 : 1 - clamp01((p - TINT_START) / (TINT_FADE_END - TINT_START)),
  );
};

export interface ScrollExpandProps {
  children: ReactNode;
  /** Tinggi area scroll, mis. `h-[250vh]` / `h-[200vh]`. */
  scrollLength?: string;
  className?: string;
}

/**
 * Root: container setinggi area scroll. `scrollYProgress` 0 saat container
 * menyentuh atas viewport, 1 saat container menyentuh bawah viewport.
 */
export const ScrollExpand = ({
  children,
  scrollLength = "h-[250vh]",
  className = "",
}: ScrollExpandProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <ProgressContext.Provider value={scrollYProgress}>
      <div
        ref={ref}
        data-scroll-expand-root=""
        className={`relative ${reduced ? "h-auto" : scrollLength} ${className}`}
      >
        {children}
      </div>
    </ProgressContext.Provider>
  );
};

export interface ScrollExpandStickyProps {
  children: ReactNode;
  /**
   * Lapisan hijau muda di SELURUH frame (terlihat di luar lingkaran saat
   * progress masih rendah), memudar seiring lingkaran membesar.
   */
  tint?: boolean;
  className?: string;
}

/** Sticky: mengunci konten di layar selama area scroll berjalan. */
export const ScrollExpandSticky = ({
  children,
  tint = true,
  className = "",
}: ScrollExpandStickyProps) => {
  const reduced = useReducedMotion();
  const tintOpacity = useTintOpacity();

  return (
    <div
      data-scroll-expand-frame=""
      className={`relative flex w-full items-center justify-center overflow-hidden ${
        reduced ? "relative" : "sticky top-0 h-[100svh]"
      } ${className}`}
    >
      {/* Di render sebelum children => reveal (children) menimpanya. */}
      {tint && (
        <motion.div
          aria-hidden
          data-scroll-expand-veil=""
          style={{ backgroundColor: TINT, opacity: tintOpacity }}
          className="pointer-events-none absolute inset-0 will-change-opacity"
        />
      )}
      {children}
    </div>
  );
};

export interface ScrollExpandInsetProps {
  children: ReactNode;
  /**
   * CSS selector di dalam frame; titik tengah elemen ini jadi pusat lingkaran.
   * Kosongkan untuk memakai tengah frame.
   */
  origin?: string;
  /** Jari-jari lingkaran saat pertama kali muncul (progress 0). */
  startRadius?: number;
  className?: string;
}

interface Geometry {
  /** Titung lingkaran dalam koordinat elemen reveal. */
  x: number;
  y: number;
  /** Radius agar lingkaran menutup keempat sudut. */
  r: number;
  /** Skala statis agar konten tidak terpotong di layar pendek. */
  fit: number;
}

/**
 * Inset: satu-satunya animasi — lingkaran kecil muncul di titik `origin`
 * lalu membesar halus untuk mengungkap seluruh konten.
 */
export const ScrollExpandInset = ({
  children,
  origin,
  startRadius = 14,
  className = "",
}: ScrollExpandInsetProps) => {
  const progress = useScrollExpandProgress();
  const reduced = useReducedMotion();

  const revealRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState<Geometry>({ x: 0, y: 0, r: 0, fit: 1 });

  useEffect(() => {
    const reveal = revealRef.current;
    const content = contentRef.current;
    if (!reveal || !content) return;

    const measure = () => {
      const W = reveal.offsetWidth;
      const H = reveal.offsetHeight;
      if (!W || !H) return;

      // Skala yang SEDANG terpakai di kontainer — bisa berbeda dari `fit` baru,
      // jadi posisi target harus dibagi skala ini agar dapat koordinat layout.
      const applied =
        new DOMMatrixReadOnly(getComputedStyle(content).transform).a || 1;

      // Fit statis agar konten tidak terpotong di layar pendek.
      // offsetHeight = tinggi layout, tidak dipengaruhi transform.
      const contentH = content.offsetHeight;
      const contentW = content.offsetWidth;
      const rawFit = Math.min(1, H / contentH, W / contentW);
      const fit = Number.isFinite(rawFit) && rawFit > 0 ? rawFit : 1;

      // Titik lingkaran = tengah elemen `origin`, dalam koordinat `reveal`.
      // Konten berada di dalam flex-centering lalu di-scale(fit) dengan
      // transform-origin center, jadi titik lokal (px, py) -> reveal:
      const offsetLeft = (contentW * (1 - fit)) / 2;
      const offsetTop = (H - contentH) / 2 + (contentH * (1 - fit)) / 2;

      let x = W / 2;
      let y = H / 2;
      const target = origin ? content.querySelector(origin) : null;
      if (target) {
        const targetRect = target.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const px =
          (targetRect.left + targetRect.width / 2 - contentRect.left) / applied;
        const py =
          (targetRect.top + targetRect.height / 2 - contentRect.top) / applied;
        x = px * fit + offsetLeft;
        y = py * fit + offsetTop;
      }

      // Radius agar lingkaran menutup keempat sudut.
      const r = Math.max(
        Math.hypot(x, y),
        Math.hypot(W - x, y),
        Math.hypot(x, H - y),
        Math.hypot(W - x, H - y),
      );

      setGeom({ x, y, r, fit });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(reveal);
    ro.observe(content);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [origin]);

  const clipPath = useTransform(progress, (p) => {
    // 0-5% scroll: lingkaran muncul dari 0 ke startRadius.
    const appear = clamp01(p / 0.05);
    // 5-100%: membesar halus sampai menutup seluruh frame.
    const grow = easeOutCubic(clamp01((p - 0.05) / 0.95));
    const radius = appear * startRadius + (geom.r - startRadius) * grow;
    return `circle(${radius}px at ${geom.x}px ${geom.y}px)`;
  });

  const tintOpacity = useTintOpacity();

  return (
    <motion.div
      ref={revealRef}
      data-scroll-expand-reveal=""
      style={{ clipPath: reduced ? "none" : clipPath }}
      className={`absolute inset-0 will-change-[clip-path] ${className}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={contentRef}
          style={{ transform: `scale(${geom.fit})` }}
          className="w-full origin-center"
        >
          {children}
        </div>
      </div>
      <motion.div
        aria-hidden
        data-scroll-expand-tint=""
        style={{ backgroundColor: TINT, opacity: tintOpacity }}
        className="pointer-events-none absolute inset-0 will-change-opacity"
      />
    </motion.div>
  );
};
