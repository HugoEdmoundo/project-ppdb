import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  iconColor?: string
  title: string
  description: string
}

export default function PageHeader({ icon: Icon, iconColor = 'text-primary', title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Icon className={`h-6 w-6 ${iconColor}`} />
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
