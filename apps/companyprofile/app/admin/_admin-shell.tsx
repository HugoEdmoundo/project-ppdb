'use client'

import { useEffect, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ExternalLink, Globe, LayoutDashboard } from 'lucide-react'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import type { DashboardLinkComponent, DashboardNavGroup, DashboardNavItem } from '@repo/ui'

/**
 * Kelompok menu sidebar Admin CMS. Satu sumber untuk halaman `overview` dan
 * `dashboard` supaya urutan & pengelompokan modul tidak berbeda antar halaman.
 */
export const ADMIN_SIDEBAR_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Konten', keys: ['news', 'programs', 'facilities', 'gallery', 'testimonials'] },
  { label: 'Informasi', keys: ['staff', 'achievements', 'social', 'contact'] },
  { label: 'Sistem', keys: ['settings'] },
]

/** Link Next.js untuk `DashboardShell`. */
export const AdminDashboardLink: DashboardLinkComponent = ({ href, target, title, className, onClick, children }) => (
  <Link href={href ?? '#'} target={target} title={title} className={className} onClick={onClick}>
    {children}
  </Link>
)

type ModuleEntry = {
  key: string
  label: string
  icon?: ComponentType<{ className?: string }>
  active?: boolean
  href?: string
  onClick?: () => void
}

/**
 * Bangun `navGroups` dari daftar modul: item "Dashboard" selalu di atas, lalu
 * modul dikelompokkan mengikuti `ADMIN_SIDEBAR_GROUPS`. Dipakai `overview`
 * (item berupa link ke `?tab=`) maupun `dashboard` (item mengubah tab aktif).
 */
export function buildAdminNavGroups(modules: ModuleEntry[], dashboardActive = false): DashboardNavGroup[] {
  const dashboardItem: DashboardNavItem = {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/overview',
    active: dashboardActive,
  }
  return [
    { items: [dashboardItem] },
    ...ADMIN_SIDEBAR_GROUPS.map((group) => ({
      label: group.label,
      items: modules
        .filter((m) => group.keys.includes(m.key))
        .map((m): DashboardNavItem => ({
          key: m.key,
          label: m.label,
          icon: m.icon,
          active: m.active,
          href: m.href,
          onClick: m.onClick,
        })),
    })).filter((g) => g.items.length > 0),
  ]
}

/** Footer sidebar bersama: tombol "Lihat Situs" + copyright. */
export function AdminSidebarFooter() {
  return (
    <>
      <Link
        href="/"
        target="_blank"
        title="Lihat Situs"
        className="group/link w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-primary/10 hover:text-foreground"
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="truncate">Lihat Situs</span>
        <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 opacity-0 transition-opacity group-hover/link:opacity-100" />
      </Link>
      <p className="px-3 pt-1 text-[10px] leading-relaxed text-muted-foreground/70 select-none">
        © {new Date().getFullYear()} PTDARRAHMAN
      </p>
    </>
  )
}

/**
 * Favicon dinamis dari settings (fallback logo, lalu string kosong → BrandMark
 * merender tile emerald + `ار`). Tidak ada path aset statis sesuai AGENTS.md.
 */
export function useAdminFavicon(): string {
  const [faviconUrl, setFaviconUrl] = useState('')
  useEffect(() => {
    const loadFavicon = () => {
      api.getSettings()
        .then((settings) => {
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          const logo = settings.find((s) => s.key === 'logo')?.value
          if (favicon) {
            setFaviconUrl(favicon)
          } else if (logo) {
            setFaviconUrl(logo)
          } else {
            fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.value) setFaviconUrl(String(data.value))
              })
              .catch(() => {})
          }
        })
        .catch(() => {
          fetch(`${api.API_BASE}/companyprofile/settings/favicon`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.value) setFaviconUrl(String(data.value))
            })
            .catch(() => {})
        })
    }
    loadFavicon()
    return eventBus.on('companyprofile:refresh', loadFavicon)
  }, [])
  return faviconUrl
}

export const useAdminLogo = useAdminFavicon
