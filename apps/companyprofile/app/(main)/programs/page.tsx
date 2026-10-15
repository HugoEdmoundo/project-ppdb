import type { Metadata } from 'next'
import ProgramsClient from './_components/ProgramsClient'
import { getPrograms } from '@/app/lib/api'
import { fallbackPrograms } from '@/app/lib/programs'
import type { Program } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Program Kami',
  description:
    'Jelajahi program unggulan PTDARRAHMAN: Tahfidz Al-Quran, Teknologi Digital, Program Bilingual, dan Akademi Kepemimpinan. Program terpadu 6 tahun SMP-SMA.',
  openGraph: {
    title: 'Program Kami | PTDARRAHMAN',
    description:
      'Jelajahi program unggulan PTDARRAHMAN: Tahfidz Al-Quran, Teknologi Digital, Program Bilingual, dan Akademi Kepemimpinan.',
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
    title: 'Program Kami | PTDARRAHMAN',
    description:
      'Jelajahi program unggulan PTDARRAHMAN: Tahfidz Al-Quran, Teknologi Digital, Program Bilingual, dan Akademi Kepemimpinan.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function ProgramsPage() {
  let programs: Program[] | null = null
  try { programs = await getPrograms() } catch { programs = null }
  // Data API selalu menang kalau ada — CRUD tidak berubah. Cadangan hanya
  // menyala saat fetch gagal atau kosong, supaya halaman ini tidak kosong
  // total di antara navbar dan footer.
  return <ProgramsClient programs={programs?.length ? programs : fallbackPrograms()} />
}
