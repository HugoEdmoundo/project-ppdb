import { Link } from 'react-router-dom'
import {
  AlertTriangle, SearchX, Lock, KeyRound, FileX,
  Gauge, Server, CloudOff, Clock, Home, RefreshCw, ArrowRight, LogIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

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

interface ErrorStateProps {
  status?: number
  retry?: () => void
  fullscreen?: boolean
  className?: string
}

export function ErrorState({ status = 500, retry, fullscreen = true, className }: ErrorStateProps) {
  const config = errors[status] || errors[500]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden px-4 py-10 md:py-16',
        fullscreen && 'min-h-dvh',
        className
      )}
    >
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-light/70 via-transparent to-gold-bg/70" />

      {/* Decorative orbs */}
      <div className="absolute -top-24 -right-24 md:-top-32 md:-right-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-emerald-light opacity-70 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 md:-bottom-40 md:-left-40 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-gold-bg opacity-70 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-emerald-primary/5 blur-3xl" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md animate-scale-in">
        <div className="relative">
          {/* Glow */}
          <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-b from-emerald-primary/5 via-transparent to-gold-accent/5 rounded-2xl md:rounded-3xl blur-xl" />

          {/* Glass card */}
          <div className="glass-card relative p-8 sm:p-10 md:p-14 text-center">
            {/* Gradient border accents */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-primary/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-accent/30 to-transparent" />

            {/* Icon */}
            <div className="relative mx-auto mb-5 md:mb-6 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-light ring-1 ring-emerald-primary/10 flex items-center justify-center shadow-sm">
              <Icon className="w-7 h-7 md:w-8 md:h-8 text-emerald-primary" />
            </div>

            {/* Status */}
            <h1 className="font-heading text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-b from-emerald-primary to-emerald-primary/50 bg-clip-text text-transparent mb-1 leading-none">
              {status}
            </h1>

            {/* Divider */}
            <div className="mx-auto my-4 md:my-5 w-14 md:w-16 h-0.5 rounded-full bg-gradient-to-r from-emerald-primary to-gold-accent" />

            {/* Title */}
            <h2 className="font-heading text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mb-1 px-2">
              {config.title}
            </h2>
            <p className="text-[11px] md:text-xs text-muted-foreground mb-3 md:mb-4 font-medium tracking-wider uppercase">
              {config.titleEn}
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-xs mx-auto px-2">
              {config.description}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 md:gap-3 px-2">
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
            <Button onClick={retry} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          )}
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    case 'signin-home':
      return (
        <>
          <Link to="/auth/login" className="inline-flex w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <LogIn className="h-4 w-4" />
              Masuk
            </Button>
          </Link>
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    default:
      return (
        <Link to="/" className="inline-flex w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <ArrowRight className="h-4 w-4" />
            Ke Beranda
          </Button>
        </Link>
      )
  }
}
