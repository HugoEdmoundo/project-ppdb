"use client"
import type { ReactNode } from "react"
import { ChevronRight, Menu } from "lucide-react"
import { cn } from "../../lib/utils"
import { DashboardProfileMenu } from "./dashboard-profile-menu"
import { SemanticSearch } from "./semantic-search/semantic-search"
import type {
  DashboardLinkComponent,
  DashboardNavGroup,
  DashboardNavItem,
  DashboardUser,
} from "./types"

export interface DashboardHeaderProps {
  user?: DashboardUser | null
  roleLabel?: string
  title?: string
  subtitle?: string
  breadcrumb?: ReactNode
  onMobileMenu?: () => void
  onProfile?: () => void
  onViewSite?: () => void
  showViewSite?: boolean
  onLogout: () => void
  profileLabel?: string
  siteLabel?: string
  logoutLabel?: string
  right?: ReactNode
  className?: string
  navGroups?: DashboardNavGroup[]
  onNavigate?: (item: DashboardNavItem) => void
  renderLink?: DashboardLinkComponent
  apiBase?: string
  showSearch?: boolean
}

export function DashboardHeader({
  user,
  roleLabel,
  title,
  subtitle,
  breadcrumb,
  onMobileMenu,
  onProfile,
  onViewSite,
  showViewSite,
  onLogout,
  profileLabel,
  siteLabel,
  logoutLabel,
  right,
  className,
  navGroups,
  onNavigate,
  renderLink,
  apiBase,
  showSearch = true,
}: DashboardHeaderProps) {
  const crumbs =
    breadcrumb ??
    (title || subtitle ? (
      <>
        {title && <span className="font-heading text-base font-bold text-foreground">{title}</span>}
        {title && subtitle && <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
        {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
      </>
    ) : null)

  return (
    <header className={cn("sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-border", className)}>
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        <div className="flex items-center gap-3">
          {onMobileMenu && (
            <button
              onClick={onMobileMenu}
              className="md:hidden -ml-2 rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {crumbs && <div className="hidden sm:flex items-center gap-2 text-sm">{crumbs}</div>}
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <SemanticSearch
              navGroups={navGroups}
              user={user}
              apiBase={apiBase}
              onNavigate={onNavigate}
              renderLink={renderLink}
            />
          )}
          {right}
          <DashboardProfileMenu
            user={user}
            roleLabel={roleLabel}
            onProfile={onProfile}
            onViewSite={onViewSite}
            showViewSite={showViewSite}
            onLogout={onLogout}
            profileLabel={profileLabel}
            siteLabel={siteLabel}
            logoutLabel={logoutLabel}
          />
        </div>
      </div>
    </header>
  )
}
