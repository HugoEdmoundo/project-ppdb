'use client'

import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { Construction, ArrowRight, Bell } from 'lucide-react'

export default function PPDBPage() {
  return (
    <>
      <PageHeader
        title="PPDB Registration"
        subtitle="Mulai perjalanan Anda di Ar-Rahman. Bergabunglah dalam warisan keunggulan Quran dan digital."
        badge="TAHUN AJARAN 2027/2028"
      />

      <section className="py-20 md:py-32 bg-[var(--bg)]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-8">
            <Construction className="w-10 h-10 text-[var(--accent)]" />
          </div>

          <h2 className="font-[var(--font-display)] text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">
            Pendaftaran Online — Segera Hadir
          </h2>

          <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8 max-w-lg mx-auto">
            Kami sedang menyiapkan sistem pendaftaran online terbaik untuk Anda. Pantau terus halaman ini untuk informasi terbaru.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/contact" className="btn-primary">
              <Bell className="w-4 h-4" />
              Hubungi Kami
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/programs" className="btn-ghost">
              Lihat Program
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] pt-10">
            <h3 className="font-[var(--font-heading)] text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Sementara itu, jelajahi
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { href: '/programs', label: 'Program Unggulan' },
                { href: '/facilities', label: 'Fasilitas' },
                { href: '/gallery', label: 'Galeri' },
                { href: '/about', label: 'Tentang Kami' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
