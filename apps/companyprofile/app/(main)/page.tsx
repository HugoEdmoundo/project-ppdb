import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HeroSection from '@/app/components/sections/HeroSection'
import AboutPreview from '@/app/components/sections/AboutPreview'
import ProgramsPreview from '@/app/components/sections/ProgramsPreview'
import FacilitiesPreview from '@/app/components/sections/FacilitiesPreview'
import { getTestimonials } from '@/app/lib/api'
import { getTestimonialsDummyFallback } from '@/app/lib/dummyTestimonials'
import { fetchActivePpdbWave } from '@/app/lib/ppdb'
import type { Testimonial } from '@/app/lib/types'

const TestimonialsCarousel = dynamic(() => import('@/app/components/sections/TestimonialsCarousel'))
const CTASection = dynamic(() => import('@/app/components/sections/CTASection'))

export const metadata: Metadata = {
  description:
    "Pesantren Tahfidz Qur\'an dan Digital Arrahman — Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi, Jawa Barat.",
  openGraph: {
    title: 'Pesantren Tahfidz Qur\'an dan Digital Arrahman',
    description:
      'Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
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
    title: 'Pesantren Tahfidz Qur\'an dan Digital Arrahman',
    description:
      'Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
    images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
  },
}

export default async function Home() {
  let testimonials: Testimonial[] | null = null
  try { testimonials = await getTestimonials() } catch { testimonials = null }
  testimonials = getTestimonialsDummyFallback(testimonials)
  // Tahun ajaran & tanggal PPDB diambil dari backend, bukan diketik di sini.
  const wave = await fetchActivePpdbWave()
  return (
    <>
      <HeroSection wave={wave} />
      <div className="verse-divider" />
      <AboutPreview />
      <ProgramsPreview />
      <FacilitiesPreview />
      <div className="verse-divider" />
      <TestimonialsCarousel testimonials={testimonials ?? []} />
      <CTASection wave={wave} />
    </>
  )
}
