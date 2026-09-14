import { Link } from 'react-router-dom'
import {
  AlertTriangle, SearchX, Lock, KeyRound, FileX,
  Gauge, Server, CloudOff, Clock, Home, RefreshCw, ArrowRight, LogIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui"

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
        'relative flex items-center justify-center px-4 py-12',
        fullscreen && 'min-h-dvh',
        className
      )}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-light/50 via-transparent to-gold-bg/50" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-primary to-gold-accent rounded-2xl blur-lg opacity-20 animate-pulse" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-primary to-gold-accent rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Status code */}
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-emerald-primary to-gold-accent bg-clip-text text-transparent mb-4">
            {status}
          </h1>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {config.title}
          </h2>
          <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase mb-6">
            {config.titleEn}
          </p>

          {/* Description */}
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            {config.description}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <ErrorActions actions={config.actions} retry={retry} />
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
            <Button onClick={retry} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-emerald-primary to-gold-accent text-white shadow-lg shadow-emerald-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          )}
          <Button asChild variant="outline" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 border-slate-200 text-slate-700 bg-white hover:border-emerald-primary hover:text-emerald-primary hover:bg-emerald-light/20 active:scale-[0.98]">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </Button>
        </>
      )
    case 'signin-home':
      return (
        <>
          <Button asChild className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-emerald-primary to-gold-accent text-white shadow-lg shadow-emerald-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
            <Link to="/auth/login">
              <LogIn className="h-4 w-4" />
              Masuk
            </Link>
          </Button>
          <Button asChild variant="outline" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 border-slate-200 text-slate-700 bg-white hover:border-emerald-primary hover:text-emerald-primary hover:bg-emerald-light/20 active:scale-[0.98]">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </Button>
        </>
      )
    default:
      return (
        <Button asChild className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-emerald-primary to-gold-accent text-white shadow-lg shadow-emerald-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
          <Link to="/">
            <ArrowRight className="h-4 w-4" />
            Ke Beranda
          </Link>
        </Button>
      )
  }
}
