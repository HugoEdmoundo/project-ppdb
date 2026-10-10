"use client"

import { ChevronDown, ExternalLink, Globe, LogOut, User as UserIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import type { DashboardUser } from "./types"

export interface DashboardProfileMenuProps {
  user?: DashboardUser | null
  roleLabel?: string
  profileLabel?: string
  siteLabel?: string
  logoutLabel?: string
  onProfile?: () => void
  onViewSite?: () => void
  showViewSite?: boolean
  onLogout: () => void
}

export function DashboardProfileMenu({
  user,
  roleLabel,
  profileLabel = "Lihat Profil",
  siteLabel = "Lihat Situs",
  logoutLabel = "Keluar",
  onProfile,
  onViewSite,
  showViewSite = true,
  onLogout,
}: DashboardProfileMenuProps) {
  const name = user?.fullName || user?.username || "Admin"
  const initial = name[0]?.toUpperCase() || "A"
  const role = roleLabel || user?.role || "Admin"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2.5 rounded-xl border border-transparent bg-white/50 py-1.5 pl-1.5 pr-2.5 sm:pr-3 text-left transition-all duration-200 hover:bg-white/80 hover:border-emerald-primary/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <Avatar className="h-8 w-8 ring-1 ring-emerald-primary/20 transition-shadow group-hover:ring-emerald-primary/40">
            <AvatarImage src={user?.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block min-w-0">
            <div className="text-sm font-bold text-foreground leading-tight truncate">{name}</div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-emerald-primary" />
              <span className="truncate">{role}</span>
            </div>
          </div>
          <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-1.5">
        <div className="rounded-xl border border-emerald-primary/15 bg-gradient-to-br from-emerald-primary/10 to-emerald-primary/5 p-3 mb-1.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
              <AvatarImage src={user?.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground leading-tight">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-primary" />
              {role}
            </span>
          </div>
        </div>

        {onProfile && (
          <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => onProfile()}>
            <UserIcon className="h-4 w-4 text-emerald-primary" />
            <span>{profileLabel}</span>
          </DropdownMenuItem>
        )}
        {showViewSite && onViewSite && (
          <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => onViewSite()}>
            <Globe className="h-4 w-4 text-emerald-primary" />
            <span>{siteLabel}</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          className="cursor-pointer rounded-lg px-2.5 py-2 text-rose-danger focus:bg-destructive/10 focus:text-rose-danger"
          onSelect={() => onLogout()}
        >
          <LogOut className="h-4 w-4" />
          <span>{logoutLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
