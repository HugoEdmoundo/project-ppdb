import type { Metadata } from 'next'
import { Suspense } from 'react'
import AchievementsClient from './_components/AchievementsClient'
import { getAchievements } from '@/app/lib/api'
import type { Achievement } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Prestasi',
  description:
    'Prestasi santri PTDARRAHMAN di tingkat provinsi, nasional, dan internasional. Juara olimpiade sains, kompetisi tahfidz, robotik, dan bidang akademik lainnya.',
  openGraph: {
    title: 'Prestasi | PTDARRAHMAN',
    description:
      'Prestasi santri PTDARRAHMAN di tingkat provinsi, nasional, dan internasional.',
    images: [
      {
        url: 'https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png',
        width: 512,
        height: 512,
        alt: 'Logo Ar-Rahman',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prestasi | PTDARRAHMAN',
    description:
      'Prestasi santri PTDARRAHMAN di tingkat provinsi, nasional, dan internasional.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function AchievementsPage() {
  let achievements: Achievement[] | null = null
  try { achievements = await getAchievements() } catch { achievements = null }
  return (
    <Suspense>
      <AchievementsClient achievements={achievements ?? []} />
    </Suspense>
  )
}
