export interface Staff {
  id: string
  image: string
  role: 'leader' | 'teacher' | 'alumni'
  content: {
    name: string
    position: string
    bio: string
    expertise: string[]
  }
}

export const staff: Staff[] = [
  {
    id: 'mudir',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop',
    role: 'leader',
    content: {
      name: 'KH. Ahmad Ziyad Khairy, S.E.',
      position: 'Mudir / Pimpinan Pesantren',
      bio: 'Pendiri dan pemimpin visioner Pesantren Ar-Rahman. Berdedikasi mengintegrasikan nilai-nilai Al-Quran dengan pendidikan digital modern.',
      expertise: ['Studi Quran', 'Kepemimpinan Pendidikan', 'Keuangan Syariah'],
    },
  },
  {
    id: 'kepala-sekolah',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    role: 'leader',
    content: {
      name: 'Ustadz Farrel Muhammad Rizqy',
      position: 'Kepala Sekolah',
      bio: 'Pendidik berpengalaman dengan semangat mengintegrasikan nilai-nilai Islam ke dalam kurikulum modern. Memimpin keunggulan akademik di semua program.',
      expertise: ['Desain Kurikulum', 'Pelatihan Guru', 'Psikologi Pendidikan'],
    },
  },
  {
    id: 'wakil-kurikulum',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop',
    role: 'leader',
    content: {
      name: 'Ustadz Ahmad Fauzan, M.Pd.',
      position: 'Wakil Kepala Kurikulum',
      bio: 'Spesialis kurikulum yang mengembangkan kerangka pembelajaran inovatif yang menggabungkan standar nasional dengan nilai-nilai pesantren.',
      expertise: ['Pengembangan Kurikulum', 'Desain Penilaian', 'Pendidikan STEM'],
    },
  },
  {
    id: 'tahfidz-1',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop',
    role: 'teacher',
    content: {
      name: 'Ustadz Syamsul Huda, S.Q.',
      position: 'Kepala Program Tahfidz',
      bio: 'Qari dan hafidz bersertifikat dengan sanad dari beberapa ulama terkemuka. Spesialis dalam tajwid dan qiraat.',
      expertise: ['Tahfidz 30 Juz', 'Qiraat Sab\'ah', 'Tajwid'],
    },
  },
  {
    id: 'digital-1',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1974&auto=format&fit=crop',
    role: 'teacher',
    content: {
      name: 'Rizki Pratama, S.Kom.',
      position: 'Kepala Program Digital',
      bio: 'Insinyur perangkat lunak yang beralih menjadi pendidik. Ahli dalam pengembangan full-stack dan AI dengan pengalaman industri dari perusahaan teknologi terkemuka.',
      expertise: ['Full-Stack Development', 'AI/ML', 'Robotik'],
    },
  },
  {
    id: 'bilingual-1',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
    role: 'teacher',
    content: {
      name: 'Sarah Williams, M.Ed.',
      position: 'Kepala Program Bilingual',
      bio: 'Penutur asli bahasa Inggris dengan pengalaman luas dalam pendidikan bilingual. Sebelumnya mengajar di sekolah internasional di Singapura dan Malaysia.',
      expertise: ['TESOL', 'Pendidikan Bilingual', 'Kurikulum Cambridge'],
    },
  },
  {
    id: 'leadership-1',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop',
    role: 'teacher',
    content: {
      name: 'Dr. Muhammad Al-Ghazali',
      position: 'Mentor Akademi Kepemimpinan',
      bio: 'PhD dalam Kepemimpinan Organisasi dengan pengalaman 15+ tahun mengembangkan pemimpin muda melalui program pembelajaran experiential.',
      expertise: ['Pengembangan Kepemimpinan', 'Pendidikan Karakter', 'Pemberdayaan Pemuda'],
    },
  },
  {
    id: 'alumni-1',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop',
    role: 'alumni',
    content: {
      name: 'Ustadz Abdurrahman Hakim, S.Pd.I.',
      position: 'Mantan Instruktur Tahfidz (2015-2023)',
      bio: 'Bertugas sebagai instruktur tahfidz selama 8 tahun. Sekarang melanjutkan studi di Universitas Al-Azhar, Kairo.',
      expertise: ['Tahfidz', 'Tajwid', 'Qiraat'],
    },
  },
  {
    id: 'alumni-2',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
    role: 'alumni',
    content: {
      name: 'Ustadzah Siti Rohmah, S.S.',
      position: 'Mantan Guru Bahasa Arab (2018-2024)',
      bio: 'Guru bahasa Arab berdedikasi yang pindah untuk menempuh PhD di bidang Linguistik Arab di Universitas Indonesia.',
      expertise: ['Tata Bahasa Arab', 'Sastra', 'Penerjemahan'],
    },
  },
  {
    id: 'alumni-3',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    role: 'alumni',
    content: {
      name: 'Ustadz Hendra Kurniawan, S.Kom.',
      position: 'Mantan Guru IT (2019-2024)',
      bio: 'Berperan penting dalam membangun program Teknologi Digital. Kini menjadi senior software engineer di perusahaan teknologi terkemuka.',
      expertise: ['Pemrograman', 'Jaringan', 'Robotik'],
    },
  },
  {
    id: 'quran-2',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
    role: 'teacher',
    content: {
      name: 'Ustadzah Amaniyah, Lc.',
      position: 'Instruktur Quran & Tafsir',
      bio: 'Lulusan Universitas Islam Madinah. Spesialis dalam tafsir dan sastra Arab dengan pendekatan pengajaran yang lembut.',
      expertise: ['Tafsir Al-Quran', 'Sastra Arab', 'Tahsin'],
    },
  },
]
