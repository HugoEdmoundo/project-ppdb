import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Globe2,
  Laptop,
  Loader2,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Tablet,
  Timer,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'
import type { ProfileSession } from './types'

// ── Formatting helpers ───────────────────────────────────────────────────────

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Sisa waktu token dalam format countdown live (mis. "29 hari 05:21:09" / "04:21:09"). */
export function formatSessionRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Kedaluwarsa'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function formatSessionDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Tick 1 detik untuk countdown sisa token. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function getDeviceIcon(session: ProfileSession) {
  const text = `${session.device} ${session.browser} ${session.os} ${session.user_agent}`.toLowerCase()
  if (text.includes('ipad') || text.includes('tablet')) return Tablet
  if (text.includes('iphone') || text.includes('android') || text.includes('mobile')) return Smartphone
  if (text.includes('mac') || text.includes('windows') || text.includes('linux') || text.includes('desktop')) return Laptop
  return MonitorSmartphone
}

function SessionInfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Clock
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block truncate">
          {label}
        </span>
        <span className={cn('text-xs font-medium text-foreground block truncate', valueClassName)}>
          {value}
        </span>
      </div>
    </div>
  )
}

export interface DeviceSessionsCardProps {
  sessions: ProfileSession[]
  loading?: boolean
  error?: string | null
  refreshing?: boolean
  onRefresh?: () => void
  onRevoke?: (id: string) => void | Promise<void>
  revokingId?: string | null
  title?: string
  description?: string
  className?: string
  /**
   * 'panel' = Mode sidebar kanan tanpa outer Card (default untuk ProfilePage 2-kolom)
   * 'card' = Mode kartu mandiri dengan Card container
   */
  variant?: 'panel' | 'card'
}

/**
 * Komponen Sesi Perangkat:
 * Menampilkan daftar sesi aktif di berbagai perangkat & aplikasi, IP address,
 * status sesi saat ini vs sesi lain, serta countdown sisa masa berlaku token.
 */
export function DeviceSessionsCard({
  sessions,
  loading = false,
  error = null,
  refreshing = false,
  onRefresh,
  onRevoke,
  revokingId = null,
  title = 'Sesi Perangkat',
  description = 'Perangkat dan browser yang saat ini aktif masuk ke akun Anda.',
  className,
  variant = 'panel',
}: DeviceSessionsCardProps) {
  const now = useNow()

  // Sesi yang tokennya habis otomatis hilang dari tampilan agar tidak menumpuk.
  const activeSessions = sessions.filter((session) => {
    if (!session.expires_at) return true
    const remainingMs = new Date(session.expires_at).getTime() - now
    return !Number.isFinite(remainingMs) || remainingMs > 0
  })

  const headerContent = (
    <div className="flex items-start justify-between gap-3 pb-3.5 mb-4 border-b border-border/70 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <MonitorSmartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-sm text-foreground truncate">{title}</h3>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 font-semibold text-primary bg-primary/10 border-primary/20 rounded-full"
            >
              {loading ? '…' : `${activeSessions.length} Aktif`}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{description}</p>
        </div>
      </div>

      {onRefresh && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="h-8 px-2.5 text-xs gap-1.5 shrink-0 rounded-lg hover:bg-muted/80"
          title="Muat ulang daftar sesi perangkat"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', (refreshing || loading) && 'animate-spin')} />
          <span className="hidden sm:inline">Muat Ulang</span>
        </Button>
      )}
    </div>
  )

  const bodyContent = (
    <div className="space-y-3">
      {loading && activeSessions.length === 0 ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border/70 bg-card space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted/70 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="h-2.5 w-16 bg-muted/60 rounded" />
                <div className="h-2.5 w-20 bg-muted/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <p className="text-xs font-semibold">Gagal memuat sesi perangkat</p>
          </div>
          <p className="text-xs text-rose-600/90 dark:text-rose-300/80 leading-relaxed">{error}</p>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-7 text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300"
            >
              <RefreshCw className="h-3 w-3" />
              Coba lagi
            </Button>
          )}
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center space-y-1.5">
          <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-foreground">Tidak Ada Sesi Aktif</p>
          <p className="text-[11px] text-muted-foreground">
            Tidak ada perangkat atau sesi lain yang sedang terhubung.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSessions.map((session) => {
            const isCurrent = session.is_current
            const DeviceIcon = getDeviceIcon(session)
            const remainingMs = session.expires_at
              ? new Date(session.expires_at).getTime() - now
              : Number.NaN
            const expired = Number.isFinite(remainingMs) && remainingMs <= 0

            return (
              <div
                key={session.id}
                className={cn(
                  'rounded-xl border p-3.5 transition-all text-left shadow-xs',
                  isCurrent
                    ? 'border-primary/50 bg-card'
                    : 'border-border/80 bg-card hover:border-border'
                )}
              >
                {/* Header Sesi */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <DeviceIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {session.device || 'Perangkat'}
                        </p>
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                            Perangkat Ini
                          </span>
                        ) : (
                          session.app_label && (
                            <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                              {session.app_label}
                            </span>
                          )
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {session.browser || 'Browser'} · {session.os || 'OS'}
                        {isCurrent ? ' · Sesi Aktif' : ''}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && onRevoke && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRevoke(session.id)}
                      disabled={revokingId === session.id}
                      className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 gap-1 rounded-lg shrink-0"
                      title="Keluarkan sesi ini"
                    >
                      {revokingId === session.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Proses…</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="h-3 w-3" />
                          <span>Keluarkan</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Detail Baris: IP, Terakhir Aktif, Sisa Token */}
                <div
                  className={cn(
                    'mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 text-xs border-t',
                    isCurrent ? 'border-primary/15' : 'border-border/60'
                  )}
                >
                  <SessionInfoItem
                    icon={Globe2}
                    label="Alamat IP"
                    value={session.ip_address || 'Tidak diketahui'}
                  />
                  <SessionInfoItem
                    icon={Clock}
                    label="Terakhir Aktif"
                    value={formatSessionDateTime(session.last_seen_at || session.created_at)}
                  />
                  <div className="sm:col-span-2 pt-0.5">
                    <SessionInfoItem
                      icon={Timer}
                      label="Masa Berlaku Token"
                      value={
                        expired
                          ? 'Kedaluwarsa'
                          : Number.isFinite(remainingMs)
                            ? formatSessionRemaining(remainingMs)
                            : '—'
                      }
                      valueClassName={
                        expired
                          ? 'text-rose-600 font-semibold'
                          : isCurrent
                            ? 'text-primary font-semibold font-mono text-[11px]'
                            : 'text-foreground font-mono text-[11px]'
                      }
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (variant === 'card') {
    return (
      <Card className={cn('border-border shadow-sm overflow-hidden bg-card', className)}>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {headerContent}
          {bodyContent}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('w-full flex flex-col', className)}>
      {headerContent}
      {bodyContent}
    </div>
  )
}
