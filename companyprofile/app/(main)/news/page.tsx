import type { Metadata } from 'next'
import NewsClient from './_components/NewsClient'
import { getNews } from '@/app/lib/api'
import type { NewsArticle } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Berita & Blog',
  description:
    'Ikuti berita terbaru, prestasi, dan acara di Pesantren Tahfidz Qur\'an dan Digital Arrahman. Update kegiatan santri, lomba, dan kegiatan pesantren.',
  openGraph: {
    title: 'Berita & Blog | PTDARRAHMAN',
    description:
      'Ikuti berita terbaru, prestasi, dan acara di Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
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
    title: 'Berita & Acara | PTDARRAHMAN',
    description:
      'Ikuti berita terbaru, prestasi, dan acara di Pesantren Tahfidz Qur\'an dan Digital Arrahman.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function NewsPage() {
  let news: NewsArticle[] | null = null
  try { news = await getNews() } catch { news = null }
  return <NewsClient news={news ?? []} />
}
