import { useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * Decorative, dependency-free SVG layers for the public landing hero.
 * Nothing here loads external assets — the whole hero renders offline and
 * inside Docker without any CDN.
 */

/** Repeating 8-point star (khatam) girih tile, used as a faint texture wash. */
export function ArabesquePattern({ className }: { className?: string }) {
  const patternId = useId()

  return (
    <svg className={cn('h-full w-full', className)} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={patternId} width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="21" y="21" width="30" height="30" />
            <rect x="21" y="21" width="30" height="30" transform="rotate(45 36 36)" />
            <circle cx="36" cy="36" r="2.5" />
            <circle cx="0" cy="0" r="1.5" />
            <circle cx="72" cy="0" r="1.5" />
            <circle cx="0" cy="72" r="1.5" />
            <circle cx="72" cy="72" r="1.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

/** Pointed-arch (mihrab) outline framing the hero copy. */
export function MihrabArch({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-full w-full', className)}
      viewBox="0 0 200 280"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 276V104C4 52 44 8 100 4c56 4 96 48 96 100v172" />
        <path d="M18 276V108c0-45 34-84 82-88 48 4 82 43 82 88v168" opacity="0.6" />
        <path d="M100 4V-14" opacity="0.6" />
      </g>
      <g fill="currentColor">
        <circle cx="100" cy="40" r="3" />
        <path d="M100 20l4.5 9.5 10.5 1.5-7.5 7.3 1.8 10.4-9.3-4.9-9.3 4.9 1.8-10.4-7.5-7.3 10.5-1.5z" />
      </g>
    </svg>
  )
}
