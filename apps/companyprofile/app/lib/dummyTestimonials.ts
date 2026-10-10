import type { Testimonial } from '@/app/lib/types'

const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=640&auto=format&fit=crop`

const DUMMY_TESTIMONIALS: Testimonial[] = [
  {
    id: 'dummy-testi-1',
    name: 'H. Ahmad Fauzi',
    child: 'Muhammad Rizky · Santri SMP',
    image: U('1507003211169-0a1dd7228f2d'),
    order: 1,
    content: {
      quote:
        'Alhamdulillah, dalam dua tahun Rizky sudah hafal 10 juz dan cepat memahami teknologi. Pola asuh yang seimbang antara Qur\'an dan digital benar-benar terlihat nyata.',
    },
  },
  {
    id: 'dummy-testi-2',
    name: 'Ibu Siti Rahayu',
    child: 'Aisyah Putri · Santri SMK',
    image: U('1580489944761-15a19d654956'),
    order: 2,
    content: {
      quote:
        'Aisyah sangat betah di sini. Selain kelancaran hafalannya, dia kini pandai coding dan percaya diri presentasi di depan umum. Terima kasih para pembimbing yang telaten.',
    },
  },
  {
    id: 'dummy-testi-3',
    name: 'Bapak Dedi Kurniawan',
    child: 'Fathurrahman · Santri SMP',
    image: U('1500648767791-00dcc994a43e'),
    order: 3,
    content: {
      quote:
        'Fathur lebih mandiri dan disiplin sejak masuk Ar-Rahman. Hafalan 30 juz-nya terus bergerak maju, dan yang membuat kami kagum, akhlaknya juga makin terjaga.',
    },
  },
  {
    id: 'dummy-testi-4',
    name: 'Ibu Nurul Hidayati',
    child: 'Salma Aulia · Santri SMK',
    image: U('1589156280159-27698a70f29e'),
    order: 4,
    content: {
      quote:
        'Keseimbangan dunia dan akhirat sungguh dijaga di sini. Salma belajar Al-Quran setiap pagi, lalu mengasah keterampilan teknologi di sore hari. Sangat direkomendasikan.',
    },
  },
  {
    id: 'dummy-testi-5',
    name: 'Bapak Hendra Wijaya',
    child: 'Abizar · Santri SMP',
    image: U('1633332755192-727a05c4013d'),
    order: 5,
    content: {
      quote:
        'Anak saya anak yang baru masuk dunia teknologi. Di pesantren ini ia diajarkan dari nol hingga mampu membuat aplikasi sederhana. Fasilitas lab-nya lengkap dan pembinanya sabar.',
    },
  },
  {
    id: 'dummy-testi-6',
    name: 'Ibu Maya Sartika',
    child: 'Khadijah · Santri SMK',
    image: U('1573496359142-b8d87734a5a2'),
    order: 6,
    content: {
      quote:
        'Khadijah tumbuh menjadi pribadi yang berprinsip. Pengawasan asrama 24 jam membuat kami tenang, dan komunikasi wali santri sangat transparan. Barakallah.',
    },
  },
]

export function getTestimonialsDummyFallback(testimonials: Testimonial[] | null): Testimonial[] {
  return testimonials && testimonials.length > 0 ? testimonials : DUMMY_TESTIMONIALS
}
