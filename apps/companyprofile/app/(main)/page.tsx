import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HeroSection from '@/app/components/sections/HeroSection'
import AboutPreview from '@/app/components/sections/AboutPreview'
import ProgramsPreview from '@/app/components/sections/ProgramsPreview'
import FacilitiesPreview from '@/app/components/sections/FacilitiesPreview'
import StatsSection from '@/app/components/sections/StatsSection'
import { getTestimonials, getPrograms, getFacilities, getSettings } from '@/app/lib/api'
import { getTestimonialsDummyFallback } from '@/app/lib/dummyTestimonials'
import { fetchActivePpdbWave } from '@/app/lib/ppdb'
import type { Testimonial, Program, Facility, SettingsItem } from '@/app/lib/types'

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
  const [wave, rawTestimonials, programs, facilities, settings] = await Promise.all([
    fetchActivePpdbWave().catch(() => null),
    getTestimonials().catch(() => null),
    getPrograms().catch(() => [] as Program[]),
    getFacilities().catch(() => [] as Facility[]),
    getSettings().catch(() => [] as SettingsItem[]),
  ])

  const testimonials = getTestimonialsDummyFallback(rawTestimonials)

  // Map settings ke object dictionary
  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value
    return acc
  }, {} as Record<string, string>)

  return (
    <>
      <HeroSection wave={wave} />
      <div className="verse-divider" />
      <AboutPreview settings={settingsMap} />
      <StatsSection settings={settingsMap} />
      <ProgramsPreview programs={programs ?? []} />
      <FacilitiesPreview facilities={facilities ?? []} />
      <TestimonialsCarousel testimonials={testimonials ?? []} />
      <CTASection wave={wave} />
    </>
  )
}
