import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react'
import VerseStrip from '@/components/ui/VerseStrip'
import { socialLinks as staticSocialLinks, type SocialItem } from '@/data/social'
import { apiFetch, API_BASE } from '@/api/client'
import { useBrand } from '@repo/ui'

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

const getCompanyProfileBaseUrl = () => {
  if (import.meta.env.VITE_COMPANY_PROFILE_URL) {
    return (import.meta.env.VITE_COMPANY_PROFILE_URL as string).replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (hostname.includes('ptdarrahman.sch.id')) {
      return 'https://ptdarrahman.sch.id'
    }
    return `${protocol}//${hostname}:3000`
  }
  return 'http://localhost:3000'
}

export default function Footer() {
  const { logoUrl } = useBrand(API_BASE)
  const [socials, setSocials] = useState<SocialItem[]>(staticSocialLinks)
  const [contact, setContact] = useState<ContactState>(FALLBACK_CONTACT)
  const cpUrl = getCompanyProfileBaseUrl()

  useEffect(() => {
    // Tautan sosial & info kontak dinamis dari API; fallback statis jika kosong/error.
    apiFetch<SocialItem[]>('/companyprofile/social-links')
      .then((items) => {
        const valid = (items || []).filter((s) => s?.href && s?.path)
        if (valid.length > 0) setSocials(valid)
      })
      .catch(() => {})

    apiFetch<Record<string, any>>('/companyprofile/contact-info')
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

  const quickLinks = [
    { href: '/', label: 'Beranda', isInternal: true },
    { href: `${cpUrl}/about`, label: 'Tentang', isInternal: false },
    { href: `${cpUrl}/programs`, label: 'Program', isInternal: false },
    { href: `${cpUrl}/facilities`, label: 'Fasilitas', isInternal: false },
    { href: `${cpUrl}/gallery`, label: 'Galeri', isInternal: false },
    { href: `${cpUrl}/contact`, label: 'Kontak', isInternal: false },
  ]

  const programLinks = [
    { href: `${cpUrl}/programs/tahfidz`, label: 'Tahfidz Al-Quran', isInternal: false },
    { href: `${cpUrl}/programs/digital`, label: 'Teknologi Digital', isInternal: false },
    { href: `${cpUrl}/programs/bilingual`, label: 'Program Bilingual', isInternal: false },
    { href: `${cpUrl}/programs/leadership`, label: 'Akademi Kepemimpinan', isInternal: false },
    { href: '/register', label: 'Pendaftaran PPDB', isInternal: true },
  ]

  const handleLinkClick = (href: string, isInternal: boolean) => {
    if (isInternal && href === '/') {
      if (window.location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  return (
    <footer className="relative overflow-hidden bg-[#EFEDE8] pt-16 pb-8 text-foreground">
      {/* Decorative Orbs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #1A6B47 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #D4A853 0%, transparent 70%)' }}
      />

      <VerseStrip className="mb-16" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 grid sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 sm:mb-12">
          {/* Logo & About */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="mb-5 flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="PTDARRAHMAN Logo"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 select-none items-center justify-center rounded bg-emerald-primary text-lg font-bold text-white">
                  ار
                </div>
              )}
              <div>
                <div className="font-heading text-base font-bold leading-tight tracking-tight text-slate-900">
                  PTDARRAHMAN
                </div>
                <div className="text-[10px] tracking-wider text-slate-500 sm:text-xs">
                  Pesantren Tahfidz Qur'an dan Digital Arrahman
                </div>
              </div>
            </div>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-600 lg:max-w-xs">
              Where Divine Knowledge Meets Digital Excellence. Pesantren premium yang mengintegrasikan hafalan Al-Quran dengan teknologi modern.
            </p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 text-slate-400 transition-all hover:scale-110 hover:text-emerald-primary sm:p-0"
                  aria-label={s.label}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="mb-6 font-heading text-xs font-bold uppercase tracking-widest text-slate-400">
              Tautan
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  {l.isInternal ? (
                    <Link
                      to={l.href}
                      onClick={() => handleLinkClick(l.href, true)}
                      className="group flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-emerald-primary"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 -translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-emerald-primary"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 -translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div className="lg:col-span-3">
            <h4 className="mb-6 font-heading text-xs font-bold uppercase tracking-widest text-slate-400">
              Program
            </h4>
            <ul className="space-y-3">
              {programLinks.map((l) => (
                <li key={l.label}>
                  {l.isInternal ? (
                    <Link
                      to={l.href}
                      className="group flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-emerald-primary"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 -translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-emerald-primary"
                    >
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 -translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <h4 className="mb-6 font-heading text-xs font-bold uppercase tracking-widest text-slate-400">
              Kontak
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-primary" />
                <span>{contact.address}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="h-4 w-4 shrink-0 text-emerald-primary" />
                <span>{contact.phone}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4 shrink-0 text-emerald-primary" />
                <span>{contact.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E3E0D8] pt-6 sm:flex-row sm:gap-4 sm:pt-8">
          <p className="text-xs text-slate-400">
            &copy; 2021 &ndash; {new Date().getFullYear()} Pesantren Tahfidz Qur'an dan Digital Arrahman. Hak cipta dilindungi.
          </p>
          <p className="text-xs text-slate-400">
            HugoEdmoundo Companies
          </p>
        </div>
      </div>
    </footer>
  )
}
