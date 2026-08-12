export interface GalleryItem {
  id: string
  image: string
  category: 'campus' | 'academic' | 'sports' | 'arts' | 'events'
  content: { title: string }
}

export const galleryItems: GalleryItem[] = [
  { id: '1', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop', category: 'campus', content: { title: 'Gedung Utama' } },
  { id: '2', image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop', category: 'academic', content: { title: 'Lab Komputer' } },
  { id: '3', image: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop', category: 'academic', content: { title: 'Lab Sains' } },
  { id: '4', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop', category: 'campus', content: { title: 'Perpustakaan' } },
  { id: '5', image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop', category: 'sports', content: { title: 'Kompleks Olahraga' } },
  { id: '6', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop', category: 'events', content: { title: 'Acara Auditorium' } },
  { id: '7', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop', category: 'arts', content: { title: 'Studio Seni' } },
  { id: '8', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop', category: 'academic', content: { title: 'Kelas Coding' } },
  { id: '9', image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop', category: 'events', content: { title: 'Pengajian Quran' } },
  { id: '10', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop', category: 'campus', content: { title: 'Asrama' } },
  { id: '11', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2070&auto=format&fit=crop', category: 'sports', content: { title: 'Hari Olahraga' } },
  { id: '12', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop', category: 'academic', content: { title: 'Kelas Bahasa' } },
]
