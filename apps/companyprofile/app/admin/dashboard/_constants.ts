import {
  Newspaper, GraduationCap, Building2, Users, Trophy,
  Image as ImageIcon, MessageSquare, Link as LinkIcon, Phone, Settings,
} from 'lucide-react'
import * as api from '@/app/lib/api'
import type { TabDef } from './_types'

export const TABS: TabDef[] = [
  { key: 'news', label: 'Berita', endpoint: '/news', fetch: api.getNews, icon: Newspaper },
  { key: 'programs', label: 'Program', endpoint: '/programs', fetch: api.getPrograms, icon: GraduationCap },
  { key: 'facilities', label: 'Fasilitas', endpoint: '/facilities', fetch: api.getFacilities, icon: Building2 },
  { key: 'staff', label: 'Staff', endpoint: '/staff', fetch: api.getStaff, icon: Users },
  { key: 'achievements', label: 'Prestasi', endpoint: '/achievements', fetch: api.getAchievements, icon: Trophy },
  { key: 'gallery', label: 'Galeri', endpoint: '/gallery', fetch: api.getGallery, icon: ImageIcon },
  { key: 'testimonials', label: 'Testimoni', endpoint: '/testimonials', fetch: api.getTestimonials, icon: MessageSquare },
  { key: 'social', label: 'Tautan Sosial', endpoint: '/social-links', fetch: api.getSocialLinks, icon: LinkIcon },
  { key: 'contact', label: 'Info Kontak', endpoint: '/contact-info', fetch: api.getContactInfo, icon: Phone },
  { key: 'settings', label: 'Pengaturan', endpoint: '/settings', fetch: api.getAdminSettings, icon: Settings },
]

export const HAS_CONTENT: string[] = [
  'news', 'programs', 'facilities', 'staff', 'achievements', 'gallery', 'testimonials',
]

export const TABLE_COLS: Record<string, { label: string; accessor: (item: import('./_types').RowRecord) => string | undefined }[]> = {
  news: [
    { label: 'Judul', accessor: (i) => i.content?.title || '' },
    { label: 'Slug', accessor: (i) => i.slug },
    { label: 'Kategori', accessor: (i) => i.category },
    { label: 'Tanggal', accessor: (i) => i.date },
  ],
  programs: [
    { label: 'Judul', accessor: (i) => i.content?.title || '' },
    { label: 'Slug', accessor: (i) => i.slug },
  ],
  facilities: [
    { label: 'Nama', accessor: (i) => i.content?.name || '' },
    { label: 'Kategori', accessor: (i) => i.category },
  ],
  staff: [
    { label: 'Nama', accessor: (i) => i.content?.name || '' },
    { label: 'Peran', accessor: (i) => i.role },
  ],
  achievements: [
    { label: 'Judul', accessor: (i) => i.content?.title || '' },
    { label: 'Tahun', accessor: (i) => String(i.year) },
  ],
  gallery: [
    { label: 'Judul', accessor: (i) => i.content?.title || '' },
    { label: 'Kategori', accessor: (i) => i.category },
  ],
  testimonials: [
    { label: 'Nama', accessor: (i) => i.name },
    { label: 'Anak', accessor: (i) => i.child },
  ],
  social: [
    { label: 'Label', accessor: (i) => i.label },
    { label: 'URL', accessor: (i) => i.href },
  ],
  contact: [
    { label: 'Telepon', accessor: (i) => i.phone_primary || '' },
    { label: 'Email', accessor: (i) => i.email_primary || '' },
    { label: 'WhatsApp', accessor: (i) => i.whatsapp || '' },
  ],
}

export const FORM_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' }[]> = {
  news: [
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'category', label: 'Kategori', type: 'text' },
    { name: 'date', label: 'Tanggal', type: 'date' },
  ],
  programs: [
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'icon', label: 'Ikon', type: 'text' },
  ],
  facilities: [{ name: 'category', label: 'Kategori', type: 'text' }],
  staff: [{ name: 'role', label: 'Peran (leader / teacher)', type: 'text' }],
  achievements: [{ name: 'year', label: 'Tahun', type: 'number' }],
  gallery: [{ name: 'category', label: 'Kategori', type: 'text' }],
  testimonials: [
    { name: 'name', label: 'Nama', type: 'text' },
    { name: 'child', label: 'Anak', type: 'text' },
    { name: 'order', label: 'Urutan Tampilan', type: 'number' },
  ],
  social: [
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'href', label: 'URL', type: 'text' },
    { name: 'path', label: 'SVG Path', type: 'textarea' },
  ],
  contact: [
    { name: 'phone_primary', label: 'Telepon', type: 'text' },
    { name: 'phone_secondary', label: 'Telepon Kedua', type: 'text' },
    { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
    { name: 'email_primary', label: 'Email', type: 'text' },
    { name: 'email_admission', label: 'Email Penerimaan', type: 'text' },
    { name: 'address', label: 'Alamat', type: 'textarea' },
    { name: 'office_hours', label: 'Jam Kantor', type: 'text' },
  ],
}

export const CONTENT_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'list' }[]> = {
  news: [
    { name: 'title', label: 'Judul Berita', type: 'text' },
    { name: 'excerpt', label: 'Ringkasan', type: 'textarea' },
    { name: 'content', label: 'Isi Berita', type: 'textarea' },
    { name: 'author', label: 'Penulis', type: 'text' },
  ],
  programs: [
    { name: 'title', label: 'Judul Program', type: 'text' },
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'desc', label: 'Deskripsi', type: 'textarea' },
    { name: 'duration', label: 'Durasi', type: 'text' },
    { name: 'level', label: 'Tingkat', type: 'text' },
    { name: 'highlights', label: 'Keunggulan (1 per baris)', type: 'list' },
    { name: 'curriculum', label: 'Kurikulum (1 per baris)', type: 'list' },
    { name: 'outcomes', label: 'Hasil (1 per baris)', type: 'list' },
  ],
  facilities: [
    { name: 'name', label: 'Nama Fasilitas', type: 'text' },
    { name: 'desc', label: 'Deskripsi', type: 'textarea' },
    { name: 'features', label: 'Fitur (1 per baris)', type: 'list' },
  ],
  staff: [
    { name: 'name', label: 'Nama Staff', type: 'text' },
    { name: 'position', label: 'Jabatan', type: 'text' },
    { name: 'bio', label: 'Biografi', type: 'textarea' },
    { name: 'expertise', label: 'Keahlian (1 per baris)', type: 'list' },
  ],
  achievements: [
    { name: 'title', label: 'Judul Prestasi', type: 'text' },
    { name: 'desc', label: 'Deskripsi', type: 'text' },
    { name: 'scope', label: 'Lingkup', type: 'text' },
  ],
  gallery: [{ name: 'title', label: 'Judul Gambar', type: 'text' }],
  testimonials: [{ name: 'quote', label: 'Kutipan Testimoni', type: 'textarea' }],
}

export const SOCIAL_PRESETS: { label: string; path: string }[] = [
  { label: 'Instagram', path: 'M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.258 1.228.6 1.79 1.162.562.561.904 1.13 1.162 1.79.248.637.415 1.363.465 2.428.05 1.066.06 1.405.06 4.122s-.01 3.056-.06 4.122c-.05 1.065-.217 1.79-.465 2.428a4.837 4.837 0 0 1-1.162 1.79c-.562.562-1.13.904-1.79 1.162-.637.248-1.363.415-2.428.465-1.066.05-1.405.06-4.122.06s-3.056-.01-4.122-.06c-1.065-.05-1.79-.217-2.428-.465a4.837 4.837 0 0 1-1.79-1.162 4.837 4.837 0 0 1-1.162-1.79c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12s.01-3.056.06-4.122c.05-1.065.217-1.79.465-2.428a4.837 4.837 0 0 1 1.162-1.79A4.837 4.837 0 0 1 5.472 2.66c.637-.248 1.363-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z' },
  { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { label: 'WhatsApp', path: 'M12.032.021c-6.626 0-12 5.373-12 12 0 2.116.552 4.107 1.518 5.858l-1.513 5.514 5.668-1.474c1.692.974 3.62 1.534 5.667 1.534 6.627 0 12-5.373 12-12s-5.373-12-12-12zm6.728 16.858c-.278.78-1.377 1.427-2.377 1.627-.591.118-1.362.212-3.95-1.146-3.314-1.737-5.184-5.226-5.338-5.465-.155-.239-1.283-1.706-1.283-3.254 0-1.548.81-2.31 1.096-2.626.286-.316.624-.395.832-.395.208 0 .416 0 .598.01.192.01.46-.074.72.55.26.624.89 2.154.97 2.31.078.156.13.338.026.546-.104.208-.156.338-.312.524-.156.186-.327.416-.468.558-.156.156-.318.326-.136.638.182.312.812 1.339 1.741 2.17 1.196 1.068 2.206 1.4 2.522 1.558.312.156.494.13.676-.078.182-.208.78-.91.988-1.222.208-.312.416-.26.702-.156.286.104 1.82.858 2.132 1.014.312.156.52.234.598.364.078.13.078.754-.2 1.534z' },
  { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { label: 'X (Twitter)', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { label: 'TikTok', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { label: 'Telegram', path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
  { label: 'Discord', path: 'M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z' },
  { label: 'GitHub', path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
  { label: 'Globe / Website', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
  { label: 'Email', path: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
]

export function truncate(str: string | null | undefined, len: number): string {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}
