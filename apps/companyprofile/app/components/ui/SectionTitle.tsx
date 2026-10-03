interface Props {
  badge?: string
  title: string
  subtitle?: string
  center?: boolean
  light?: boolean
}

export default function SectionTitle({ badge, title, subtitle, center, light }: Props) {
  return (
    <div className={`mb-14 ${center ? 'text-center' : ''}`}>
      {badge && (
        <span className={`section-badge ${center ? 'mx-auto' : ''}`}>{badge}</span>
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
