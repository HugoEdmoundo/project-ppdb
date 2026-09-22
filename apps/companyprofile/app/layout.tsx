import type { Metadata } from "next"
import { Inter, DM_Sans, Playfair_Display, Amiri } from "next/font/google"
import "./globals.css"
import { Providers } from "./context/Providers"
import ServiceWorkerCleanup from "./components/ServiceWorkerCleanup"
import { API_BASE } from "./lib/api"
import type { SettingsItem } from "./lib/types"

async function getFavicon(): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE}/companyprofile/settings`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return undefined
    const settings: SettingsItem[] = await res.json()
    const value = settings.find((s) => s.key === 'favicon')?.value
    if (!value || value.startsWith(API_BASE)) return undefined
    return value
  } catch {
    return undefined
  }
}

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
})

const dmSans = DM_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
})

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
})

const amiri = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  fallback: ["serif"],
})

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await getFavicon()
  return {
    metadataBase: new URL('https://ptdarrahman.sch.id'),
    title: {
      default: "Pesantren Tahfidz Qur'an dan Digital Arrahman",
      template: '%s | PTDARRAHMAN',
    },
    description:
      "Pesantren Tahfidz Qur'an dan Digital Arrahman — Pesantren yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi, Jawa Barat.",
    keywords: ["pesantren", "tahfidz", "digital", "quran", "bekasi", "sekolah islam", "pondok pesantren", "arrahman"],
    authors: [{ name: 'PTDARRAHMAN' }],
    creator: 'PTDARRAHMAN',
    publisher: 'PTDARRAHMAN',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: 'https://ptdarrahman.sch.id',
    },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: 'https://ptdarrahman.sch.id',
      siteName: "Pesantren Tahfidz Qur'an dan Digital Arrahman",
      title: "Pesantren Tahfidz Qur'an dan Digital Arrahman",
      description:
        'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
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
      title: "Pesantren Tahfidz Qur'an dan Digital Arrahman",
      description:
        'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir di Bekasi.',
      images: ['https://res.cloudinary.com/dunynusuh/image/upload/v1771353749/82ed87dd-4f99-46ca-b481-775f19b6b7c9.png'],
      creator: '@ptdar_rahman',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    // Favicon dinamis dari CMS. Jika API belum tersedia saat build/cold-start,
    // fallback ke placeholder download.png di public/ — BUKAN file statis branding.
    // File app/favicon.ico dan app/icon.png sengaja TIDAK ada agar Next.js tidak
    // override favicon dinamis dengan file statis.
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${dmSans.variable} ${playfair.variable} ${amiri.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <ServiceWorkerCleanup />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-[var(--text)] focus:rounded-xl focus:shadow-xl focus:outline-none focus:text-sm focus:font-medium">
          Langsung ke konten utama
        </a>
        <Providers>
          <div id="main-content">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
