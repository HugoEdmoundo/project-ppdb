'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import AdminConfirm from '@/app/components/ui/AdminConfirm'
import {
  Newspaper, GraduationCap, Building2, Users, Trophy,
  Image as ImageIcon, MessageSquare, Link as LinkIcon, Phone, Settings,
  Plus, Menu, X, ChevronLeft, ChevronDown, ChevronRight, LogOut, User as UserIcon,
  LayoutDashboard, Upload, ImagePlus, Link2, Loader2,
  Globe, ExternalLink, FolderOpen,
} from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'
import EmptyState from '@/app/components/ui/EmptyState'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/Avatar'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/app/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/DropdownMenu'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/Table'
import { cn } from '@/app/lib/utils'

// ── Sub-components ────────────────────────────────────────────────────────────
import { DashboardSidebar } from './DashboardSidebar'
import { SettingsEditor } from './SettingsEditor'
import { ContactEditor } from './ContactEditor'
import { CrudFormDialog } from './CrudFormDialog'
import {
  TABS, TABLE_COLS, FORM_FIELDS, CONTENT_FIELDS, truncate,
} from './_constants'
import type { RowRecord, FormState, AdminUser } from './_types'

interface TabDef {
  key: string
  label: string
  endpoint: string
  fetch: () => Promise<unknown>
  icon: typeof Newspaper
}

interface RowContent {
  title?: string
  name?: string
  [key: string]: unknown
}

interface RowRecord {
  id?: string
  key?: string
  slug?: string
  category?: string
  date?: string
  role?: string
  year?: number
  name?: string
  child?: string
  order?: number
  label?: string
  href?: string
  path?: string
  phone_primary?: string
  phone_secondary?: string
  whatsapp?: string
  email_primary?: string
  email_admission?: string
  address?: string
  office_hours?: string
  icon?: string
  image?: string
  gallery?: unknown
  content?: RowContent | null
  [key: string]: unknown
}

interface FormState {
  image?: string
  gallery?: string[]
  [key: string]: unknown
}

interface AdminUser {
  id?: string
  username?: string
  full_name?: string
  email?: string
  avatar_url?: string
  role_name?: string
  user_type?: string
  permissions?: Record<string, string>
  page_permissions?: string[]
}

function errorMessage(e: unknown, fallback = 'Terjadi kesalahan'): string {
  return e instanceof Error ? e.message : fallback
}

const TABS: TabDef[] = [
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

const HAS_CONTENT: string[] = ['news', 'programs', 'facilities', 'staff', 'achievements', 'gallery', 'testimonials']

const TAB_DESCRIPTIONS: Record<string, string> = {
  news: 'Kelola artikel, berita, dan pengumuman terbaru pesantren.',
  programs: 'Atur program pendidikan yang ditawarkan pesantren.',
  facilities: 'Kelola sarana dan prasarana yang dimiliki pesantren.',
  staff: 'Kelola daftar guru dan pengurus pesantren.',
  achievements: 'Catat raihan dan penghargaan santri.',
  gallery: 'Kelola dokumentasi foto kegiatan pesantren.',
  testimonials: 'Kelola kesan dan testimoni wali santri.',
  social: 'Atur tautan media sosial resmi pesantren.',
  contact: 'Perbarui informasi kontak pesantren.',
  settings: 'Konfigurasi logo, favicon, dan pengaturan situs.',
}

const SIDEBAR_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Konten', keys: ['news', 'programs', 'facilities', 'gallery', 'testimonials'] },
  { label: 'Informasi', keys: ['staff', 'achievements', 'social', 'contact'] },
  { label: 'Sistem', keys: ['settings'] },
]

const TABLE_COLS: Record<string, { label: string; accessor: (item: RowRecord) => string | undefined }[]> = {
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

const FORM_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' }[]> = {
  news: [
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'category', label: 'Kategori', type: 'text' },
    { name: 'date', label: 'Tanggal', type: 'date' },
  ],
  programs: [
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'icon', label: 'Ikon', type: 'text' },
  ],
  facilities: [
    { name: 'category', label: 'Kategori', type: 'text' },
  ],
  staff: [
    { name: 'role', label: 'Peran (leader / teacher)', type: 'text' },
  ],
  achievements: [
    { name: 'year', label: 'Tahun', type: 'number' },
  ],
  gallery: [
    { name: 'category', label: 'Kategori', type: 'text' },
  ],
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

const CONTENT_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'list' }[]> = {
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
  gallery: [
    { name: 'title', label: 'Judul Gambar', type: 'text' },
  ],
  testimonials: [
    { name: 'quote', label: 'Kutipan Testimoni', type: 'textarea' },
  ],
}

const SOCIAL_PRESETS: { label: string; path: string }[] = [{
    label: 'Instagram',
    path: 'M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.258 1.228.6 1.79 1.162.562.561.904 1.13 1.162 1.79.248.637.415 1.363.465 2.428.05 1.066.06 1.405.06 4.122s-.01 3.056-.06 4.122c-.05 1.065-.217 1.79-.465 2.428a4.837 4.837 0 0 1-1.162 1.79c-.562.562-1.13.904-1.79 1.162-.637.248-1.363.415-2.428.465-1.066.05-1.405.06-4.122.06s-3.056-.01-4.122-.06c-1.065-.05-1.79-.217-2.428-.465a4.837 4.837 0 0 1-1.79-1.162 4.837 4.837 0 0 1-1.162-1.79c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12s.01-3.056.06-4.122c.05-1.065.217-1.79.465-2.428a4.837 4.837 0 0 1 1.162-1.79A4.837 4.837 0 0 1 5.472 2.66c.637-.248 1.363-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  },
  {
    label: 'YouTube',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'WhatsApp',
    path: 'M12.032.021c-6.626 0-12 5.373-12 12 0 2.116.552 4.107 1.518 5.858l-1.513 5.514 5.668-1.474c1.692.974 3.62 1.534 5.667 1.534 6.627 0 12-5.373 12-12s-5.373-12-12-12zm6.728 16.858c-.278.78-1.377 1.427-2.377 1.627-.591.118-1.362.212-3.95-1.146-3.314-1.737-5.184-5.226-5.338-5.465-.155-.239-1.283-1.706-1.283-3.254 0-1.548.81-2.31 1.096-2.626.286-.316.624-.395.832-.395.208 0 .416 0 .598.01.192.01.46-.074.72.55.26.624.89 2.154.97 2.31.078.156.13.338.026.546-.104.208-.156.338-.312.524-.156.186-.327.416-.468.558-.156.156-.318.326-.136.638.182.312.812 1.339 1.741 2.17 1.196 1.068 2.206 1.4 2.522 1.558.312.156.494.13.676-.078.182-.208.78-.91.988-1.222.208-.312.416-.26.702-.156.286.104 1.82.858 2.132 1.014.312.156.52.234.598.364.078.13.078.754-.2 1.534z',
  },
  {
    label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'Facebook',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'X (Twitter)',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'TikTok',
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  {
    label: 'Telegram',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
  {
    label: 'Discord',
    path: 'M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z',
  },
  {
    label: 'GitHub',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    label: 'Globe / Website',
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  },
  {
    label: 'Email',
    path: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  },
]

// ─── Helpers ────────────────────────────────────────────────

function truncate(str: string | null | undefined, len: number) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}


// ─── Skeleton ───────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <div className="h-4 bg-[var(--border)] rounded flex-1" />
          <div className="h-4 bg-[var(--border)] rounded flex-1" />
          <div className="h-4 bg-[var(--border)] rounded w-20" />
          <div className="h-4 bg-[var(--border)] rounded w-16" />
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white/60 rounded-xl p-5 border border-[var(--border)] space-y-3"
        >
          <div className="h-4 bg-[var(--border)] rounded w-3/4" />
          <div className="h-3 bg-[var(--border)] rounded w-1/2" />
          <div className="flex gap-2 mt-2">
            <div className="h-8 bg-[var(--border)] rounded w-16" />
            <div className="h-8 bg-[var(--border)] rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const ADMIN_PAGE_SIZE = 25

export default function AdminDashboard() {
  const router = useRouter()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('news')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // ── Data state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const canCrud =
    adminUser?.user_type === 'superadmin' ||
    adminUser?.permissions?.companyprofile === 'crud'

  const filteredTabs =
    pagePermissions && pagePermissions.length > 0
      ? TABS.filter((tab) => pagePermissions.includes(tab.key))
      : TABS

  // ── Form state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<RowRecord | null>(null)
  const [formData, setFormData] = useState<FormState>({})

  useSSE('companyprofile')

  // ── Deep-link ?tab= ───────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some((t) => t.key === tab)) {
      const id = window.setTimeout(() => setActiveTab(tab), 0)
      return () => window.clearTimeout(id)
    }
  }, [])

  // ── SSE: live page-permissions ────────────────────────────────────────────
  useEffect(() => {
    const userId = adminUser?.id
    if (!userId) return
    const url = `${api.API_BASE.replace(/\/$/, '')}/users/${userId}/events`
    const es = new EventSource(url, { withCredentials: true })
    es.addEventListener('page_permissions_changed', (e) => {
      try {
        const data = JSON.parse(e.data)
        setPagePermissions(
          data.page_keys && data.page_keys.length > 0 ? data.page_keys : null,
        )
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [adminUser?.id])

  // ── Dynamic logo ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadLogo = () => {
      api.getSettings()
        .then((settings) => {
          const logo = settings.find((s) => s.key === 'logo')?.value
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          setLogoUrl(logo || favicon || '')
        })
        .catch(() => {})
    }
    loadLogo()
    return eventBus.on('companyprofile:refresh', loadLogo)
  }, [])

  const handle401 = useCallback(() => {
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }, [router])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const currentTabs =
      pagePermissions && pagePermissions.length > 0
        ? TABS.filter((tab) => pagePermissions.includes(tab.key))
        : TABS

    setLoading(true)
    setError('')
    try {
      const tab = currentTabs.find((t) => t.key === activeTab)
      if (!tab) {
        if (currentTabs.length > 0) setActiveTab(currentTabs[0].key)
        setLoading(false)
        return
      }
      if (activeTab === 'contact' || activeTab === 'settings') {
        const data = await tab.fetch()
        setItems(Array.isArray(data) ? data : data ? [data as RowRecord] : [])
        setHasMore(false)
      } else {
        const data = await api.getEntityPage(tab.endpoint, 1, ADMIN_PAGE_SIZE)
        const rows = data as unknown as RowRecord[]
        setItems(rows)
        setPage(1)
        setHasMore(rows.length === ADMIN_PAGE_SIZE)
      }
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401()
        return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
      setItems([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [activeTab, handle401, pagePermissions])

  const loadMore = useCallback(async () => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const data = await api.getEntityPage(tab.endpoint, next, ADMIN_PAGE_SIZE)
      const rows = data as unknown as RowRecord[]
      setItems((prev) => [...prev, ...rows])
      setPage(next)
      setHasMore(rows.length === ADMIN_PAGE_SIZE)
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401(); return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat lebih banyak data')
    } finally {
      setLoadingMore(false)
    }
  }, [activeTab, handle401, hasMore, loadingMore, page])

  useEffect(() => {
    eventBus.on('companyprofile:refresh', fetchData)
    return () => eventBus.off('companyprofile:refresh', fetchData)
  }, [fetchData])

  // ── Bootstrap: load user & sidebar state ─────────────────────────────────
  useEffect(() => {
    // Deferred ke async boundary: membaca localStorage untuk inisialisasi
    // post-hydration (SSR-safe) tanpa setState sinkron dalam effect.
    const id = window.setTimeout(() => {
      const saved = localStorage.getItem('cp_collapsed')
      if (saved) setCollapsed(saved === 'true')

      const userRaw = localStorage.getItem('admin_user')
      if (!userRaw) {
        ;(async () => {
          try {
            const me = await api.getMe()
            if (me) {
              localStorage.setItem('admin_user', JSON.stringify(me))
              setAdminUser(me)
            }
          } catch {
            localStorage.removeItem('admin_user')
            router.replace('/auth/login')
          }
        })()
        return
      }
      try {
        const parsed = JSON.parse(userRaw)
        setAdminUser(parsed)
        if (parsed.page_permissions?.length > 0) {
          setPagePermissions(parsed.page_permissions)
        }
      } catch {
        localStorage.removeItem('admin_user')
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [router])

  useEffect(() => {
    if (!localStorage.getItem('admin_user')) {
      router.replace('/auth/login')
      return
    }
    const id = window.setTimeout(() => fetchData(), 0)
    return () => window.clearTimeout(id)
  }, [activeTab, fetchData, router])

  // Lock body scroll when form is open
  useEffect(() => {
    document.body.style.overflow = formMode ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [formMode])

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = ''
    for (const f of CONTENT_FIELDS[activeTab] || []) fd[`_c_${f.name}`] = ''
    fd.image = ''
    fd.gallery = []
    setFormData(fd)
    setEditingItem(null)
    setFormMode('create')
  }

  function openEdit(item: RowRecord) {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = item[f.name] ?? ''
    // Extract content fields
    const content = (item.content ?? {}) as Record<string, unknown>
    for (const f of CONTENT_FIELDS[activeTab] || []) {
      const val = content[f.name]
      fd[`_c_${f.name}`] = f.type === 'list' && Array.isArray(val)
        ? (val as string[]).join('\n')
        : typeof val === 'string' ? val : ''
    }
    fd.image = item.image || ''
    let rawGallery = item.gallery
    if (typeof rawGallery === 'string') try { rawGallery = JSON.parse(rawGallery) } catch { /* ignore */ }
    fd.gallery = Array.isArray(rawGallery) ? rawGallery as string[] : []
    setFormData(fd)
    setEditingItem(item)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setEditingItem(null)
    setFormData({})
  }

  async function handleDelete(item: RowRecord) {
    try {
      const tab = TABS.find((t) => t.key === activeTab)!
      await api.deleteItem(`${tab.endpoint}/${item.id}`)
      fetchData()
      toast('success', 'Berhasil dihapus')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  function handleLogout() {
    api.logout()
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }

  function handleCollapseToggle() {
    setCollapsed((p) => {
      const v = !p
      localStorage.setItem('cp_collapsed', String(v))
      return v
    })
  }

  const activeTabDef = TABS.find((t) => t.key === activeTab)!

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background flex">
      <AdminToast />
      <AdminConfirm />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className={cn(
          'fixed md:sticky top-0 left-0 z-40 h-dvh bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl flex flex-col border-r border-border/50 transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('relative flex items-center border-b border-border/60 bg-white/30', collapsed ? 'justify-center px-2 py-4' : 'px-5 py-4')}>
          {collapsed ? (
            logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="PTDARRAHMAN" className="h-8 w-auto max-w-8 object-contain drop-shadow-sm" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center font-bold text-lg select-none shadow-sm">ار</div>
            )
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="PTDARRAHMAN" className="h-9 w-auto max-w-36 object-contain shrink-0 drop-shadow-sm" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center font-bold text-lg shrink-0 select-none shadow-sm">ار</div>
              )}
              <div className="min-w-0">
                <div className="font-heading text-sm font-bold text-foreground truncate">PTDARRAHMAN</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                  Admin CMS
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => { setCollapsed(p => { const v = !p; localStorage.setItem('cp_collapsed', String(v)); return v }) }}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-all hover:text-foreground hover:scale-110"
            title={collapsed ? 'Perlebar sidebar' : 'Sempitkan sidebar'}
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 no-scrollbar">
          <Link
            href="/admin/overview"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
              'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            )}
            title={collapsed ? 'Dashboard' : undefined}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Dashboard</span>}
          </Link>

          {!collapsed ? (
            SIDEBAR_GROUPS.map((group) => {
              const tabs = filteredTabs.filter((t) => group.keys.includes(t.key))
              if (tabs.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 select-none">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }}
                          className={cn(
                            'group/btn relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                            collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
                            isActive
                              ? 'sidebar-item-active bg-primary/10 text-foreground font-semibold shadow-sm'
                              : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                          )}
                          title={collapsed ? tab.label : undefined}
                        >
                          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />}
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{tab.label}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            filteredTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }}
                  className={cn(
                    'group/btn relative w-full flex items-center justify-center rounded-xl p-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'sidebar-item-active bg-primary/10 text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                  )}
                  title={tab.label}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary" />}
                  <Icon className="h-4 w-4 shrink-0" />
                </button>
              )
            })
          )}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-border/60 px-3 py-4 space-y-2', collapsed && 'px-2')}>
          <Link
            href="/"
            target="_blank"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'group/link w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              collapsed ? 'justify-center p-2' : 'px-3 py-2.5',
              'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            )}
            title="Lihat Situs"
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">Lihat Situs</span>
                <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground/60 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </>
            )}
          </Link>
          {!collapsed && (
            <p className="px-3 pt-1 text-[10px] text-muted-foreground/70 leading-relaxed select-none">
              © {new Date().getFullYear()} PTDARRAHMAN
            </p>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-navbar">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden -ml-2 rounded-xl p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="font-heading text-base font-bold text-foreground">Admin CMS</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                <span className="text-muted-foreground">Kelola Konten</span>
              </div>
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="group flex items-center gap-2.5 rounded-xl border border-transparent bg-white/50 py-1.5 pl-1.5 pr-2.5 sm:pr-3 text-left transition-all duration-200 hover:bg-white/80 hover:border-emerald-primary/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Avatar className="h-8 w-8 ring-1 ring-emerald-primary/20 transition-shadow group-hover:ring-emerald-primary/40">
                    <AvatarImage src={adminUser?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
                      {adminUser?.full_name?.[0] || adminUser?.username?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-sm font-bold text-foreground leading-tight truncate">
                      {adminUser?.full_name || adminUser?.username}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      <span className="truncate">{adminUser?.role_name || adminUser?.user_type}</span>
                    </div>
                  </div>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-1.5">
                {/* User card header */}
                <div className="rounded-xl border border-emerald-primary/15 bg-gradient-to-br from-emerald-primary/10 to-emerald-primary/5 p-3 mb-1.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                      <AvatarImage src={adminUser?.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-primary to-[#145337] text-white text-sm font-bold">
                        {adminUser?.full_name?.[0] || adminUser?.username?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground leading-tight">
                        {adminUser?.full_name || adminUser?.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{adminUser?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {adminUser?.role_name || adminUser?.user_type || 'Admin'}
                    </span>
                  </div>
                </div>

                <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => setProfileOpen(true)}>
                  <UserIcon className="h-4 w-4 text-emerald-primary" />
                  <span>Lihat Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2" onSelect={() => window.open('/', '_blank')}>
                  <Globe className="h-4 w-4 text-emerald-primary" />
                  <span>Lihat Situs</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-rose-danger focus:bg-rose-light/60 focus:text-rose-danger"
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          {/* Title card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary via-emerald-700 to-[#145337] p-6 md:p-8 text-white shadow-lg mb-6">
            <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#D4A853]/30 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm text-white shadow-inner shrink-0">
                  <activeTabDef.icon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Admin CMS
                  </p>
                  <h2 className="mt-1.5 font-heading text-2xl md:text-3xl font-bold leading-tight">
                    {activeTabDef.label}
                  </h2>
                  <p className="mt-1.5 text-sm text-emerald-50/85 max-w-xl leading-relaxed">
                    {TAB_DESCRIPTIONS[activeTab] || 'Kelola konten website Pesantren Ar-Rahman.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {activeTab !== 'settings' && activeTab !== 'contact' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold shadow-inner" title="Jumlah item">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {items.length} item
                  </span>
                )}
                {canCrud && activeTab !== 'settings' && activeTab !== 'contact' && (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/95 hover:bg-white text-emerald-900 px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Baru
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Skeletons */}
          {loading && (
            <>
              <div className="hidden md:block bg-white/50 rounded-2xl border border-[var(--border)] p-4">
                <TableSkeleton />
              </div>
              <div className="md:hidden">
                <CardSkeleton />
              </div>
            </>
          )}

          {/* Empty states */}
          {activeTab === 'settings' && !loading && items.length === 0 && (
            <EmptyState icon={Settings} title="Belum Ada Pengaturan" description="Tidak ada pengaturan yang tersedia." />
          )}
          {activeTab !== 'settings' && !loading && !error && items.length === 0 && (
            <EmptyState
              icon={LayoutDashboard}
              title="Belum Ada Data"
              description={
                activeTab === 'contact'
                  ? 'Info kontak belum diatur.'
                  : canCrud
                    ? 'Belum ada item di sini. Klik "Buat Baru" untuk memulai.'
                    : 'Belum ada item di sini.'
              }
              action={
                canCrud && activeTab !== 'contact' ? (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Baru
                  </button>
                ) : undefined
              }
            />
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && !loading && (
            <SettingsEditor settings={items as unknown as api.SiteSetting[]} canCrud={canCrud} />
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && !loading && (
            <ContactEditor contactInfo={items[0]} canCrud={canCrud} onSave={fetchData} />
          )}

          {/* Table Data */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && (
            <Card className="border-border shadow-sm bg-white/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      {TABLE_COLS[activeTab]?.map((col) => (
                        <TableHead
                          key={col.label}
                          className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider h-11"
                        >
                          {col.label}
                        </TableHead>
                      ))}
                      {canCrud && (
                        <TableHead className="text-right text-[12px] font-semibold text-muted-foreground uppercase tracking-wider h-11">
                          Aksi
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.id || item.key} className={cn('transition-colors hover:bg-primary/[0.04]', idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent')}>
                        {TABLE_COLS[activeTab]?.map((col) => (
                          <TableCell
                            key={col.label}
                            className="py-3 max-w-[200px] sm:max-w-[300px] truncate text-foreground font-medium"
                          >
                            {truncate(col.accessor(item), 40)}
                          </TableCell>
                        ))}
                        {canCrud && (
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                Edit
                              </Button>
                              {activeTab !== 'contact' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={async () => {
                                    const { confirm } = await import(
                                      '@/app/components/ui/AdminConfirm'
                                    )
                                    const ok = await confirm({
                                      title: 'Hapus Item',
                                      message: 'Yakin ingin menghapus item ini? Tindakan ini tidak bisa dibatalkan.',
                                      confirmLabel: 'Ya, Hapus',
                                      cancelLabel: 'Batal',
                                      variant: 'danger',
                                    })
                                    if (ok) handleDelete(item)
                                  }}
                                >
                                  Hapus
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Load more */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && hasMore && (
            <div className="flex justify-center mt-6 mb-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                <Loader2 className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Form modal */}
      {formMode && (
        <CrudFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}

      {profileOpen && <ProfileModal open onClose={() => setProfileOpen(false)} />}
      <CrossTabSync />
    </div>
  )
}
