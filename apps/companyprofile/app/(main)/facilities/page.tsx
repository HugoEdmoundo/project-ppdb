import type { Metadata } from 'next'
import { Suspense } from 'react'
import FacilitiesClient from './_components/FacilitiesClient'
import { getFacilities } from '@/app/lib/api'
import { getFacilitiesDummyFallback } from '@/app/lib/dummyFacilities'
import type { Facility } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Fasilitas Kami',
  description:
    'Jelajahi fasilitas kelas dunia PTDARRAHMAN: Lab Komputer, Lab Sains, Perpustakaan Digital, Masjid, Kompleks Olahraga, Auditorium, Asrama, dan Studio Seni & Musik.',
  openGraph: {
    title: 'Fasilitas Kami | PTDARRAHMAN',
    description:
      'Jelajahi fasilitas kelas dunia PTDARRAHMAN untuk mendukung pembelajaran, kreativitas, dan pertumbuhan spiritual.',
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
    title: 'Fasilitas Kami | PTDARRAHMAN',
    description:
      'Jelajahi fasilitas kelas dunia PTDARRAHMAN untuk mendukung pembelajaran, kreativitas, dan pertumbuhan spiritual.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function FacilitiesPage() {
  let facilities: Facility[] | null = null
  try { facilities = await getFacilities() } catch { facilities = null }
  facilities = getFacilitiesDummyFallback(facilities)
  return (
    <Suspense>
      <FacilitiesClient facilities={facilities ?? []} />
    </Suspense>
  )
}
