/**
 * Base URL situs publik (company profile), untuk action "Lihat Situs" di
 * dashboard.
 *
 * `configured` sengaja dibiarkan sebagai parameter, bukan dibaca dari
 * `import.meta.env` di dalam paket ini: `packages/ui` dikonsumsi Next.js
 * (companyprofile) DAN Vite (ppdb, superadmin), sedangkan cara akses env-nya
 * berbeda — `process.env.NEXT_PUBLIC_*` vs `import.meta.env.VITE_*`. Membaca
 * env di sini membuat typecheck Next gagal karena `ImportMeta.env` tidak ada
 * di sana. Jadi tiap aplikasi membaca env-nya sendiri lalu meneruskannya.
 *
 * Logika sebelumnya hanya ada di `apps/ppdb/src/components/layout/Footer.tsx`;
 * dipindah ke sini karena semua panel dashboard memakai DashboardShell yang sama.
 */
export function resolveCompanyProfileUrl(configured?: string): string {
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (hostname.includes('ptdarrahman.sch.id')) return 'https://ptdarrahman.sch.id'
    return `${protocol}//${hostname}:3000`
  }

  return 'http://localhost:3000'
}