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
  'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] text-white shadow-xl shadow-[var(--accent)]/30 hover:shadow-2xl hover:shadow-[var(--accent)]/40 hover:-translate-y-1 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white'
const btnOutline =
  'inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 border-2 border-[var(--border)] text-[var(--text)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white'

export default function ErrorDisplay({ status = 500, retry, digest }: ErrorDisplayProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon
  const mounted = useMounted()

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-8 md:py-12">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0 / 0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Floating gradient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-subtle)]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-gold-subtle)]/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[var(--accent-subtle)]/20 to-[var(--color-gold-subtle)]/20 rounded-full blur-3xl" />

      {/* Main content */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="relative z-10 w-full max-w-lg"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Large animated status number */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] blur-2xl opacity-30" />
          <h1 className="relative text-[120px] md:text-[160px] lg:text-[180px] font-black bg-gradient-to-br from-[var(--accent)] via-[var(--accent-gold)] to-[var(--accent)] bg-clip-text text-transparent leading-none tracking-tighter">
            {status}
          </h1>
        </div>

        {/* Icon with animation */}
        <div className="relative -mt-16 mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-gold)] rounded-2xl flex items-center justify-center shadow-2xl shadow-[var(--accent)]/30 transform hover:scale-110 transition-transform duration-300">
              <Icon className="w-12 h-12 md:w-14 md:h-14 text-white" />
            </div>
          </div>
        </div>

        {/* Title and subtitle */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text)] mb-3">
            {config.title}
          </h2>
          <p className="text-lg md:text-xl text-[var(--text-muted)] font-medium">
            {config.titleEn}
          </p>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 text-center max-w-md mx-auto">
          {config.description}
        </p>

        {/* Hint */}
        <p className="text-sm text-[var(--text-muted)]/70 mb-10 text-center max-w-md mx-auto">
          {config.hint}
        </p>

        {digest && (
          <div className="mb-10 text-center">
            <span className="inline-block px-4 py-2 bg-[var(--accent-subtle)] rounded-lg text-xs font-mono text-[var(--text-muted)]">
              Error ID: {digest}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {renderActions(config.actions, retry)}
        </div>

        {/* Back link for 404 */}
        {status === 404 && (
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
            className="mt-8 mx-auto flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Kembali ke halaman sebelumnya
          </button>
        )}
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
