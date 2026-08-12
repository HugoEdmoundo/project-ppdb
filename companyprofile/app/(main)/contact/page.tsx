import type { Metadata } from 'next'
import { Suspense } from 'react'
import ContactClient from './_components/ContactClient'
import { getContactInfo, getSocialLinks } from '@/app/lib/api'
import type { ContactInfo, SocialLink } from '@/app/lib/types'

export const metadata: Metadata = {
  title: 'Hubungi Kami',
  description:
    'Hubungi Pesantren Tahfidz Qur\'an dan Digital Arrahman untuk informasi pendaftaran, kunjungan sekolah, atau pertanyaan lainnya. Alamat: Rukan Hexa Green Kalimalang, Bekasi. Telepon: (021) 812-8361-2352.',
  openGraph: {
    title: 'Hubungi Kami | PTDARRAHMAN',
    description:
      'Hubungi Pesantren Tahfidz Qur\'an dan Digital Arrahman untuk informasi pendaftaran dan kunjungan sekolah.',
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
    title: 'Hubungi Kami | PTDARRAHMAN',
    description:
      'Hubungi Pesantren Tahfidz Qur\'an dan Digital Arrahman untuk informasi pendaftaran dan kunjungan sekolah.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function ContactPage() {
  let contactInfo: ContactInfo | null = null
  let socialLinks: SocialLink[] | null = null
  try { contactInfo = await getContactInfo() } catch { contactInfo = null }
  try { socialLinks = await getSocialLinks() } catch { socialLinks = null }
  return (
    <Suspense>
      <ContactClient contactInfo={contactInfo} socialLinks={socialLinks ?? []} />
    </Suspense>
  )
}
