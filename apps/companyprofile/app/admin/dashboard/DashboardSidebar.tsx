'use client'

import Link from 'next/link'
import { ChevronLeft, LayoutDashboard } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import type { TabDef } from './_types'

interface Props {
  tabs: TabDef[]
  activeTab: string
  collapsed: boolean
  logoUrl: string
  onTabChange: (key: string) => void
  onCollapse: () => void
  onMobileClose: () => void
}

export function DashboardSidebar({
  tabs, activeTab, collapsed, logoUrl, onTabChange, onCollapse, onMobileClose,
}: Props) {
  return (
    <aside
      className={cn(
        'fixed md:sticky top-0 left-0 z-40 h-dvh glass-sidebar flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'relative flex items-center border-b border-border/60 bg-white/40',
          collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4',
        )}
      >
        {collapsed ? (
          logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-auto max-w-8 object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg select-none">ار</div>
          )
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-auto max-w-36 object-contain shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0 select-none">ار</div>
            )}
            <div className="min-w-0">
              <div className="font-heading text-sm font-bold text-foreground truncate">PTDARRAHMAN</div>
              <div className="text-[11px] text-muted-foreground">Admin CMS</div>
            </div>
          </div>
        )}
        <button
          onClick={onCollapse}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-all hover:text-foreground"
        >
          <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 no-scrollbar">
        <Link
          href="/admin/overview"
          onClick={onMobileClose}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
            collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
            'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
          )}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </Link>

        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { onTabChange(tab.key); onMobileClose() }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                isActive
                  ? 'sidebar-item-active scale-[1.01]'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
              )}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{tab.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
