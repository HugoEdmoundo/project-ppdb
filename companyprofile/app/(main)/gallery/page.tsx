import type { Metadata } from 'next'
import { Suspense } from 'react'
import GalleryClient from './_components/GalleryClient'
import { getGallery } from '@/app/lib/api'
import type { GalleryItem } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Galeri',
  description:
    'Jelajahi momen dan kenangan dari Pesantren Tahfidz Qur\'an dan Digital Arrahman. Foto kegiatan santri, fasilitas, prestasi, dan acara pesantren.',
  openGraph: {
    title: 'Galeri | PTDARRAHMAN',
    description:
      'Jelajahi momen dan kenangan dari Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
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
    title: 'Galeri | PTDARRAHMAN',
    description:
      'Jelajahi momen dan kenangan dari Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function GalleryPage() {
  let gallery: GalleryItem[] | null = null
  try { gallery = await getGallery() } catch { gallery = null }
  return (
    <Suspense>
      <GalleryClient gallery={gallery ?? []} />
    </Suspense>
  )
}
