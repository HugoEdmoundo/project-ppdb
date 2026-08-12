'use client'

import Link from 'next/link'
import './globals.css'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body className="min-h-dvh flex items-center justify-center bg-[var(--bg)] relative overflow-hidden px-4 py-8 md:py-12">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-subtle)] via-transparent to-[var(--color-gold-subtle)] opacity-60" />

        {/* Decorative orbs — smaller on mobile */}
        <div className="absolute -top-24 -right-24 md:-top-32 md:-right-32 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-[var(--accent-subtle)] opacity-20 md:opacity-30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 md:-bottom-40 md:-left-40 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full bg-[var(--color-gold-subtle)] opacity-20 md:opacity-25 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-[var(--accent)]/5 blur-3xl" />

        {/* Main card */}
        <div className="relative z-10 w-full max-w-sm sm:max-w-md">
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-[var(--accent-gold)]/5 rounded-2xl md:rounded-3xl blur-xl" />

            {/* Glass card */}
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-8 sm:p-10 md:p-14 text-center">
              {/* Gradient borders */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-gold)]/20 to-transparent" />

              {/* Logo */}
              <div className="relative mx-auto mb-5 md:mb-6 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>

              {/* Title */}
              <h1 className="font-[var(--font-display)] text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/60 bg-clip-text text-transparent mb-1 leading-none">
                Oops!
              </h1>

              <div className="mx-auto my-4 md:my-5 w-14 md:w-16 h-0.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-gold)]" />

              <h2 className="font-[var(--font-display)] text-xl md:text-2xl lg:text-3xl font-semibold text-[var(--text)] mb-1 px-2">
                Terjadi Kesalahan Kritis
              </h2>
              <p className="text-[11px] md:text-xs text-[var(--text-muted)] mb-3 md:mb-4 font-medium tracking-wider uppercase">
                Critical Error
              </p>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-3 md:mb-4 max-w-xs mx-auto px-2">
                Maaf, terjadi kesalahan kritis yang tidak terduga. Tim teknis kami telah diberitahu dan akan segera memperbaikinya.
              </p>

              {error.digest && (
                <p className="text-[11px] md:text-xs text-[var(--text-muted)] font-mono mb-6 md:mb-8 bg-[var(--accent-subtle)] rounded-lg px-2.5 md:px-3 py-1.5 inline-block">
                  Error ID: {error.digest}
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 md:gap-3 px-2">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Muat Ulang
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  Ke Beranda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
