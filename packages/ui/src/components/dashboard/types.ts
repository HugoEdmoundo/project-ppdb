import type { ComponentType, MouseEvent, ReactNode } from "react"

export interface DashboardUser {
  fullName?: string
  username?: string
  email?: string
  avatarUrl?: string
  role?: string
}

export interface DashboardNavItem {
  key: string
  label: string
  icon?: ComponentType<{ className?: string }>
  href?: string
  target?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children?: DashboardNavItem[]
}

export interface DashboardNavGroup {
  label?: string
  items: DashboardNavItem[]
}

export interface DashboardBrand {
  name: string
  subtitle?: string
  logoUrl?: string
  mark?: ReactNode
}

export interface DashboardLinkProps {
  href?: string
  target?: string
  title?: string
  className?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  children: ReactNode
}

export type DashboardLinkComponent = ComponentType<DashboardLinkProps>
