'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import Link from 'next/link'
import { Calendar, User, ArrowLeft, ArrowRight } from 'lucide-react'
import RichContent from '@/app/components/ui/RichContent'
import type { NewsArticle } from '@/app/lib/types'

export default function NewsDetailClient({ article, allNews }: { article: NewsArticle; allNews: NewsArticle[] }) {
  const info = article.content

  const currentIndex = allNews.findIndex((a) => a.slug === article.slug)
  const prev = currentIndex > 0 ? allNews[currentIndex - 1] : null
  const next = currentIndex < allNews.length - 1 ? allNews[currentIndex + 1] : null

  useEffect(() => {
    document.title = `${info?.title ?? ''} | PTDARRAHMAN`
  }, [info])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 overflow-hidden">
        <div className="absolute inset-0">
          {article.image ? (
            <Image src={article.image} alt={info?.title || 'Gambar Berita'} fill className="object-cover" sizes="100vw" priority />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/95" />
        </div>
        <div className="absolute top-0 left-0 right-0 verse-strip" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="mb-6 space-y-3">
            <Link href="/news" className="glass-card inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] shadow-sm hover:shadow-md transition-all">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Berita
            </Link>
            <div>
              <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold uppercase tracking-wider">
                {article.category}
              </span>
            </div>
          </div>
          <h1 className="font-[var(--font-display)] text-3xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] leading-[1.05] mt-4 mb-4 tracking-[-0.02em]">
            {info?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(article.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {info?.author}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="prose prose-gray max-w-none">
          <RichContent content={info?.content ?? ''} />
          </div>

{article.gallery && article.gallery.length > 0 && (
            <div className="img-overlay rounded-xl sm:rounded-2xl shadow-md overflow-hidden mb-8 relative aspect-[16/9]">
              <Image src={article.gallery[0] || ''} alt={info?.title || 'Galeri Berita'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" loading="lazy" />
            </div>
          )}

          <div className="verse-divider my-16" />

          {/* Prev/Next Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {prev ? (() => {
              const p = prev.content ?? {}
              return (
                <Link href={`/news/${prev.slug}`} className="group flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                  <div className="text-right">
                    <div className="text-xs">Sebelumnya</div>
                    <div className="font-medium line-clamp-1">{p.title}</div>
                  </div>
                </Link>
              )
            })() : <div />}
            {next ? (() => {
              const n = next.content ?? {}
              return (
                <Link href={`/news/${next.slug}`} className="group flex items-center gap-3 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  <div>
                    <div className="text-xs">Selanjutnya</div>
                    <div className="font-medium line-clamp-1">{n.title}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              )
            })() : <div />}
          </div>
        </div>
      </section>
    </>
  )
}
