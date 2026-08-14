'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, SearchX, Lock, KeyRound,
  FileX, Gauge, Server, CloudOff, Clock,
  Home, RefreshCw, ArrowRight, Undo2,
} from 'lucide-react'

interface ErrorConfig {
  icon: typeof AlertTriangle
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  hint: string
  actions: 'retry-home' | 'home-contact' | 'home-signin' | 'home'
}

const errors: Record<number, ErrorConfig> = {
  400: {
    icon: FileX,
    title: 'Permintaan Tidak Valid',
    titleEn: 'Bad Request',
    description: 'Maaf, permintaan tidak dapat diproses karena data yang dikirim tidak sesuai. Silakan periksa kembali input Anda.',
    descriptionEn: 'The request could not be processed due to invalid data. Please check your input.',
    hint: 'Periksa kembali formulir atau URL yang Anda masukkan.',
    actions: 'home-contact',
  },
  401: {
    icon: KeyRound,
    title: 'Tidak Diizinkan',
    titleEn: 'Unauthorized',
    description: 'Anda perlu masuk terlebih dahulu untuk mengakses halaman ini.',
    descriptionEn: 'You need to sign in to access this page.',
    hint: 'Silakan masuk menggunakan akun Anda untuk melanjutkan.',
    actions: 'home-signin',
  },
  403: {
    icon: Lock,
    title: 'Akses Ditolak',
    titleEn: 'Forbidden',
    description: 'Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.',
    descriptionEn: 'You do not have permission to access this page.',
    hint: 'Hubungi kami bila Anda merasa ini sebuah kesalahan.',
    actions: 'home-contact',
  },
  404: {
    icon: SearchX,
    title: 'Halaman Tidak Ditemukan',
    titleEn: 'Page Not Found',
    description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan. Coba periksa kembali URL-nya.',
    descriptionEn: 'The page you are looking for could not be found or has been moved.',
    hint: 'Anda dapat kembali ke halaman sebelumnya atau menjelajah menu di atas.',
    actions: 'home-contact',
  },
  429: {
    icon: Gauge,
    title: 'Terlalu Banyak Permintaan',
    titleEn: 'Too Many Requests',
    description: 'Anda telah melampaui batas permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.',
    descriptionEn: 'You have exceeded the request limit. Please wait before trying again.',
    hint: 'Mohon tunggu sebentar, lalu coba kembali.',
    actions: 'retry-home',
  },
  500: {
    icon: AlertTriangle,
    title: 'Kesalahan Server',
    titleEn: 'Server Error',
    description: 'Maaf, terjadi kesalahan yang tidak terduga. Tim teknis kami telah diberitahu dan akan segera memperbaikinya.',
    descriptionEn: 'An unexpected error occurred. Our team has been notified and will fix it soon.',
    hint: 'Bila masalah berlanjut, silakan hubungi kami.',
    actions: 'retry-home',
  },
  502: {
    icon: Server,
    title: 'Gerbang Tidak Valid',
    titleEn: 'Bad Gateway',
    description: 'Server menerima respons yang tidak valid dari server upstream. Silakan coba lagi nanti.',
    descriptionEn: 'The server received an invalid response from an upstream server. Please try again later.',
    hint: 'Coba muat ulang halaman setelah beberapa saat.',
    actions: 'retry-home',
  },
  503: {
    icon: CloudOff,
    title: 'Layanan Tidak Tersedia',
    titleEn: 'Service Unavailable',
    description: 'Server sedang tidak tersedia karena pemeliharaan atau kelebihan beban. Silakan coba lagi nanti.',
    descriptionEn: 'The server is temporarily unavailable due to maintenance or overload. Please try again later.',
    hint: 'Kami sedang dalam pemeliharaan. Mohon kembali beberapa saat lagi.',
    actions: 'retry-home',
  },
  504: {
    icon: Clock,
    title: 'Waktu Habis',
    titleEn: 'Gateway Timeout',
    description: 'Server terlalu lama merespons. Silakan coba lagi.',
    descriptionEn: 'The server took too long to respond. Please try again.',
    hint: 'Koneksi Anda mungkin lambat. Coba muat ulang halaman.',
    actions: 'retry-home',
  },
}

interface ErrorDisplayProps {
  status?: number
  retry?: () => void
  digest?: string
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/90 text-white shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white'
const btnOutline =
  'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white'

export default function ErrorDisplay({ status = 500, retry, digest }: ErrorDisplayProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon
  const mounted = useMounted()

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-8 md:py-12">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />

      {/* Decorative pattern */}
      <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.05]" />

      {/* Decorative orbs — smaller on mobile, larger on desktop */}
      <div className="absolute -top-24 -right-24 md:-top-32 md:-right-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-[var(--accent-subtle)] opacity-20 md:opacity-30 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 md:-bottom-40 md:-left-40 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-[var(--color-gold-subtle)] opacity-20 md:opacity-25 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-[var(--accent)]/5 blur-3xl" />

      {/* Floating particles — hidden on mobile */}
      <div className="hidden md:block absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-[var(--accent)]/20 blur-sm" />
      <div className="hidden md:block absolute bottom-1/3 left-1/3 w-3 h-3 rounded-full bg-[var(--accent-gold)]/15 blur-sm" />
      <div className="hidden md:block absolute top-2/3 right-1/3 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/10 blur-sm" />

      {/* Main card */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="relative z-10 w-full max-w-sm sm:max-w-md animate-empty-in"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        <div className="relative">
          {/* Glow behind card */}
          <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-[var(--accent-gold)]/5 rounded-2xl md:rounded-3xl blur-xl" />

          {/* Glass card */}
          <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-2xl p-8 sm:p-10 md:p-14 text-center">
            {/* Gradient border accents */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-gold)]/30 to-transparent" />

            {/* Icon container */}
            <div className="relative mx-auto mb-6 md:mb-8">
              <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                {/* Background glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-gold)]/20 blur-xl" />
                {/* Icon wrapper */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/80 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Status */}
            <h1 className="font-[var(--font-display)] text-7xl md:text-8xl lg:text-9xl font-bold text-[var(--accent)] mb-2 leading-none tracking-tight">
              {status}
            </h1>

            {/* Decorative line */}
            <div className="mx-auto my-5 md:my-6 w-16 md:w-20 h-1 rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-gold)] to-[var(--accent)]" />

            {/* Title */}
            <h2 className="font-[var(--font-display)] text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--text)] mb-2">
              {config.title}
            </h2>
            <p className="text-sm md:text-base text-[var(--text-muted)] mb-6 md:mb-8 font-medium tracking-wide">
              {config.titleEn}
            </p>

            {/* Description */}
            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed mb-8 md:mb-10 max-w-sm mx-auto px-4">
              {config.description}
            </p>

            {/* Contextual hint */}
            <p className="text-xs md:text-sm text-[var(--text-muted)]/70 mb-8 md:mb-10 max-w-sm mx-auto px-4">
              {config.hint}
            </p>

            {digest && (
              <p className="text-[11px] md:text-xs text-[var(--text-muted)] font-mono mb-6 md:mb-8 bg-[var(--accent-subtle)] rounded-lg px-2.5 md:px-3 py-1.5 inline-block">
                Error ID: {digest}
              </p>
            )}

            {/* Actions — full-width buttons on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 md:gap-3 px-2">
              {renderActions(config.actions, retry)}
            </div>

            {/* Back link for navigation errors */}
            {status === 404 && (
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Kembali ke halaman sebelumnya
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function renderActions(type: ErrorConfig['actions'], retry?: () => void) {
  switch (type) {
    case 'retry-home':
      return (
        <>
          {retry && (
            <button
              onClick={retry}
              className={btnPrimary}
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
          )}
          <Link
            href="/"
            className={btnOutline}
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
        </>
      )
    case 'home-contact':
      return (
        <>
          <Link
            href="/"
            className={btnPrimary}
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
          <Link
            href="/contact"
            className={btnOutline}
          >
            <ArrowRight className="w-4 h-4" />
            Hubungi Kami
          </Link>
        </>
      )
    case 'home-signin':
      return (
        <>
          <Link
            href="/auth"
            className={btnPrimary}
          >
            <ArrowRight className="w-4 h-4" />
            Masuk
          </Link>
          <Link
            href="/"
            className={btnOutline}
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
        </>
      )
    case 'home':
      return (
        <Link
          href="/"
          className={btnPrimary}
        >
          <Home className="w-4 h-4" />
          Ke Beranda
        </Link>
      )
  }
}
