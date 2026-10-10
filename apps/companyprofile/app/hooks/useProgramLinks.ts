'use client'

import { useEffect, useState } from 'react'
import { KNOWN_PROGRAMS, resolveProgramSlugs } from '@/app/lib/programs'

export function useProgramLinks() {
  const [slugs, setSlugs] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    resolveProgramSlugs()
      .then((s) => {
        if (active) setSlugs(s)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const hrefFor = (id: string): string => {
    const slug = slugs[id] ?? KNOWN_PROGRAMS.find((p) => p.id === id)?.fallbackSlug ?? id
    return `/programs/${slug}`
  }

  return { hrefFor }
}
