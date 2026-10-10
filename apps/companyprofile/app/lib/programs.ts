import { getPrograms } from './api'
import type { Program } from './types'

export interface KnownProgram {
  id: string
  label: string
  fallbackSlug: string
  keywords: string[]
}

export const KNOWN_PROGRAMS: KnownProgram[] = [
  { id: 'tahfidz', label: 'Tahfidz Al-Quran', fallbackSlug: 'tahfidz', keywords: ['tahfidz', 'al-quran', 'quran'] },
  { id: 'digital', label: 'Teknologi Digital', fallbackSlug: 'digital', keywords: ['digital', 'teknologi', 'it'] },
  { id: 'bilingual', label: 'Program Bilingual', fallbackSlug: 'bilingual', keywords: ['bilingual'] },
  { id: 'leadership', label: 'Akademi Kepemimpinan', fallbackSlug: 'leadership', keywords: ['kepemimpinan', 'leadership'] },
]

export function fallbackProgramSlugs(): Record<string, string> {
  return Object.fromEntries(KNOWN_PROGRAMS.map((p) => [p.id, p.fallbackSlug]))
}

export async function resolveProgramSlugs(): Promise<Record<string, string>> {
  const resolved = fallbackProgramSlugs()
  let programs: Program[] = []
  try {
    programs = await getPrograms()
  } catch {
    return resolved
  }

  const bySlug = new Map(programs.map((p) => [p.slug, p]))
  for (const known of KNOWN_PROGRAMS) {
    if (bySlug.has(known.id)) {
      resolved[known.id] = known.id
      continue
    }
    const match = programs.find((prog) => {
      const title = prog.content?.title?.toLowerCase() ?? ''
      const slug = prog.slug.toLowerCase()
      return known.keywords.some((k) => title.includes(k) || slug.includes(k))
    })
    if (match) resolved[known.id] = match.slug
  }
  return resolved
}
