"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "../../lib/utils"
import { DashboardHeader } from "./dashboard-header"
import { DashboardSidebar } from "./dashboard-sidebar"
import type {
  DashboardBrand,
  DashboardLinkComponent,
  DashboardNavGroup,
  DashboardNavItem,
  DashboardUser,
} from "./types"

/**
 * Chrome dashboard yang dipakai bersama oleh 4 panel: companyprofile admin
 * (overview + dashboard), ppdb admin, dan superadmin.
 *
 * Yang SENGAJA berbeda per-panel dan bukan inkonsistensi:
 * - `brand.subtitle` / `title` — tiap panel punya nama sendiri ("Admin CMS",
 *   "Admin PPDB", "Superadmin").
 * - `storageKey` — state sidebar yang ter-collapse harus terpisah per panel,
 *   kalau tidak memcollapse sidebar di satu panel akan Walnut di panel lain.
 * - `navGroups` — daftar menu tiap panel memang berbeda isi dan urutan.
 *
 * Yang TIDAK boleh berbeda (semua panel wajib mengirim):
 * - `roleLabel` — kalau kosong, DashboardProfileMenu jatuh ke `user.role`,
 *   jadi tetap tampil, tapi nilainya bisa berbeda antar panel.
 * - Header sidebar menampilkan favicon (fallback ke logo), dan TIDAK boleh
 *   jatuh ke path aset statis. Jika kosong → BrandMark merender tile emerald + `ار`.
 *
 * Yang SENGAJA hanya ada di CMS (panel lain TIDAK mengirim):
 * - `onViewSite` + `sidebarFooter` "Lihat Situs" — jalan balik ke situs publik
 *   hanya disediakan di Company Profile CMS, bukan di PPDB/Superadmin.
 */
export interface DashboardShellProps {
  brand: DashboardBrand
  navGroups: DashboardNavGroup[]
  user?: DashboardUser | null
  renderLink?: DashboardLinkComponent
  onNavigate?: (item: DashboardNavItem) => void
  apiBase?: string
  showSearch?: boolean

  title?: string
  subtitle?: string
  breadcrumb?: ReactNode

  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
  storageKey?: string

  mobileOpen?: boolean
  defaultMobileOpen?: boolean
  onMobileOpenChange?: (v: boolean) => void

  roleLabel?: string
  profileLabel?: string
  siteLabel?: string
  logoutLabel?: string
  onProfile?: () => void
  onViewSite?: () => void
  showViewSite?: boolean
  onLogout: () => void

  sidebarFooter?: ReactNode
  headerRight?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

const DefaultLink: DashboardLinkComponent = ({ href, target, title, className, onClick, children }) => (
  <a
    href={href ?? "#"}
    target={target}
    title={title}
    className={className}
    onClick={(e) => {
      if (!href) e.preventDefault()
      onClick?.(e)
    }}
  >
    {children}
  </a>
)

export function DashboardShell({
  brand,
  navGroups,
  user,
  renderLink,
  onNavigate,
  apiBase,
  showSearch = true,
  title,
  subtitle,
  breadcrumb,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  storageKey,
  mobileOpen: mobileOpenProp,
  defaultMobileOpen = false,
  onMobileOpenChange,
  roleLabel,
  profileLabel,
  siteLabel,
  logoutLabel,
  onProfile,
  onViewSite,
  showViewSite,
  onLogout,
  sidebarFooter,
  headerRight,
  className,
  contentClassName,
  children,
}: DashboardShellProps) {
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed)
  const [mobileState, setMobileState] = useState(defaultMobileOpen)

  const collapsed = collapsedProp ?? collapsedState
  const mobileOpen = mobileOpenProp ?? mobileState

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    onCollapsedChange?.(v)
  }
  const setMobileOpen = (v: boolean) => {
    setMobileState(v)
    onMobileOpenChange?.(v)
  }

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) setCollapsedState(saved === "true")
  }, [storageKey])

  return (
    <div className={cn("min-h-dvh bg-background flex", className)}>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <DashboardSidebar
        brand={brand}
        navGroups={navGroups}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        renderLink={renderLink ?? DefaultLink}
        onNavigate={onNavigate}
        footer={sidebarFooter}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          user={user}
          roleLabel={roleLabel}
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          onMobileMenu={() => setMobileOpen(true)}
          onProfile={onProfile}
          onViewSite={onViewSite}
          showViewSite={showViewSite}
          onLogout={onLogout}
          profileLabel={profileLabel}
          siteLabel={siteLabel}
          logoutLabel={logoutLabel}
          right={headerRight}
          navGroups={navGroups}
          onNavigate={onNavigate}
          renderLink={renderLink}
          apiBase={apiBase}
          showSearch={showSearch}
        />
        <main className={cn("flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto", contentClassName)}>{children}</main>
      </div>
    </div>
  )
}
