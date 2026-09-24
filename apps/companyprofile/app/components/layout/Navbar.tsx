'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Menu, X, ChevronDown } from 'lucide-react'
import AnimatedLogo from '../ui/AnimatedLogo'
import MagneticButton from '../ui/MagneticButton'
import { useProgramLinks } from '@/app/hooks/useProgramLinks'
import { useBrand } from '@repo/ui'

const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'

interface NavChild {
  href: string
  label: string
  programKey?: string
}

interface NavItem {
  key: string
  href: string
  label: string
  dropdown?: boolean
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { key: 'home', href: '/', label: 'Beranda', dropdown: false },
  {
    key: 'about', href: '/about', label: 'Tentang', dropdown: true,
    children: [
      { href: '/about', label: 'Tentang Kami' },
      { href: '/about#vision', label: 'Visi & Misi' },
      { href: '/staff', label: 'Guru & Staff' },
      { href: '/achievements', label: 'Prestasi' },
      { href: '/facilities', label: 'Fasilitas' },
      { href: '/gallery', label: 'Galeri' },
    ],
  },
  {
    key: 'programs', href: '/programs', label: 'Program', dropdown: true,
    children: [
      { href: '/programs/tahfidz', label: 'Tahfidz Al-Quran', programKey: 'tahfidz' },
      { href: '/programs/digital', label: 'Teknologi Digital', programKey: 'digital' },
      { href: '/programs/bilingual', label: 'Program Bilingual', programKey: 'bilingual' },
      { href: '/programs/leadership', label: 'Akademi Kepemimpinan', programKey: 'leadership' },
    ],
  },
  { key: 'ppdb', href: '/ppdb', label: 'PPDB', dropdown: false },
  { key: 'news', href: '/news', label: 'Berita', dropdown: false },
  { key: 'contact', href: '/contact', label: 'Kontak', dropdown: false },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { logoUrl } = useBrand(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  const { hrefFor } = useProgramLinks()
  const pathname = usePathname()
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const childHref = (child: NavChild) => (child.programKey ? hrefFor(child.programKey) : child.href)

  // Sync state with pathname change during rendering instead of useEffect to avoid cascading render lint warning
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setMobileOpen(false)
    setOpenDropdown(null)
  }

  const handleNavClick = useCallback((e: React.MouseEvent, href: string) => {
    const [base, hash] = href.split('#')
    if (hash && pathname === base) {
      e.preventDefault()
      setMobileOpen(false)
      setOpenDropdown(null)
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    setTimeout(() => {
      setScrolled(window.scrollY > 80)
    }, 0)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleDropdownEnter = (key: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current)
    setOpenDropdown(key)
  }

  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 250)
  }

  const handleDropdownContentEnter = () => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current)
  }

  const isHome = pathname === '/'
  const isTransparent = isHome && !scrolled

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-white/80 backdrop-blur-2xl border-b border-[var(--color-border)] shadow-sm ${
        isTransparent ? 'md:-translate-y-full md:bg-transparent md:border-transparent md:shadow-none' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav role="navigation" aria-label="Navigasi utama" className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0 min-w-0">
            {logoUrl ? (
              <AnimatedLogo
                src={logoUrl}
                alt="PTDARRAHMAN Logo"
                isTransparent={isTransparent}
              />
            ) : (
              <span
                className={`flex items-center justify-center h-10 w-10 rounded-xl font-[var(--font-display)] font-bold text-xl ${
                  isTransparent ? 'bg-white/20 text-white' : 'bg-[var(--accent)] text-white'
                }`}
              >
                A
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.key}
                className="relative"
                onMouseEnter={() => item.dropdown && handleDropdownEnter(item.key)}
                onMouseLeave={handleDropdownLeave}
              >
                {item.dropdown ? (
                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-1 ${
                      isTransparent
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                      pathname === item.href
                        ? isTransparent
                          ? 'text-white bg-white/15'
                          : 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                        : isTransparent
                          ? 'text-white/70 hover:text-white hover:bg-white/10'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}

                {item.dropdown && openDropdown === item.key && (
                  <div
                    onMouseEnter={handleDropdownContentEnter}
                    onMouseLeave={handleDropdownLeave}
                    className="absolute top-full left-0 mt-2 w-56 bg-white/90 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-xl py-3 animate-dropdown-in"
                  >
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={childHref(child)}
                        onClick={(e) => handleNavClick(e, childHref(child))}
                        className="block px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <MagneticButton strength={0.25}>
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden md:inline-flex items-center px-5 py-2.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                isTransparent
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-[var(--accent)] text-white hover:bg-[#15803D] hover:shadow-md'
              }`}
            >
              Student&apos;s
            </a>
            </MagneticButton>

            <button
              className="lg:hidden! inline-flex items-center justify-center z-50 p-3 rounded-lg hover:bg-black/5 active:bg-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Buka/tutup menu"
              aria-expanded={mobileOpen}
              style={{ position: 'relative' }}
            >
              {mobileOpen ? (
                <X className={`w-6 h-6 pointer-events-none ${isTransparent && !scrolled ? 'text-white' : 'text-[var(--text)]'}`} />
              ) : (
                <Menu className={`w-6 h-6 pointer-events-none ${isTransparent && !scrolled ? 'text-white' : 'text-[var(--text)]'}`} />
              )}
            </button>
          </div>
        </nav>
      </div>

    </header>

      {/* Mobile Fullscreen Overlay — outside header to avoid CSS transform clipping fixed positioning */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 lg:hidden overflow-y-auto ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' }}
      >
        <div className="flex flex-col items-center justify-center min-h-full py-24 px-6">
          {navItems.map((item) => (
            <div key={item.key} className="text-center w-full max-w-xs">
              {item.dropdown ? (
                <>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.key ? null : item.key)}
                    className="w-full py-3 text-xl sm:text-2xl font-[var(--font-display)] font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-2"
                    aria-label={`Buka menu ${item.label}`}
                  >
                    {item.label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === item.key ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === item.key && (
                    <div className="mt-2 mb-2 space-y-2 bg-[var(--accent-subtle)] rounded-2xl py-3 px-4">
                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={childHref(child)}
                          onClick={(e) => {
                            handleNavClick(e, childHref(child))
                          }}
                          className="block py-3 text-sm md:text-base text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors font-medium"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-3 text-xl sm:text-2xl font-[var(--font-display)] font-bold transition-colors ${
                    pathname === item.href ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 px-10 py-3.5 bg-[var(--accent)] text-white text-sm font-bold rounded-full whitespace-nowrap hover:bg-[#15803D] transition-all"
          >
            Student&apos;s
          </a>
        </div>
      </div>
    </>
  )
}
