import { useState, useEffect } from 'react'
import { settingsService } from '@/services'

/**
 * PageLoader — Full-screen branded loading screen used during auth check (ProtectedRoute).
 *
 * Logo WAJIB diambil secara dinamis dari API via `settingsService.getAll()`
 * (endpoint: GET /companyprofile/settings).
 * DILARANG menggunakan aset logo statis — tidak ada static logo asset di project ini.
 * Konsisten dengan cara favicon diambil di App.tsx.
 *
 * Design: Centered logo with dual orbital arcs + staggered dot indicator.
 * Animations: pure CSS keyframes (shimmer, logo-pulse, ring-spin) defined in index.css.
 * The spinning arcs use inline SVG with strokeDasharray for the arc-gap effect.
 */
export function PageLoader() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    settingsService.getAll()
      .then(settings => {
        const logo = settings.find((s: any) => s.key === 'logo')?.value
        const favicon = settings.find((s: any) => s.key === 'favicon')?.value
        if (logo) {
          setLogoUrl(logo)
        } else if (favicon) {
          setLogoUrl(favicon)
        }
      })
      .catch(() => { /* silently fallback to text mark */ })
  }, [])

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-background"
      role="status"
      aria-label="Memuat halaman"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-accent/8 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 z-10">
        {/* Logo + spinning ring container */}
        <div className="relative flex items-center justify-center">
          {/* Outer spinning arc (emerald) */}
          <svg
            className="animate-ring-spin absolute"
            width="88"
            height="88"
            viewBox="0 0 88 88"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="60 192"
              opacity="0.7"
            />
          </svg>

          {/* Inner slower arc (gold), counter-rotating */}
          <svg
            className="absolute"
            style={{ animation: 'ring-spin 2.4s linear infinite reverse' }}
            width="70"
            height="70"
            viewBox="0 0 70 70"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="35"
              cy="35"
              r="31"
              stroke="hsl(var(--accent))"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="30 164"
              opacity="0.5"
            />
          </svg>

          {/* Logo mark — dynamically fetched from API */}
          <div className="animate-logo-pulse h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Ar-Rahman"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              /* Fallback text mark saat logo belum di-fetch atau tidak tersedia */
              <span className="text-white font-heading font-bold text-2xl leading-none select-none">
                ار
              </span>
            )}
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center space-y-1">
          <p className="font-heading font-semibold text-sm text-foreground tracking-wide">
            Ar-Rahman PPDB
          </p>
          <p className="text-xs text-muted-foreground tracking-wider">Memuat…</p>
        </div>

        {/* Staggered dot indicator */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-primary/40"
              style={{
                animation: `logo-pulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
