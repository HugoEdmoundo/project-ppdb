import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProgramsCached } from '@/app/lib/api'
import { fallbackProgram, KNOWN_PROGRAMS } from '@/app/lib/programs'
import type { Program } from '@/app/lib/types'
import ProgramDetailClient from './_components/ProgramDetailClient'

async function findProgram(slug: string): Promise<Program | null> {
  let programs: Program[] | null = null
  try { programs = await getProgramsCached() } catch { programs = null }
  const list = programs ?? []
  const direct = list.find((p) => p.slug === slug)
  if (direct) return direct
  const known = KNOWN_PROGRAMS.find((k) => k.fallbackSlug === slug)
  if (known) {
    const match = list.find((prog) => {
      const title = prog.content?.title?.toLowerCase() ?? ''
      const s = prog.slug.toLowerCase()
      return known.keywords.some((k) => title.includes(k) || s.includes(k))
    })
    if (match) return match
    return fallbackProgram(slug)
  }
  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const program = await findProgram(slug)
  if (!program) {
    return { title: 'Program Tidak Ditemukan' }
  }
  return {
    title: program.content?.title,
    description: program.content?.desc,
    openGraph: {
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      ...(program.image
        ? { images: [{ url: program.image, width: 1200, height: 630, alt: program.content?.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      ...(program.image ? { images: [program.image] } : {}),
    },
  }
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const program = await findProgram(slug)
  if (!program) notFound()
  return <ProgramDetailClient program={program} />
}
