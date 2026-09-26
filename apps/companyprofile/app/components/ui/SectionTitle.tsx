interface Props {
  badge?: string
  title: string
  subtitle?: string
  center?: boolean
  light?: boolean
  className?: string
}

export default function SectionTitle({ badge, title, subtitle, center, light, className }: Props) {
  return (
    <div className={`mb-6 sm:mb-8 ${center ? 'text-center' : ''} ${className || ''}`}>
      {badge && (
        <span className={`section-badge !mb-2 ${center ? 'mx-auto' : ''}`}>{badge}</span>
      )}
      <h2 className={`section-title ${light ? '!text-white' : ''}`}>{title}</h2>
      {subtitle && (
        <p className={`section-subtitle ${center ? 'mx-auto' : ''} ${light ? '!text-white/60' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
