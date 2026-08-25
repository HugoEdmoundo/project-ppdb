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
  'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] text-white shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
const btnOutline =
  'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 border-[var(--border)] text-[var(--text)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'

export default function ErrorDisplay({ status = 500, retry, digest }: ErrorDisplayProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon
  const mounted = useMounted()

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-[var(--bg)] px-4 py-12">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)]/50 via-transparent to-[var(--color-gold-subtle)]/50" />
      
      {/* Main card */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="relative z-10 w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] rounded-2xl blur-lg opacity-20 animate-pulse" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-gold)] rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Status code */}
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)] bg-clip-text text-transparent mb-4">
            {status}
          </h1>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-2">
            {config.title}
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-medium tracking-wide uppercase mb-6">
            {config.titleEn}
          </p>

          {/* Description */}
          <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-6">
            {config.description}
          </p>

          {/* Hint */}
          <p className="text-sm text-[var(--text-muted)]/70 mb-8">
            {config.hint}
          </p>

          {digest && (
            <div className="mb-8">
              <span className="inline-block px-3 py-1.5 bg-[var(--accent-subtle)]/50 rounded-lg text-xs font-mono text-[var(--text-muted)]">
                Error ID: {digest}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {renderActions(config.actions, retry)}
          </div>

          {/* Back link for 404 */}
          {status === 404 && (
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
              className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mx-auto"
            >
              <Undo2 className="w-4 h-4" />
              Kembali ke halaman sebelumnya
            </button>
          )}
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
            href="/auth/login"
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
