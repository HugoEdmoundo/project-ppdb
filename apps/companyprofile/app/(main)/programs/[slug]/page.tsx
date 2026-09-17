import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProgramsCached } from '@/app/lib/api'
import type { Program } from '@/app/lib/types'
import ProgramDetailClient from './_components/ProgramDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  let programs: Program[] | null = null
  try { programs = await getProgramsCached() } catch { programs = null }
  const program = (programs ?? []).find((p) => p.slug === slug)
  if (!program) {
    return { title: 'Program Tidak Ditemukan' }
  }
  return {
    title: program.content?.title,
    description: program.content?.desc,
    openGraph: {
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      images: [
        {
          url: program.image,
          width: 1200,
          height: 630,
          alt: program.content?.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${program.content?.title} | PTDARRAHMAN`,
      description: program.content?.desc,
      images: [program.image],
    },
  }
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let programs: Program[] | null = null
  try { programs = await getProgramsCached() } catch { programs = null }
  const program = (programs ?? []).find((p) => p.slug === slug)
  if (!program) notFound()
  return <ProgramDetailClient program={program} />
}
