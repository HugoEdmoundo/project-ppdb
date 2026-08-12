import type { Metadata } from 'next'
import { Suspense } from 'react'
import StaffClient from './_components/StaffClient'
import { getStaff } from '@/app/lib/api'
import type { Staff } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Guru & Staff',
  description:
    'Kenali tim pendidik dan profesional berdedikasi PTDARRAHMAN yang berkomitmen membentuk pemimpin masa depan. Pimpinan, guru, dan alumni pesantren.',
  openGraph: {
    title: 'Guru & Staff | PTDARRAHMAN',
    description:
      'Kenali tim pendidik dan profesional berdedikasi PTDARRAHMAN yang berkomitmen membentuk pemimpin masa depan.',
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
    title: 'Guru & Staff | PTDARRAHMAN',
    description:
      'Kenali tim pendidik dan profesional berdedikasi PTDARRAHMAN yang berkomitmen membentuk pemimpin masa depan.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function StaffPage() {
  let staff: Staff[] | null = null
  try { staff = await getStaff() } catch { staff = null }
  return (
    <Suspense>
      <StaffClient staff={staff ?? []} />
    </Suspense>
  )
}
