export function PageLoader({ logoUrl }: { logoUrl?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite">
      {logoUrl ? <img src={logoUrl} alt="" className="h-14 max-w-40 object-contain" /> : null}
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-600/20 border-t-emerald-600" aria-hidden="true" />
      <span className="text-sm text-muted-foreground">Memuat...</span>
    </div>
  )
}
