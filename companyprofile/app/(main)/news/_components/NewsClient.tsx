'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { NewsArticle } from '@/app/lib/types'
import { ArrowRight, Calendar } from 'lucide-react'

export default function NewsClient({ news }: { news: NewsArticle[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    document.title = 'Berita & Acara | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.08 })

  const sorted = [...news].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = searchQuery
    ? sorted.filter((a) => {
        const info = a.content || {}
        const q = searchQuery.toLowerCase()
        return (
          (info.title || '').toLowerCase().includes(q) ||
          (info.excerpt || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
        )
      })
    : sorted

  const featured = searchQuery ? null : filtered[0]
  const rest = searchQuery ? filtered : filtered.slice(1)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <>
          <PageHeader
        title="Berita & Acara"
        subtitle="Ikuti berita terbaru, prestasi, dan acara di Ar-Rahman"
        badge="BERITA TERBARU"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Featured Article */}
          {featured && (() => {
            const info = featured.content ?? {}
            return (
              <Link
                href={`/news/${featured.slug}`}
                className="group block mb-16 !no-underline"
              >
                <div className="grid lg:grid-cols-5 gap-8 items-center">
                  <div className="lg:col-span-3 img-overlay rounded-xl sm:rounded-2xl shadow-md relative aspect-[4/3]">
                    {featured.image ? <Image src={featured.image} alt={info?.title || 'Gambar berita utama'} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" priority /> : <div className="w-full h-full bg-[var(--bg-secondary)]" />}
                  </div>
                  <div className="lg:col-span-2">
                    <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold uppercase tracking-wider">
                      {featured.category}
                    </span>
                    <h2 className="font-[var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--text)] mt-4 mb-3 leading-tight group-hover:text-[var(--accent)] transition-colors">
                      {info.title}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-4">
                      {info.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(featured.date)}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })()}

          <div className="verse-divider mb-12" />

           {/* Search Bar */}
           <div className="max-w-md mb-12">
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel..."
                className="input-field"
                aria-label="Cari artikel"
             />
           </div>

          {/* Article Grid */}
          {rest.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((article) => {
              const info = article.content ?? {}
              return (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group glass-card rounded-2xl overflow-hidden !no-underline"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <Image src={article.image || ''} alt={info?.title || 'Gambar berita'} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" loading="lazy" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-[var(--accent)] text-white shadow-sm">
                      {article.category}
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(article.date)}
                    </div>
                    <h3 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)] mb-2 leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {info.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-4">
                      {info.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] group-hover:gap-2 transition-all">
                      Baca Selengkapnya
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          ) : (
            <p className="text-center text-[var(--text-muted)] py-12">
              Tidak ada artikel yang cocok dengan pencarian Anda.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
