export interface Program {
  id: string
  slug: string
  icon: string
  image: string
  content: {
    title: string
    tagline: string
    desc: string
    duration: string
    level: string
    highlights: string[]
    curriculum: string[]
    outcomes: string[]
  }
}

export const programs: Program[] = [
  {
    id: 'tahfidz',
    slug: 'tahfidz',
    icon: 'book-quran',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Tahfidz Al-Quran',
      tagline: 'Hafal Al-Quran dengan tajwid dan tafsir yang benar',
      desc: 'Program hafalan Al-Quran komprehensif yang dirancang untuk melahirkan huffaz yang tidak hanya menghafal tetapi memahami dan mengamalkan Al-Quran. Siswa dibimbing oleh instruktur qari dan hafidz bersertifikat.',
      duration: '6 Tahun',
      level: 'SMP - SMA (Program 6 Tahun)',
      highlights: [
        'Target hafalan 30 Juz',
        'Sesi murajaah (pengulangan) harian',
        'Intensif Tajwid & Tashih',
        'Studi Tafsir Al-Quran',
        'Bahasa Arab Al-Quran',
        'Tahsin & Qiraat Sab\'ah',
      ],
      curriculum: [
        'Tahfidz 30 Juz',
        'Tajwid & Makharijul Huruf',
        'Tafsir Al-Mishbah',
        'Tata Bahasa Arab Quran',
        'Hadits Arba\'in',
        'Fiqih Ibadah',
        'Adab & Akhlak Islami',
        'Imamah & Khitabah',
      ],
      outcomes: [
        'Hafal 30 Juz Al-Quran',
        'Menguasai tajwid secara teoritis & praktis',
        'Mampu memimpin doa & shalat',
        'Memahami tafsir ayat-ayat pilihan',
        'Berakhlak mulia dengan nilai-nilai Quran',
      ],
    },
  },
  {
    id: 'digital',
    slug: 'digital',
    icon: 'laptop-code',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Teknologi Digital',
      tagline: 'Kuasi coding, AI, dan inovasi digital',
      desc: 'Program teknologi mutakhir yang mempersiapkan siswa untuk era digital. Dari dasar coding hingga kecerdasan buatan, siswa mengembangkan keterampilan teknis yang siap masa depan.',
      duration: '6 Tahun',
      level: 'SMP - SMA (6 Year Program)',
      highlights: [
        'Coding & Pemrograman',
        'Kecerdasan Buatan (AI)',
        'Robotik & IoT',
        'Desain Digital',
        'Keamanan Siber',
        'Pengembangan Startup',
      ],
      curriculum: [
        'Computational Thinking',
        'Python & JavaScript',
        'Web & Mobile Development',
        'AI & Machine Learning',
        'Teknik Robotik',
        'Desain UI/UX',
        'Pemasaran Digital',
        'Kewirausahaan Teknologi',
      ],
      outcomes: [
        'Menguasai minimal 2 bahasa pemrograman',
        'Mampu membangun website & aplikasi',
        'Memahami konsep AI & machine learning',
        'Mampu merakit & memprogram robot',
        'Siap bersaing di era digital global',
      ],
    },
  },
  {
    id: 'leadership',
    slug: 'leadership',
    icon: 'users',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Akademi Kepemimpinan',
      tagline: 'Bangun karakter dan pimpin dengan dampak',
      desc: 'Program pengembangan kepemimpinan premium yang menumbuhkan kepercayaan diri, karakter, dan visi. Siswa terlibat dalam proyek nyata dan inisiatif komunitas.',
      duration: '6 Tahun',
      level: 'SMP - SMA (Program 6 Tahun)',
      highlights: [
        'Pembangunan Karakter',
        'Kepemimpinan Proyek',
        'Perusahaan Sosial',
        'Public Speaking',
        'Pengabdian Masyarakat',
        'Jejaring Global',
      ],
      curriculum: [
        'Teori Kepemimpinan',
        'Kecerdasan Emosional',
        'Resolusi Konflik',
        'Manajemen Proyek',
        'Kewirausahaan Sosial',
        'Keterampilan Negosiasi',
        'Kepemimpinan Sipil',
        'Kewarganegaraan Global',
      ],
      outcomes: [
        'Memimpin tim & organisasi',
        'Mengelola proyek sosial',
        'Public speaking yang percaya diri',
        'Jiwa wirausaha sosial',
        'Jejaring global & kepemimpinan',
      ],
    },
  },
]
