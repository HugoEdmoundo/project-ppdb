interface Props {
  src: string
  alt: string
  isTransparent?: boolean
  className?: string
}

export default function AnimatedLogo({ src, alt, isTransparent, className = '' }: Props) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="absolute inset-0 rounded-full opacity-0"
        style={{
          background: 'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)',
          animation: 'logoPulse 3s ease-in-out infinite',
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-8 sm:h-10 w-auto object-contain transition-all duration-300 relative ${
          isTransparent ? 'brightness-0 invert' : ''
        }`}
        style={{ animation: 'logoFloat 4s ease-in-out infinite' }}
      />
    </span>
  )
}
