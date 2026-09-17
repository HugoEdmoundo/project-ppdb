import type { MetadataRoute } from 'next'
import { getNews, getPrograms } from './lib/api'
import { newsArticles as seedNews } from './data/news'
import { programs as seedPrograms } from './data/programs'
import type { NewsArticle, Program } from './lib/types'

const baseUrl = 'https://ptdarrahman.sch.id'

// Fallback tanggal statis yang konsisten (tidak berubah tiap build) saat item
// dari API tidak punya kolom tanggal yang valid.
const NEWS_FALLBACK_DATE = '2026-05-15'
const PROGRAM_FALLBACK_DATE = '2026-01-01'

type RawItem = Record<string, unknown>

function lastModifiedOf(item: RawItem, fallback: string): Date {
  const raw = item.updated_at ?? item.created_at ?? item.date
  if (typeof raw === 'string' && raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date(fallback)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/programs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/facilities`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.7 },
    { url: `${baseUrl}/staff`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/achievements`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/ppdb`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Ambil dari CMS (API). Jika gagal/timeout, fallback ke seed statis agar
  // sitemap selalu bisa digenerate.
  let news: NewsArticle[] = seedNews as unknown as NewsArticle[]
  let programs: Program[] = seedPrograms as unknown as Program[]
  try {
    const liveNews = await getNews()
    if (liveNews.length > 0) news = liveNews
  } catch {
    // fallback ke seed
  }
  try {
    const livePrograms = await getPrograms()
    if (livePrograms.length > 0) programs = livePrograms
  } catch {
    // fallback ke seed
  }

  const newsRoutes: MetadataRoute.Sitemap = news.map((article) => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: lastModifiedOf(article as unknown as RawItem, NEWS_FALLBACK_DATE),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const programRoutes: MetadataRoute.Sitemap = programs.map((program) => ({
    url: `${baseUrl}/programs/${program.slug}`,
    lastModified: lastModifiedOf(program as unknown as RawItem, PROGRAM_FALLBACK_DATE),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...newsRoutes, ...programRoutes]
}
