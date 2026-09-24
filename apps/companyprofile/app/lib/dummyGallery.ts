import type { GalleryItem } from '@/app/lib/types'

const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`

const DUMMY_GALLERY: GalleryItem[] = [
  {
    id: 'dummy-campus-1',
    image: U('1524178232363-1fb2b075b655'),
    category: 'campus',
    content: { title: 'Kampus Ar-Rahman' },
  },
  {
    id: 'dummy-academic-1',
    image: U('1509062522246-3755977927d7'),
    category: 'academic',
    content: { title: 'Kelas Tahfidz' },
  },
  {
    id: 'dummy-sports-1',
    image: U('1571902943202-507ec2618e8f'),
    category: 'sports',
    content: { title: 'Olahraga Santri' },
  },
  {
    id: 'dummy-campus-2',
    image: U('1589182373726-e4f658ab50f0'),
    category: 'campus',
    content: { title: 'Halaman Pesantren' },
  },
  {
    id: 'dummy-academic-2',
    image: U('1517694712202-14dd9538aa97'),
    category: 'academic',
    content: { title: 'Lab Komputer' },
  },
  {
    id: 'dummy-events-1',
    image: U('1540575467063-178a50c2df87'),
    category: 'events',
    content: { title: 'Kegiatan Santri' },
  },
  {
    id: 'dummy-arts-1',
    image: U('1513360377869-d86c94b6c4c9'),
    category: 'arts',
    content: { title: 'Seni & Kaligrafi' },
  },
  {
    id: 'dummy-academic-3',
    image: U('1503676260728-1c00da094a0b'),
    category: 'academic',
    content: { title: 'Belajar Kelas' },
  },
  {
    id: 'dummy-events-2',
    image: U('1492684223066-81342ee5ff30'),
    category: 'events',
    content: { title: 'Acara Pesantren' },
  },
  {
    id: 'dummy-campus-3',
    image: U('1523050854058-8df90110c9f1'),
    category: 'campus',
    content: { title: 'Wisuda Santri' },
  },
]

export function getGalleryDummyFallback(gallery: GalleryItem[] | null): GalleryItem[] {
  return gallery && gallery.length > 0 ? gallery : DUMMY_GALLERY
}