"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronLeft } from "lucide-react"
import { cn } from "../../lib/utils"
import { BrandMark } from "./brand-mark"
import type { DashboardBrand, DashboardLinkComponent, DashboardNavGroup, DashboardNavItem } from "./types"

export interface DashboardSidebarProps {
  brand: DashboardBrand
  navGroups: DashboardNavGroup[]
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (v: boolean) => void
  renderLink: DashboardLinkComponent
  onNavigate?: (item: DashboardNavItem) => void
  footer?: ReactNode
}

export function DashboardSidebar({
  brand,
  navGroups,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  renderLink: Link,
  onNavigate,
  footer,
}: DashboardSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const handleNavigate = (item: DashboardNavItem) => {
    onNavigate?.(item)
    onMobileOpenChange(false)
  }

  const baseItem = (active: boolean) =>
    cn(
      "group/btn relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left",
      collapsed ? "justify-center p-2" : "px-3 py-2.5",
      active
        ? "bg-primary/10 text-foreground font-semibold shadow-sm"
        : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
    )

  const activeBar = (active: boolean) =>
    active ? <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" /> : null

  function renderLeaf(item: DashboardNavItem) {
    const Icon = item.icon
    const active = !!item.active
    const inner = (
      <>
        {activeBar(active)}
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </>
    )
    if (item.href) {
      return (
        <Link
          key={item.key}
          href={item.href}
          target={item.target}
          title={collapsed ? item.label : undefined}
          className={baseItem(active)}
          onClick={() => handleNavigate(item)}
        >
          {inner}
        </Link>
      )
    }
    return (
      <button
        key={item.key}
        type="button"
        title={collapsed ? item.label : undefined}
        className={baseItem(active)}
        onClick={() => {
          item.onClick?.()
          handleNavigate(item)
        }}
      >
        {inner}
      </button>
    )
  }

  function renderParent(item: DashboardNavItem) {
    const Icon = item.icon
    const children = item.children ?? []
    const hasActiveChild = children.some((c) => c.active)
    const isOpen = expanded[item.key] ?? hasActiveChild
    const active = !!item.active || hasActiveChild
    return (
      <div key={item.key}>
        <button
          type="button"
          title={collapsed ? item.label : undefined}
          className={baseItem(active)}
          onClick={() => setExpanded((prev) => ({ ...prev, [item.key]: !(prev[item.key] ?? hasActiveChild) }))}
        >
          {activeBar(active)}
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{item.label}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
            </>
          )}
        </button>
        {!collapsed && isOpen && (
          <div className="ml-9 mt-1 space-y-0.5 border-l border-border/60 pl-3">
            {children.map((c) => {
              const cactive = !!c.active
              const cls = cn(
                "block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-all",
                cactive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              )
              return c.href ? (
                <Link
                  key={c.key}
                  href={c.href}
                  target={c.target}
                  title={c.label}
                  className={cls}
                  onClick={() => handleNavigate(c)}
                >
                  <span className="truncate">{c.label}</span>
                </Link>
              ) : (
                <button
                  key={c.key}
                  type="button"
                  className={cls}
                  onClick={() => {
                    c.onClick?.()
                    handleNavigate(c)
                  }}
                >
                  <span className="truncate">{c.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-dvh bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl flex flex-col border-r border-border/50 transition-all duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "relative flex items-center border-b border-border/60 bg-white/30",
          collapsed ? "justify-center px-2 py-4" : "px-5 py-4"
        )}
      >
        {collapsed ? (
          <BrandMark logoUrl={brand.logoUrl} name={brand.name} mark={brand.mark} size="sm" />
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BrandMark logoUrl={brand.logoUrl} name={brand.name} mark={brand.mark} size="md" />
            <div className="min-w-0">
              <div className="font-heading text-sm font-bold text-foreground truncate">{brand.name}</div>
              {brand.subtitle && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-primary shadow-[0_0_4px_rgba(26,107,71,0.5)]" />
                  {brand.subtitle}
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-all hover:text-foreground hover:scale-110"
          title={collapsed ? "Perlebar sidebar" : "Sempitkan sidebar"}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group, gi) => {
          if (group.items.length === 0) return null
          return (
            <div key={group.label ?? gi}>
              {group.label && !collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 select-none">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) =>
                  item.children && item.children.length > 0 ? renderParent(item) : renderLeaf(item)
                )}
              </div>
            </div>
          )
        })}
      </nav>

      {footer && !collapsed && <div className="border-t border-border/60 px-3 py-4 space-y-2">{footer}</div>}
    </aside>
  )
}
