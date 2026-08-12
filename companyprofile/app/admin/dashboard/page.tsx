'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import { useFocusTrap } from '@/app/hooks/useFocusTrap'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import AdminConfirm from '@/app/components/ui/AdminConfirm'
import Image from 'next/image'
import {
  Newspaper, GraduationCap, Building2, Users, Trophy,
  Image as ImageIcon, MessageSquare, Link, Phone, Settings,
  Plus, Menu, X, ChevronLeft,
  LayoutDashboard, Upload, ImagePlus, Link2,
} from 'lucide-react'
import ProfileDropdown from '@/app/components/ProfileDropdown'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'

// ─── Types ──────────────────────────────────────────────────

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
  { key: 'social', label: 'Tautan Sosial', endpoint: '/social-links', fetch: api.getSocialLinks, icon: Link },
  { key: 'contact', label: 'Info Kontak', endpoint: '/contact-info', fetch: api.getContactInfo, icon: Phone },
  { key: 'settings', label: 'Pengaturan', endpoint: '/settings', fetch: api.getSettings, icon: Settings },
]

const HAS_CONTENT: string[] = ['news', 'programs', 'facilities', 'staff', 'achievements', 'gallery', 'testimonials']

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

const FORM_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'number' }[]> = {
  news: [
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'category', label: 'Kategori', type: 'text' },
    { name: 'date', label: 'Tanggal', type: 'text' },
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

function CardValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <p className="text-sm text-[var(--text)] mt-0.5 leading-snug">{value || '—'}</p>
    </div>
  )
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
        <div key={i} className="animate-pulse bg-white/60 rounded-xl p-5 border border-[var(--border)] space-y-3">
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

// ─── Main Component ─────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('news')
  const [items, setItems] = useState<RowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<RowRecord | null>(null)
  const [formData, setFormData] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const canCrud = adminUser?.user_type === 'superadmin' || adminUser?.permissions?.companyprofile === 'crud'
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState('/download.png')

  useSSE('companyprofile')

  const filteredTabs = pagePermissions && pagePermissions.length > 0
    ? TABS.filter(tab => pagePermissions.some(p => `page-cp-${tab.key}` === p))
    : TABS

  // SSE untuk realtime page permissions
  useEffect(() => {
    const userId = adminUser?.id
    if (!userId) return
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-ptdarrahman.vercel.app'
    const token = localStorage.getItem('admin_token')
    if (!token) return
    const url = `${API_BASE.replace(/\/$/, '')}/users/${userId}/events?token=${encodeURIComponent(token)}`

    const es = new EventSource(url)
    
    es.addEventListener('open', () => {
      // SSE connected
    })

    es.addEventListener('page_permissions_changed', (e) => {
      try {
        const data = JSON.parse(e.data)
        setPagePermissions(data.page_ids.length > 0 ? data.page_ids : null)
      } catch { /* ignore */ }
    })

    return () => { es.close() }
  }, [adminUser?.id])

  useEffect(() => {
    const loadLogo = () => {
      api.getSettings()
        .then((settings) => {
          const logo = settings.find((s) => s.key === 'logo')?.value
          const favicon = settings.find((s) => s.key === 'favicon')?.value
          if (logo) {
            setLogoUrl(logo)
          } else if (favicon) {
            setLogoUrl(favicon)
          } else {
            setLogoUrl('/download.png')
          }
        })
        .catch(() => {})
    }
    loadLogo()
    return eventBus.on('companyprofile', () => {
      loadLogo()
    })
  }, [])

  const handle401 = useCallback(() => {
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
  }, [router])

  const fetchData = useCallback(async () => {
    const currentTabs = pagePermissions && pagePermissions.length > 0
      ? TABS.filter(tab => pagePermissions.some(p => `page-cp-${tab.key}` === p))
      : TABS
    
    setLoading(true)
    setError('')
    try {
      const tab = currentTabs.find((t) => t.key === activeTab)
      if (!tab) {
        if (currentTabs.length > 0) {
          setActiveTab(currentTabs[0].key)
        }
        setLoading(false)
        return
      }
      const data = await tab.fetch()
      setItems(Array.isArray(data) ? data : data ? [data as RowRecord] : [])
    } catch (e: unknown) {
      if (e instanceof Error && (e.message?.includes('401') || e.message?.includes('Unauthorized'))) {
        handle401()
        return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, handle401, pagePermissions])

  useEffect(() => {
    eventBus.on('companyprofile:refresh', fetchData)
    return () => eventBus.off('companyprofile:refresh', fetchData)
  }, [fetchData])

  useEffect(() => {
    const saved = localStorage.getItem('cp_collapsed')
    if (saved) {
      requestAnimationFrame(() => setCollapsed(saved === 'true'))
    }
    const token = localStorage.getItem('admin_token')
    if (!token) return
    try {
      const u = localStorage.getItem('admin_user')
      if (u) {
        const parsed = JSON.parse(u)
        requestAnimationFrame(() => {
          setAdminUser(parsed)
          if (parsed.page_permissions && parsed.page_permissions.length > 0) {
            setPagePermissions(parsed.page_permissions)
          }
        })
        return
      }
    } catch {
      localStorage.removeItem('admin_user')
    }
    ;(async () => {
      try {
        const me = await api.getMe()
        if (me) {
          localStorage.setItem('admin_user', JSON.stringify(me))
          setAdminUser(me)
        }
      } catch {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
      }
    })()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.replace('/admin/login')
      return
    }
    const frame = requestAnimationFrame(() => { fetchData() })
    return () => cancelAnimationFrame(frame)
  }, [activeTab, fetchData, router])
  
  useEffect(() => {
    if (formMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [formMode])

  function initContentFd(fd: FormState) {
    const fields = CONTENT_FIELDS[activeTab] || []
    for (const f of fields) {
      fd[`_c_${f.name}`] = ''
    }
    return fd
  }

  function extractContent(item: RowRecord): FormState {
    const content = (item.content ?? {}) as Record<string, unknown>
    const fd: FormState = {}
    const fields = CONTENT_FIELDS[activeTab] || []
    for (const f of fields) {
      const val = content[f.name]
      if (f.type === 'list' && Array.isArray(val)) {
        fd[`_c_${f.name}`] = val.join('\n')
      } else {
        fd[`_c_${f.name}`] = typeof val === 'string' ? val : ''
      }
    }
    return fd
  }

  function buildContent(fd: FormState): Record<string, unknown> {
    const fields = CONTENT_FIELDS[activeTab] || []
    const content: Record<string, unknown> = {}
    for (const f of fields) {
      const raw = fd[`_c_${f.name}`] ?? ''
      if (f.type === 'list') {
        content[f.name] = String(raw).split('\n').map((s: string) => s.trim()).filter(Boolean)
      } else {
        content[f.name] = raw
      }
    }
    return content
  }

  function openCreate() {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = ''
    initContentFd(fd)
    fd.image = ''
    fd.gallery = []
    setFormData(fd)
    setEditingItem(null)
    setFormMode('create')
  }

  function openEdit(item: RowRecord) {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = item[f.name] ?? ''
    Object.assign(fd, extractContent(item))
    fd.image = item.image || ''
    let rawGallery = item.gallery
    if (typeof rawGallery === 'string') try { rawGallery = JSON.parse(rawGallery) } catch {}
    fd.gallery = Array.isArray(rawGallery) ? rawGallery : []
    setFormData(fd)
    setEditingItem(item)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setEditingItem(null)
    setFormData({})
  }

  async function handleSave() {
    setSaving(true)
    try {
      const tab = TABS.find((t) => t.key === activeTab)!
      const payload: Record<string, unknown> = {}
      for (const f of FORM_FIELDS[activeTab] || []) {
        const val = formData[f.name]
        payload[f.name] = f.type === 'number' ? Number(val) : val
      }
      if (activeTab !== 'social') payload.image = formData.image || ''
      if (activeTab === 'news') payload.gallery = JSON.stringify(formData.gallery ?? [])
      if (HAS_CONTENT.includes(activeTab)) {
        payload.content = JSON.stringify(buildContent(formData))
      }
      if (activeTab === 'contact') {
        await api.updateContactInfo(payload)
      } else if (activeTab === 'settings') {
        // Settings are handled separately by SettingsEditor
        return
      } else if (formMode === 'edit' && editingItem) {
        await api.updateItem(`${tab.endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(tab.endpoint, payload)
      }
      closeForm()
      fetchData()
      toast('success', formMode === 'create' ? 'Berhasil dibuat' : 'Berhasil disimpan')
    } catch (e) {
      toast('error', errorMessage(e, 'Gagal menyimpan'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: RowRecord) {
    try {
      const tab = TABS.find((t) => t.key === activeTab)!
      await api.deleteItem(`${tab.endpoint}/${item.id}`)
      fetchData()
      toast('success', 'Berhasil dihapus')
    } catch (e) {
      toast('error', errorMessage(e, 'Gagal menghapus'))
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      setFormData({ ...formData, image: url })
      toast('success', 'Gambar berhasil diunggah')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setGalleryUploading(true)
    try {
      const url = await api.uploadImage(file)
      setFormData({ ...formData, gallery: [...(formData.gallery || []), url] })
      toast('success', 'Gambar berhasil diunggah')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setGalleryUploading(false)
    }
  }

  function addGalleryItem(url: string) {
    if (!url.trim()) return
    setFormData({ ...formData, gallery: [...(formData.gallery || []), url.trim()] })
    setGalleryInputValue('')
  }

  function removeGalleryItem(index: number) {
    const updated = [...(formData.gallery || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, gallery: updated })
  }

  function handleLogout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  // ─── Render: Form Modal ──────────────────────────────────

  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [galleryInputMode, setGalleryInputMode] = useState<'upload' | 'url'>('upload')
  const [galleryInputValue, setGalleryInputValue] = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)

  const formTrapRef = useFocusTrap(!!formMode, closeForm)

  function renderForm() {
    const fields = FORM_FIELDS[activeTab] || []
    const tab = TABS.find((t) => t.key === activeTab)!

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-0 sm:p-4 scrollbar-none"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) closeForm() }}
      >
        <div
          ref={formTrapRef}
          role="dialog"
          aria-modal="true"
          className="bg-white/85 backdrop-blur-xl border border-white/40 rounded-2xl max-sm:rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] max-sm:h-full overflow-y-auto modal-scroll"
          style={{ animation: 'modalIn 0.2s ease-out' }}
        >
          {/* ── Header with gradient accent ── */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[var(--border)] rounded-t-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
            <div className="flex items-center justify-between px-6 md:px-8 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 flex items-center justify-center">
                  <tab.icon className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <h2 className="font-[var(--font-heading)] text-base md:text-lg font-bold text-[var(--text)]">
                  {formMode === 'create' ? 'Buat' : 'Edit'} {tab.label}
                </h2>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="p-6 md:p-8 space-y-6">

            {/* ── Informasi Utama ── */}
            {fields.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[var(--accent)]" />
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Informasi Utama</span>
                </div>
                <div className="space-y-3.5">
                  {fields.map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{f.label}</label>
                      {activeTab === 'social' && f.name === 'path' ? (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {SOCIAL_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setFormData({ ...formData, [f.name]: preset.path })}
                              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                                formData[f.name] === preset.path
                                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)]/20'
                                  : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]'
                              }`}
                              title={preset.label}
                            >
                              <svg className="w-6 h-6 text-[var(--text)]" viewBox="0 0 24 24" fill="currentColor">
                                <path d={preset.path} />
                              </svg>
                              <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-center leading-tight">{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={String(formData[f.name] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          rows={4}
                          maxLength={10000}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                        />
                      ) : (
                        <input
                          type={f.type === 'number' ? 'number' : 'text'}
                          maxLength={255}
                          value={String(formData[f.name] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Gambar ── */}
            {activeTab !== 'social' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[var(--accent-gold)]" />
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Gambar</span>
                </div>

                {/* Toggle upload / URL */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      imageMode === 'upload'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      imageMode === 'url'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    URL
                  </button>
                </div>

                {imageMode === 'upload' ? (
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all">
                      {uploading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Mengunggah...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Pilih File
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="url"
                      value={formData.image ?? ''}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                    />
                  </div>
                )}

                {/* Preview */}
                {formData.image && (
                  <div className="mt-4 flex items-start gap-4 p-3 rounded-xl border border-[var(--border)] bg-white/60">
                    <Image
                      src={formData.image}
                      alt="preview"
                      width={80}
                      height={56}
                      className="w-20 h-14 object-cover rounded-lg border border-[var(--border)] shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">URL Gambar</p>
                      <p className="text-xs text-[var(--text-secondary)] break-all">{formData.image}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                      aria-label="Hapus URL gambar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Galeri ── */}
            {activeTab === 'news' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[var(--accent-gold)]" />
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Galeri</span>
                </div>

                {(formData.gallery || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {(formData.gallery || []).map((url: string, idx: number) => (
                      <div key={idx} className="relative group rounded-xl border border-[var(--border)] bg-white/60 overflow-hidden">
                        <Image
                          src={url}
                          alt={`gallery ${idx + 1}`}
                          width={160}
                          height={96}
                          className="w-full h-24 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/80 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Hapus gambar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setGalleryInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      galleryInputMode === 'upload'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryInputMode('url')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      galleryInputMode === 'url'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    URL
                  </button>
                </div>

                {galleryInputMode === 'upload' ? (
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all">
                      {galleryUploading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Mengunggah...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-4 h-4" />
                          Pilih File
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" disabled={galleryUploading} />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="url"
                      value={galleryInputValue}
                      onChange={(e) => setGalleryInputValue(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => addGalleryItem(galleryInputValue)}
                      disabled={!galleryInputValue.trim()}
                      className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Tambah galeri"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Detail Konten ── */}
            {HAS_CONTENT.includes(activeTab) && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[var(--accent)]" />
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Detail Konten</span>
                </div>
                <div className="space-y-3.5">
                  {(CONTENT_FIELDS[activeTab] || []).map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{f.label}</label>
                      {f.type === 'list' || f.type === 'textarea' ? (
                        <textarea
                          value={String(formData[`_c_${f.name}`] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                          rows={f.type === 'textarea' ? 5 : 4}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(formData[`_c_${f.name}`] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-[var(--border)] rounded-b-2xl px-6 md:px-8 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 transition-all active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────

  const activeTabDef = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="min-h-dvh bg-[var(--bg)] flex">
      <AdminToast />
      <AdminConfirm />

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-40 h-dvh
          bg-white/80 backdrop-blur-xl border-r border-[var(--border)]
          flex flex-col transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Sidebar header */}
        <div className={`flex items-center border-b border-[var(--border)] relative ${collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4'}`}>
          {collapsed ? (
            <Image src={logoUrl} alt="PTDARRAHMAN" width={36} height={36} className="w-9 h-9 object-contain" />
          ) : (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Image src={logoUrl} alt="PTDARRAHMAN" width={40} height={40} className="h-10 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--text)] truncate font-[var(--font-heading)]">PTDARRAHMAN</div>
                <div className="text-[11px] text-[var(--text-muted)]">Panel Admin</div>
              </div>
            </div>
          )}
          <button
            onClick={() => { setCollapsed(p => { const v = !p; localStorage.setItem('cp_collapsed', String(v)); return v }) }}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-[var(--border)] shadow-sm"
            aria-label="Ciutkan sidebar"
          >
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                  collapsed ? 'justify-center p-2' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text)]'
                }`}
                title={collapsed ? tab.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[var(--border)]">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] transition-all"
                aria-label="Buka sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)] hidden sm:block">
                {activeTabDef.label}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <ProfileDropdown
                username={adminUser?.username || ''}
                fullName={adminUser?.full_name || ''}
                email={adminUser?.email || ''}
                avatarUrl={adminUser?.avatar_url || ''}
                roleName={adminUser?.role_name || ''}
                onProfile={() => setProfileOpen(true)}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="hidden md:block bg-white/50 rounded-2xl border border-[var(--border)] p-4">
              <TableSkeleton />
            </div>
          ) : null}
          {loading ? (
            <div className="md:hidden">
              <CardSkeleton />
            </div>
          ) : null}

          {/* Empty state */}
          {activeTab === 'settings' && !loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text)] mb-1">
                Belum Ada Pengaturan
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">
                Tidak ada pengaturan yang tersedia.
              </p>
            </div>
          )}

          {activeTab !== 'settings' && !loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text)] mb-1">
                Belum Ada Data
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">
                {activeTab === 'contact'
                  ? 'Info kontak belum diatur.'
                  : canCrud
                    ? 'Belum ada item di sini. Klik "Buat Baru" untuk memulai.'
                    : 'Belum ada item di sini.'}
              </p>
              {canCrud && activeTab !== 'contact' && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Buat Baru
                </button>
              )}
            </div>
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && !loading && (
            <SettingsEditor settings={items as unknown as api.SiteSetting[]} canCrud={canCrud} />
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && !loading && (
            <ContactEditor contactInfo={items[0]} canCrud={canCrud} onSave={fetchData} />
          )}

          {/* List operations bar (Buat Baru) */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && canCrud && (
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg transition-all active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Baru</span>
              </button>
            </div>
          )}

          {/* Desktop table */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && (
            <div className="hidden md:block bg-white/60 backdrop-blur-sm rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                      {TABLE_COLS[activeTab]?.map((col) => (
                        <th key={col.label} className="text-left px-4 py-3.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                      {canCrud && (
                        <th className="text-right px-4 py-3.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.id || item.key}
                        className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--accent-subtle)] ${
                          idx % 2 === 0 ? 'bg-white/40' : 'bg-transparent'
                        }`}
                      >
                        {TABLE_COLS[activeTab]?.map((col) => (
                          <td key={col.label} className="px-4 py-3.5 text-[var(--text)] max-w-[200px] truncate">
                            {truncate(col.accessor(item), 40)}
                          </td>
                        ))}
                        {canCrud && (
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEdit(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] transition-all mr-2"
                            >
                              Edit
                            </button>
                            {activeTab !== 'contact' && (
                              <button
                                onClick={async () => {
                                  const { confirm } = await import('@/app/components/ui/AdminConfirm')
                                  const ok = await confirm({
                                    title: 'Hapus Item',
                                    message: `Yakin ingin menghapus item ini? Tindakan ini tidak bisa dibatalkan.`,
                                    confirmLabel: 'Ya, Hapus',
                                    cancelLabel: 'Batal',
                                    variant: 'danger',
                                  })
                                  if (ok) handleDelete(item)
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mobile cards */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && items.length > 0 && (
            <div className="md:hidden space-y-3">
              {items.map((item) => (
                <div key={item.id || item.key} className="bg-white/60 backdrop-blur-sm rounded-xl border border-[var(--border)] p-5 shadow-sm">
                  <div className="space-y-2 mb-4">
                    {TABLE_COLS[activeTab]?.map((col) => (
                      <CardValue key={col.label} label={col.label} value={col.accessor(item) || ''} />
                    ))}
                  </div>
                  {canCrud && (
                    <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => openEdit(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] transition-all"
                      >
                        Edit
                      </button>
                      {activeTab !== 'contact' && (
                        <button
                          onClick={async () => {
                            const { confirm } = await import('@/app/components/ui/AdminConfirm')
                            const ok = await confirm({
                              title: 'Hapus Item',
                              message: 'Yakin ingin menghapus item ini?',
                              confirmLabel: 'Ya, Hapus',
                              cancelLabel: 'Batal',
                              variant: 'danger',
                            })
                            if (ok) handleDelete(item)
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Form modal */}
      {formMode && renderForm()}

      {profileOpen && <ProfileModal open onClose={() => setProfileOpen(false)} />}
      <CrossTabSync />
    </div>
  )
}

const SETTING_FIELDS: { key: string; label: string; type: 'text' | 'url' | 'textarea' | 'email'; description: string; image?: boolean }[] = [
  { key: 'site_name', label: 'Nama Situs', type: 'text', description: 'Nama website yang tampil di judul browser dan pencarian.' },
  { key: 'site_description', label: 'Deskripsi Situs', type: 'textarea', description: 'Deskripsi singkat untuk SEO dan metadata.' },
  { key: 'logo', label: 'Logo', type: 'url', description: 'URL gambar logo untuk seluruh sistem.', image: true },
  { key: 'favicon', label: 'Favicon', type: 'url', description: 'URL gambar favicon (32x32 atau 16x16 px).', image: true },
  { key: 'to_email', label: 'Email Tujuan', type: 'email', description: 'Alamat email yang menerima pesan dari form kontak.' },
  { key: 'whatsapp_message', label: 'Pesan WhatsApp', type: 'textarea', description: 'Pesan default untuk tombol chat WhatsApp.' },
]

const DEFAULT_SETTING_VALUES: Record<string, string> = {
  site_name: "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
  site_description: 'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir.',
  to_email: 'ptdarrahmanm9@gmail.com',
  whatsapp_message: "Assalamu'alaikum, Saya ingin tahu lebih lanjut tentang Pesantren Ar-Rahman.",
}

function SettingsEditor({ settings, canCrud }: { settings: api.SiteSetting[]; canCrud: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { ...DEFAULT_SETTING_VALUES }
    for (const s of settings) init[s.key] = s.value
    return init
  })
  const [saving, setSaving] = useState<string | null>(null)

  async function handleSave(key: string) {
    if (!canCrud) return
    const value = values[key] ?? ''
    if (key === 'favicon' || key === 'logo') {
      if (value && value.startsWith(api.API_BASE)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} tidak valid — gunakan URL gambar langsung, bukan URL API`)
        return
      }
      if (value && !/^https?:\/\//i.test(value)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} harus URL absolut (http/https)`)
        return
      }
    }
    setSaving(key)
    try {
      await api.updateSetting(key, value)
      toast('success', 'Pengaturan disimpan')
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(null)
    }
  }

  async function handleUpload(key: string) {
    if (!canCrud) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        let url = await api.uploadImage(file)
        if (url && !/^https?:\/\//i.test(url)) {
          url = `${api.API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
        }
        setValues(p => ({ ...p, [key]: url }))
        await api.updateSetting(key, url)
        toast('success', `${SETTING_FIELDS.find(f => f.key === key)?.label} berhasil diupload`)
      } catch {
        toast('error', 'Upload gagal')
      }
    }
    input.click()
  }

  return (
    <div className="grid gap-6">
      {SETTING_FIELDS.map(field => (
        <div key={field.key} className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-6">
          <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text)] mb-1">{field.label}</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">{field.description}</p>

          {(field.image || field.type === 'url') && values[field.key] && (
            <div className="mb-3">
              <Image src={values[field.key]} alt={field.label} width={64} height={64} className="w-16 h-16 rounded-lg border border-[var(--border)] object-cover" unoptimized />
            </div>
          )}

          {field.type === 'textarea' ? (
            <textarea value={values[field.key] ?? ''} onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
              rows={3}
              disabled={!canCrud}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all mb-3 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" />
          ) : (
            <input type={field.type} value={values[field.key] ?? ''} onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
              placeholder={field.type === 'url' ? 'https://example.com/gambar.jpg' : field.type === 'email' ? 'email@example.com' : ''}
              disabled={!canCrud}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all mb-3 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" />
          )}

          {canCrud && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => handleSave(field.key)} disabled={saving === field.key}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all disabled:opacity-60">
                {saving === field.key ? 'Menyimpan...' : 'Simpan'}
              </button>

              {field.image && (
                <button onClick={() => handleUpload(field.key)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] transition-all">
                  <Upload className="w-4 h-4" /> Upload Gambar
                </button>
              )}

              {values[field.key] && (
                <button onClick={async () => {
                  setValues(p => ({ ...p, [field.key]: '' }))
                  setSaving(field.key)
                  try {
                    await api.updateSetting(field.key, '')
                    toast('success', `${field.label} direset`)
                  } catch {
                    toast('error', 'Gagal mereset')
                  } finally {
                    setSaving(null)
                  }
                }} disabled={saving === field.key}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-all disabled:opacity-60">
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ContactEditor({ contactInfo, canCrud, onSave }: { contactInfo: RowRecord | undefined; canCrud: boolean; onSave: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({
    phone_primary: contactInfo?.phone_primary || '',
    phone_secondary: contactInfo?.phone_secondary || '',
    whatsapp: contactInfo?.whatsapp || '',
    email_primary: contactInfo?.email_primary || '',
    email_admission: contactInfo?.email_admission || '',
    address: contactInfo?.address || '',
    office_hours: contactInfo?.office_hours || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!canCrud) return
    setSaving(true)
    try {
      await api.updateContactInfo(form)
      toast('success', 'Info kontak berhasil disimpan')
      onSave()
    } catch (e) {
      toast('error', errorMessage(e, 'Gagal menyimpan'))
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'phone_primary', label: 'Telepon Utama', type: 'text' },
    { key: 'phone_secondary', label: 'Telepon Kedua', type: 'text' },
    { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
    { key: 'email_primary', label: 'Email Utama', type: 'text' },
    { key: 'email_admission', label: 'Email Penerimaan (PPDB)', type: 'text' },
    { key: 'office_hours', label: 'Jam Operasional Kantor', type: 'text' },
    { key: 'address', label: 'Alamat Lengkap', type: 'textarea' },
  ]

  return (
    <div className="grid gap-6">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-6 space-y-6">
        <div>
          <h2 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)]">Edit Info Kontak</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Ubah alamat, nomor telepon, email, dan jam operasional pesantren</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  disabled={!canCrud}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none resize-y focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  disabled={!canCrud}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              )}
            </div>
          ))}
        </div>

        {canCrud && (
          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
