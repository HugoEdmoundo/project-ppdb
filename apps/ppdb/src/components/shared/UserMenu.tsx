import { Avatar, AvatarFallback, AvatarImage, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui"
import { LogOut, User as UserIcon } from 'lucide-react'

export interface UserMenuUser {
  full_name?: string
  username?: string
  email?: string
  avatar_url?: string
  role_name?: string
  user_type?: string
}

interface UserMenuProps {
  user: UserMenuUser | null
  subtitle?: string
  profileLabel?: string
  onProfile?: () => void
  onLogout: () => void
}

export default function UserMenu({ user, subtitle, profileLabel = 'Profile', onProfile, onLogout }: UserMenuProps) {
  if (!user) return null

  const roleText = subtitle ?? user.role_name ?? user.user_type ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2.5 rounded-xl px-3 py-1.5">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {user.full_name?.[0] || user.username?.[0] || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block pr-1 text-left">
            <div className="font-semibold leading-snug text-foreground text-sm sm:text-[15px]">{user.full_name || user.username}</div>
            {roleText && <div className="mt-1 text-xs text-muted-foreground">{roleText}</div>}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{user.full_name || user.username}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onProfile && (
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onProfile()}>
            <UserIcon className="h-4 w-4" />
            {profileLabel}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer text-rose-danger focus:text-rose-danger focus:bg-rose-light/60" onSelect={() => onLogout()}>
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}