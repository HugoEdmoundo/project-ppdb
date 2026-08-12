'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, SearchX, Lock, KeyRound,
  FileX, Gauge, Server, CloudOff, Clock,
  Home, RefreshCw, ArrowRight,
} from 'lucide-react'

interface ErrorConfig {
  icon: typeof AlertTriangle
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  actions: 'retry-home' | 'home-contact' | 'home-signin' | 'home'
}

const errors: Record<number, ErrorConfig> = {
  400: {
    icon: FileX,
    title: 'Permintaan Tidak Valid',
    titleEn: 'Bad Request',
    description: 'Maaf, permintaan tidak dapat diproses karena data yang dikirim tidak sesuai. Silakan periksa kembali input Anda.',
    descriptionEn: 'The request could not be processed due to invalid data. Please check your input.',
    actions: 'home-contact',
  },
  401: {
    icon: KeyRound,
    title: 'Tidak Diizinkan',
    titleEn: 'Unauthorized',
    description: 'Anda perlu masuk terlebih dahulu untuk mengakses halaman ini.',
    descriptionEn: 'You need to sign in to access this page.',
    actions: 'home-signin',
  },
  403: {
    icon: Lock,
    title: 'Akses Ditolak',
    titleEn: 'Forbidden',
    description: 'Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.',
    descriptionEn: 'You do not have permission to access this page.',
    actions: 'home-contact',
  },
  404: {
    icon: SearchX,
    title: 'Halaman Tidak Ditemukan',
    titleEn: 'Page Not Found',
    description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan. Coba periksa kembali URL-nya.',
    descriptionEn: 'The page you are looking for could not be found or has been moved.',
    actions: 'home-contact',
  },
  429: {
    icon: Gauge,
    title: 'Terlalu Banyak Permintaan',
    titleEn: 'Too Many Requests',
    description: 'Anda telah melampaui batas permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.',
    descriptionEn: 'You have exceeded the request limit. Please wait before trying again.',
    actions: 'retry-home',
  },
  500: {
    icon: AlertTriangle,
    title: 'Kesalahan Server',
    titleEn: 'Server Error',
    description: 'Maaf, terjadi kesalahan yang tidak terduga. Tim teknis kami telah diberitahu dan akan segera memperbaikinya.',
    descriptionEn: 'An unexpected error occurred. Our team has been notified and will fix it soon.',
    actions: 'retry-home',
  },
  502: {
    icon: Server,
    title: 'Gerbang Tidak Valid',
    titleEn: 'Bad Gateway',
    description: 'Server menerima respons yang tidak valid dari server upstream. Silakan coba lagi nanti.',
    descriptionEn: 'The server received an invalid response from an upstream server. Please try again later.',
    actions: 'retry-home',
  },
  503: {
    icon: CloudOff,
    title: 'Layanan Tidak Tersedia',
    titleEn: 'Service Unavailable',
    description: 'Server sedang tidak tersedia karena pemeliharaan atau kelebihan beban. Silakan coba lagi nanti.',
    descriptionEn: 'The server is temporarily unavailable due to maintenance or overload. Please try again later.',
    actions: 'retry-home',
  },
  504: {
    icon: Clock,
    title: 'Waktu Habis',
    titleEn: 'Gateway Timeout',
    description: 'Server terlalu lama merespons. Silakan coba lagi.',
    descriptionEn: 'The server took too long to respond. Please try again.',
    actions: 'retry-home',
  },
}

interface ErrorDisplayProps {
  status?: number
  retry?: () => void
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted
}

export default function ErrorDisplay({ status = 500, retry }: ErrorDisplayProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon
  const mounted = useMounted()

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-8 md:py-12">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />

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
        className="relative z-10 w-full max-w-sm sm:max-w-md"
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
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-8 sm:p-10 md:p-14 text-center">
            {/* Gradient border accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-gold)]/20 to-transparent" />

            {/* Icon */}
            <div className="relative mx-auto mb-5 md:mb-6 w-14 h-14 md:w-16 md:h-16">
              <div className="absolute inset-0 rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent-gold)]/5" />
              <Icon className="relative w-7 h-7 md:w-8 md:h-8 text-[var(--accent)] mx-auto mt-3.5 md:mt-4" />
            </div>

            {/* Status */}
            <h1 className="font-[var(--font-display)] text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/60 bg-clip-text text-transparent mb-1 leading-none">
              {status}
            </h1>

            {/* Divider */}
            <div className="mx-auto my-4 md:my-5 w-14 md:w-16 h-0.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)]" />

            {/* Title */}
            <h2 className="font-[var(--font-display)] text-xl md:text-2xl lg:text-3xl font-semibold text-[var(--text)] mb-1 px-2">
              {config.title}
            </h2>
            <p className="text-[11px] md:text-xs text-[var(--text-muted)] mb-3 md:mb-4 font-medium tracking-wider uppercase">
              {config.titleEn}
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-6 md:mb-8 max-w-xs mx-auto px-2">
              {config.description}
            </p>

            {/* Actions — full-width buttons on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 md:gap-3 px-2">
              {renderActions(config.actions, retry)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderActions(type: ErrorConfig['actions'], retry?: () => void) {
  const base = 'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200'

  switch (type) {
    case 'retry-home':
      return (
        <>
          {retry && (
            <button
              onClick={retry}
              className={`${base} bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0`}
            >
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </button>
          )}
          <Link
            href="/"
            className={`${base} border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] active:scale-[0.98]`}
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
            className={`${base} bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0`}
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
          <Link
            href="/contact"
            className={`${base} border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] active:scale-[0.98]`}
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
            className={`${base} bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0`}
          >
            <ArrowRight className="w-4 h-4" />
            Masuk
          </Link>
          <Link
            href="/"
            className={`${base} border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] active:scale-[0.98]`}
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
          className={`${base} bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0`}
        >
          <Home className="w-4 h-4" />
          Ke Beranda
        </Link>
      )
  }
}
