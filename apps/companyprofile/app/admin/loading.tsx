export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700"
          aria-hidden="true"
        />
        <span className="text-sm text-slate-600">Memuat halaman...</span>
      </div>
    </div>
  )
}
