import type { Facility } from '@/app/lib/types'

const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1600&auto=format&fit=crop`

const DUMMY_FACILITIES: Facility[] = [
  {
    id: 'dummy-fac-1',
    image: U('1519817650390-64a93db51149'),
    category: 'worship',
    content: {
      name: 'Masjid Raya',
      desc: 'Masjid luas ber-AC untuk shalat lima waktu, kajian, dan murajaah.',
      features: ['Kapasitas 1.200 jamaah', 'Imam & bilal profesional', 'Audio berkualitas studio'],
    },
  },
  {
    id: 'dummy-fac-2',
    image: U('1521587760476-6c12a4b040da'),
    category: 'academic',
    content: {
      name: 'Perpustakaan Digital',
      desc: 'Perpustakaan dengan 50.000+ koleksi fisik dan digital untuk riset santri.',
      features: ['50.000+ koleksi', 'Ruang baca senyap', 'Akses jurnal online'],
    },
  },
  {
    id: 'dummy-fac-3',
    image: U('1588072432836-e10032774350'),
    category: 'tech',
    content: {
      name: 'Lab Komputer',
      desc: 'Workstation berkinerja tinggi untuk kelas coding, AI, dan keamanan siber.',
      features: ['PC spesifikasi tinggi', 'Jaringan 1 Gbps', 'Mentor praktisi industri'],
    },
  },
  {
    id: 'dummy-fac-4',
    image: U('1555854877-bab0e564b8d5'),
    category: 'boarding',
    content: {
      name: 'Asrama Modern',
      desc: 'Asrama nyaman dan aman dengan pengawasan pembina 24 jam.',
      features: ['Pengawasan 24 jam', 'Kamar ber-AC', 'Kantin sehat'],
    },
  },
  {
    id: 'dummy-fac-5',
    image: U('1530435460869-d13625c69bbf'),
    category: 'sports',
    content: {
      name: 'Lapangan Olahraga',
      desc: 'Sarana olahraga lengkap untuk menjaga kebugaran santri.',
      features: ['Lapangan futsal', 'Lapangan basket', 'Area jogging'],
    },
  },
  {
    id: 'dummy-fac-6',
    image: U('1503676260728-1c00da094a0b'),
    category: 'academic',
    content: {
      name: 'Ruang Kelas Modern',
      desc: 'Ruang kelas interaktif dengan smartboard dan penataan kelas aktif.',
      features: ['Smartboard', 'Kelas kecil (maks 20)', 'Sirkulasi udara baik'],
    },
  },
  {
    id: 'dummy-fac-7',
    image: U('1518770660439-4636190af475'),
    category: 'tech',
    content: {
      name: 'Studio Robotik & AI',
      desc: 'Studio khusus eksperimen robotik, IoT, dan project artificial intelligence.',
      features: ['Kit robotik lengkap', '3D printer', 'Maker space'],
    },
  },
  {
    id: 'dummy-fac-8',
    image: U('1566665797739-1674de7a421a'),
    category: 'worship',
    content: {
      name: 'Musholla Santri',
      desc: 'Musholla per asrama untuk salat berjamaah dan tahajud bersama.',
      features: ['Tahajud berjamaah', 'Kajian rutin', 'Suasana khusyuk'],
    },
  },
]

export function getFacilitiesDummyFallback(facilities: Facility[] | null): Facility[] {
  return facilities && facilities.length > 0 ? facilities : DUMMY_FACILITIES
}