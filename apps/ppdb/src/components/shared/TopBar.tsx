import UserMenu, { type UserMenuUser } from './UserMenu'

interface TopBarProps {
  title: string
  mobileMenuTrigger?: React.ReactNode
  containerClassName?: string
  titleClassName?: string
  user: UserMenuUser | null
  subtitle?: string
  profileLabel?: string
  onProfile?: () => void
  onLogout: () => void
}

export default function TopBar({
  title,
  mobileMenuTrigger,
  containerClassName = 'px-4 md:px-6 h-14',
  titleClassName,
  user,
  subtitle,
  profileLabel,
  onProfile,
  onLogout,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
      <div className={`flex items-center justify-between ${containerClassName}`}>
        <div className="flex items-center gap-3">
          {mobileMenuTrigger}
          <h1 className={`font-heading text-base font-bold text-foreground ${titleClassName || ''}`}>
            {title}
          </h1>
        </div>
        <UserMenu
          user={user}
          subtitle={subtitle}
          profileLabel={profileLabel}
          onProfile={onProfile}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}