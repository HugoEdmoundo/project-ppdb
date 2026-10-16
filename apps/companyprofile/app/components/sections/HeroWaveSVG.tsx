'use client'

/**
 * Hero wave decorative SVG - corrected colors to match company profile
 * Colors: Emerald #1A6B47 (primary) and Gold #D4A853 (accent)
 * Maintains the original wave animation structure with CSS morphing
 */
export default function HeroWaveSVG() {
  /* gradient ID used via literal id="lg-hero-wave" in defs */

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1280 712"
      preserveAspectRatio="xMidYMid"
      className="absolute inset-0 -z-10"
    >
      <defs>
        <linearGradient id="lg-hero-wave" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#1A6B47" offset="0" />
          <stop stopColor="#D4A853" offset="1" />
        </linearGradient>
      </defs>

      {/* Wave layer 1 - bottom */}
      <path
        d="M 0 0 L 587.96 0 Q 656.33 71.2 619.72 142.4 T 529.48 284.8 T 474.87 427.2 T 409.57 569.6 T 304.74 712 L 0 712 Z"
        fill="url(#lg-hero-wave)"
        opacity="0.4"
        className="wave-layer layer-1"
      />
      <path
        d="M 0 0 L 661.427 0 Q 594.173 71.2 572.451 142.4 T 486.894 284.8 T 416.182 427.2 T 343.77 569.6 T 353.202 712 L 0 712 Z"
        fill="url(#lg-hero-wave)"
        opacity="0.4"
        className="wave-layer layer-2"
      />
      <path
        d="M 0 0 L 651.647 0 Q 618.638 71.2 582.631 142.4 T 468.6 284.8 T 495.375 427.2 T 419.3 569.6 T 347.623 712 L 0 712 Z"
        fill="url(#lg-hero-wave)"
        opacity="0.4"
        className="wave-layer layer-3"
      />
      <path
        d="M 0 0 L 685.693 0 Q 669.42 71.2 639.382 142.4 T 573.329 284.8 T 512.636 427.2 T 365.929 569.6 T 396.628 712 L 0 712 Z"
        fill="url(#lg-hero-wave)"
        opacity="0.4"
        className="wave-layer layer-4"
      />
      <path
        d="M 0 0 L 616.006 0 Q 573.21 71.2 549.564 142.4 T 523.51 284.8 T 408.059 427.2 T 390.553 569.6 T 297.863 712 L 0 712 Z"
        fill="url(#lg-hero-wave)"
        opacity="0.4"
        className="wave-layer"
      />
    </svg>
  )
}