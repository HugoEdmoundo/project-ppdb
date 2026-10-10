import { getPrograms } from './api'
import type { Program, ProgramContent } from './types'

const FALLBACK_CONTENT: Record<string, ProgramContent> = {
  tahfidz: {
    title: 'Tahfidz Al-Quran',
    tagline: 'Menghafal Al-Quran dengan target dan pendampingan',
    desc: 'Program tahfidz terstruktur dengan target hafalan harian, murojaah terjadwal, dan evaluasi berkala oleh pengajar.',
    duration: '6 Tahun',
    level: 'Semua Jenjang',
    highlights: ['Setoran harian', 'Murojaah terstruktur', 'Evaluasi berkala'],
    curriculum: ['Hafalan 30 Juz', 'Tahsin & Qiraat', 'Kajian Tafsir'],
    outcomes: ['Khatam Al-Quran', 'Melancarkan tilawah', 'Aktif berdakwah'],
  },
  digital: {
    title: 'Teknologi Digital',
    tagline: 'Literasi digital dan pemrograman sejak dini',
    desc: 'Santri dibekali keterampilan teknologi dan pemrograman untuk menghadapi masa depan digital.',
    duration: '6 Tahun',
    level: 'Semua Jenjang',
    highlights: ['Coding & Programming', 'AI & Robotic', 'Etika Digital'],
    curriculum: ['Dasar Komputer', 'Web & App Development', 'AI & Data'],
    outcomes: ['Membuat proyek digital', 'Literasi teknologi', 'Inovasi kreatif'],
  },
  bilingual: {
    title: 'Program Bilingual',
    tagline: 'Bahasa Arab dan Inggris aktif setiap hari',
    desc: 'Program bilingual melatih santri berkomunikasi bahasa Arab dan Inggris dalam aktivitas harian.',
    duration: '6 Tahun',
    level: 'Semua Jenjang',
    highlights: ['Bahasa aktif', 'Percakapan harian', 'Literasi bahasa'],
    curriculum: ['Arabic & English', 'Muhadatsah', 'Grammar'],
    outcomes: ['Public speaking', 'Komunikasi bilingual', 'Wawasan global'],
  },
  leadership: {
    title: 'Akademi Kepemimpinan',
    tagline: 'Membentuk akhlak dan jiwa kepemimpinan',
    desc: 'Akademi kepemimpinan membentuk karakter santri melalui organisasi, camp, dan pelayanan masyarakat.',
    duration: '6 Tahun',
    level: 'Semua Jenjang',
    highlights: ['Leadership Camp', 'Organisasi Santri', 'Pelayanan Masyarakat'],
    curriculum: ['Akhlak & Adab', 'Manajemen Diri', 'Public Speaking'],
    outcomes: ['Pemimpin santun', 'Tanggung jawab', 'Berjiwa sosial'],
  },
}

const FALLBACK_ICONS: Record<string, string> = {
  tahfidz: 'book-quran',
  digital: 'laptop-code',
  bilingual: 'language',
  leadership: 'users',
}

export function fallbackProgram(slug: string): Program | null {
  const content = FALLBACK_CONTENT[slug]
  if (!content) return null
  return { id: slug, slug, icon: FALLBACK_ICONS[slug] ?? 'book-quran', image: '', content }
}


export interface KnownProgram {
  id: string
  label: string
  fallbackSlug: string
  keywords: string[]
}

export const KNOWN_PROGRAMS: KnownProgram[] = [
  { id: 'tahfidz', label: 'Tahfidz Al-Quran', fallbackSlug: 'tahfidz', keywords: ['tahfidz', 'al-quran', 'quran'] },
  { id: 'digital', label: 'Teknologi Digital', fallbackSlug: 'digital', keywords: ['digital', 'teknologi', 'it'] },
  { id: 'bilingual', label: 'Program Bilingual', fallbackSlug: 'bilingual', keywords: ['bilingual'] },
  { id: 'leadership', label: 'Akademi Kepemimpinan', fallbackSlug: 'leadership', keywords: ['kepemimpinan', 'leadership'] },
]

export function fallbackProgramSlugs(): Record<string, string> {
  return Object.fromEntries(KNOWN_PROGRAMS.map((p) => [p.id, p.fallbackSlug]))
}

export async function resolveProgramSlugs(): Promise<Record<string, string>> {
  const resolved = fallbackProgramSlugs()
  let programs: Program[] = []
  try {
    programs = await getPrograms()
  } catch {
    return resolved
  }

  const bySlug = new Map(programs.map((p) => [p.slug, p]))
  for (const known of KNOWN_PROGRAMS) {
    if (bySlug.has(known.id)) {
      resolved[known.id] = known.id
      continue
    }
    const match = programs.find((prog) => {
      const title = prog.content?.title?.toLowerCase() ?? ''
      const slug = prog.slug.toLowerCase()
      return known.keywords.some((k) => title.includes(k) || slug.includes(k))
    })
    if (match) resolved[known.id] = match.slug
  }
  return resolved
}
