'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react'
import VerseStrip from '../ui/VerseStrip'
import { socialLinks as staticSocialLinks } from '@/app/data/social'
import { getContactInfo, getSocialLinks } from '@/app/lib/api'
import { useBrand } from '@repo/ui'

interface SocialItem {
  label: string
  href: string
  path: string
}

interface ContactState {
  address: string
  phone: string
  email: string
}

const FALLBACK_CONTACT: ContactState = {
  address: 'Rukan Hexa Green Kalimalang, Jl. Inspeksi Kalimalang C8-C9, Jatimulya, Tambun Selatan, Bekasi 175106',
  phone: '(021) 812-8361-2352',
  email: 'info@ptdarrahman.sch.id',
}

export default function Footer() {
  const { logoUrl } = useBrand(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  const [socials, setSocials] = useState<SocialItem[]>(staticSocialLinks)
  const [contact, setContact] = useState<ContactState>(FALLBACK_CONTACT)

  useEffect(() => {
    // Tautan sosial & info kontak dinamis dari API; fallback statis jika kosong/error.
    getSocialLinks()
      .then((items) => {
        const valid = (items || []).filter((s) => s?.href && s?.path)
        if (valid.length > 0) setSocials(valid as unknown as SocialItem[])
      })
      .catch(() => {})
    getContactInfo()
      .then((info) => {
        if (!info) return
        setContact({
          address: info.address || FALLBACK_CONTACT.address,
          phone: info.phone_primary || FALLBACK_CONTACT.phone,
          email: info.email_primary || FALLBACK_CONTACT.email,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="relative bg-[var(--bg-secondary)] pt-16 pb-8 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, var(--color-emerald) 0%, transparent 70%)' }}
      />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)' }}
      />

      <VerseStrip className="mb-16" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 mb-10 sm:mb-12">
          {/* Logo & About */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="PTDARRAHMAN Logo"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg select-none">ار</div>
              )}
              <div>
                <div className="font-[var(--font-heading)] text-base font-bold text-[var(--text)] leading-tight tracking-tight">
                  PTDARRAHMAN
                </div>
                <div className="text-[10px] sm:text-xs tracking-wider text-[var(--text-muted)]">
                  {'Pesantren Tahfidz Qur\'an dan Digital Arrahman'}
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 max-w-xs lg:max-w-xs">
              {'Where Divine Knowledge Meets Digital Excellence. Pesantren premium yang mengintegrasikan hafalan Al-Quran dengan teknologi modern.'}
            </p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 sm:p-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all hover:scale-110"
                  aria-label={s.label}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-[var(--font-heading)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">
              {'Tautan'}
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Beranda' },
                { href: '/about', label: 'Tentang' },
                { href: '/programs', label: 'Program' },
                { href: '/facilities', label: 'Fasilitas' },
                { href: '/gallery', label: 'Galeri' },
                { href: '/contact', label: 'Kontak' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 group">
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div className="lg:col-span-3">
            <h4 className="font-[var(--font-heading)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">
              {'Program'}
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/programs/tahfidz', label: 'Tahfidz Al-Quran' },
                { href: '/programs/digital', label: 'Teknologi Digital' },
                { href: '/programs/bilingual', label: 'Program Bilingual' },
                { href: '/programs/leadership', label: 'Akademi Kepemimpinan' },
                { href: '/ppdb', label: 'Pendaftaran PPDB' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 group">
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <h4 className="font-[var(--font-heading)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6">
              {'Kontak'}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <MapPin className="w-4 h-4 mt-0.5 text-[var(--accent)] flex-shrink-0" />
                <span>
                  {contact.address}
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Phone className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                <span>{contact.phone}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Mail className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                <span>{contact.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--color-border)] pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; 2021 &ndash; {new Date().getFullYear()} {"Pesantren Tahfidz Qur'an dan Digital Arrahman."} {'Hak cipta dilindungi.'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {'HugoEdmoundo Companies'}
          </p>
        </div>
      </div>
    </footer>
  )
}
