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
        'relative flex items-center justify-center overflow-hidden px-4 py-8 md:py-12',
        fullscreen && 'min-h-dvh',
        className
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-slate-50">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0 / 0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Floating gradient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4A853]/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/20 to-[#D4A853]/20 rounded-full blur-3xl" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg animate-fadeIn">
        {/* Large animated status number */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#D4A853] blur-2xl opacity-30" />
          <h1 className="relative text-[120px] md:text-[160px] lg:text-[180px] font-black bg-gradient-to-br from-primary via-[#D4A853] to-primary bg-clip-text text-transparent leading-none tracking-tighter">
            {status}
          </h1>
        </div>

        {/* Icon with animation */}
        <div className="relative -mt-16 mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#D4A853] rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-primary to-[#D4A853] rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 transform hover:scale-110 transition-transform duration-300">
              <Icon className="w-12 h-12 md:w-14 md:h-14 text-white" />
            </div>
          </div>
        </div>

        {/* Title and subtitle */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            {config.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            {config.titleEn}
          </p>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 text-center max-w-md mx-auto">
          {config.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <ErrorActions actions={config.actions} retry={retry} />
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
            <Button onClick={retry} className={`${btnBase} inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 bg-gradient-to-r from-primary to-[#D4A853] text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0`}>
              <RefreshCw className="h-5 w-5" />
              Coba Lagi
            </Button>
          )}
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" className={`${btnBase} inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 border-2 border-slate-200 text-slate-700 bg-white hover:border-primary hover:text-primary hover:bg-primary/10 active:scale-[0.98]`}>
              <Home className="h-5 w-5" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    case 'signin-home':
      return (
        <>
          <Link to="/login" className="inline-flex w-full sm:w-auto">
            <Button className={`${btnBase} inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 bg-gradient-to-r from-primary to-[#D4A853] text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0`}>
              <LogIn className="h-5 w-5" />
              Masuk
            </Button>
          </Link>
          <Link to="/" className="inline-flex w-full sm:w-auto">
            <Button variant="outline" className={`${btnBase} inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 border-2 border-slate-200 text-slate-700 bg-white hover:border-primary hover:text-primary hover:bg-primary/10 active:scale-[0.98]`}>
              <Home className="h-5 w-5" />
              Ke Beranda
            </Button>
          </Link>
        </>
      )
    default:
      return (
        <Link to="/" className="inline-flex w-full sm:w-auto">
          <Button className={`${btnBase} inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 bg-gradient-to-r from-primary to-[#D4A853] text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0`}>
            <ArrowRight className="h-5 w-5" />
            Ke Beranda
          </Button>
        </Link>
      )
  }
}
