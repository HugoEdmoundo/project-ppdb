import { Link } from 'react-router-dom'
import {
  AlertTriangle, SearchX, Lock, KeyRound, FileX,
  Gauge, Server, CloudOff, Clock, Home, RefreshCw, ArrowRight, LogIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

type ErrorActions = 'retry-home' | 'signin-home' | 'home'

interface ErrorConfig {
  icon: LucideIcon
  title: string
  titleEn: string
  description: string
  actions: ErrorActions
}

const errors: Record<number, ErrorConfig> = {
  400: {
    icon: FileX,
    title: 'Permintaan Tidak Valid',
    titleEn: 'Bad Request',
    description: 'Maaf, permintaan tidak dapat diproses karena data yang dikirim tidak sesuai. Silakan periksa kembali input Anda.',
    actions: 'home',
  },
  401: {
    icon: KeyRound,
    title: 'Sesi Berakhir',
    titleEn: 'Unauthorized',
    description: 'Anda perlu masuk kembali untuk mengakses halaman ini.',
    actions: 'signin-home',
  },
  403: {
    icon: Lock,
    title: 'Akses Ditolak',
    titleEn: 'Forbidden',
    description: 'Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.',
    actions: 'home',
  },
  404: {
    icon: SearchX,
    title: 'Halaman Tidak Ditemukan',
    titleEn: 'Page Not Found',
    description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan. Coba periksa kembali URL-nya.',
    actions: 'home',
  },
  429: {
    icon: Gauge,
    title: 'Terlalu Banyak Permintaan',
    titleEn: 'Too Many Requests',
    description: 'Anda telah melampaui batas permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.',
    actions: 'retry-home',
  },
  500: {
    icon: AlertTriangle,
    title: 'Kesalahan Server',
    titleEn: 'Server Error',
    description: 'Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi dalam beberapa saat.',
    actions: 'retry-home',
  },
  502: {
    icon: Server,
    title: 'Gerbang Tidak Valid',
    titleEn: 'Bad Gateway',
    description: 'Server menerima respons yang tidak valid. Silakan coba lagi nanti.',
    actions: 'retry-home',
  },
  503: {
    icon: CloudOff,
    title: 'Layanan Tidak Tersedia',
    titleEn: 'Service Unavailable',
    description: 'Server sedang tidak tersedia karena pemeliharaan atau kelebihan beban. Silakan coba lagi nanti.',
    actions: 'retry-home',
  },
  504: {
    icon: Clock,
    title: 'Waktu Habis',
    titleEn: 'Gateway Timeout',
    description: 'Server terlalu lama merespons. Silakan coba lagi.',
    actions: 'retry-home',
  },
}

const btnBase =
  'h-auto min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0'

interface ErrorStateProps {
  status?: number
  retry?: () => void
  fullscreen?: boolean
  className?: string
}

export function ErrorState({ status = 500, retry, fullscreen = false, className }: ErrorStateProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden px-4 py-12 md:py-16',
        fullscreen && 'min-h-dvh',
        className
      )}
    >
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#D4A853]/10" />

      {/* Decorative orbs */}
      <div className="absolute -top-24 -right-24 md:-top-32 md:-right-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 md:-bottom-40 md:-left-40 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-[#D4A853]/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md animate-fadeIn">
        <div className="relative">
          {/* Glow */}
          <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-b from-primary/5 via-transparent to-[#D4A853]/5 rounded-2xl md:rounded-3xl blur-xl" />

          {/* Glass card */}
          <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-2xl p-8 sm:p-10 md:p-14 text-center">
            {/* Gradient border accents */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#D4A853]/30 to-transparent" />

            {/* Icon container */}
            <div className="relative mx-auto mb-6 md:mb-8">
              <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                {/* Background glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-[#D4A853]/20 blur-xl" />
                {/* Icon wrapper */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Status */}
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold text-primary mb-2 leading-none tracking-tight">
              {status}
            </h1>

            {/* Decorative line */}
            <div className="mx-auto my-5 md:my-6 w-16 md:w-20 h-1 rounded-full bg-gradient-to-r from-primary via-[#D4A853] to-primary" />

            {/* Title */}
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 px-2">
              {config.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8 font-medium tracking-wide">
              {config.titleEn}
            </p>

            {/* Description */}
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8 md:mb-10 max-w-sm mx-auto px-4">
              {config.description}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4 px-2">
              <ErrorActions actions={config.actions} retry={retry} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorActions({ actions, retry }: { actions: ErrorActions; retry?: () => void }) {
  switch (actions) {
    case 'retry-home':
      return (
        <>
          {retry && (
            <Button onClick={retry} size="lg" className={`${btnBase} w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90`}>
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          )}
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" size="lg" className={`${btnBase} w-full sm:w-auto`}>
              <Home className="h-4 w-4" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    case 'signin-home':
      return (
        <>
          <Link to="/login" className="inline-flex w-full sm:w-auto">
            <Button size="lg" className={`${btnBase} w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90`}>
              <LogIn className="h-4 w-4" />
              Masuk
            </Button>
          </Link>
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" size="lg" className={`${btnBase} w-full sm:w-auto`}>
              <Home className="h-4 w-4" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    default:
      return (
        <Link to="/" className="inline-flex w-full sm:w-auto">
          <Button size="lg" className={`${btnBase} w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90`}>
            <ArrowRight className="h-4 w-4" />
            Ke Beranda
          </Button>
        </Link>
      )
  }
}
