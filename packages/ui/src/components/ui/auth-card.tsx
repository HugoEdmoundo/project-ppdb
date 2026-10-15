import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react"
import { Button } from "./button"
import { Label } from "./label"
import { AuthRecoveryForm } from "./auth-recovery-form"
import { cn } from "../../lib/utils"

const GOLD = "var(--color-gold-accent, #D4A853)"
const GOLD_FAINT = "color-mix(in srgb, var(--color-gold-accent, #D4A853) 55%, transparent)"
const EMERALD = "var(--color-emerald-primary, #1A6B47)"

// Font judul dipaksa lewat inline style agar identik di ketiga app — beberapa app
// men-override h1 dengan font display (serif) di stylesheet globalnya.
const HEADING_FONT = "var(--font-heading, 'DM Sans'), system-ui, sans-serif"

const inputBaseClass =
  "flex h-11 w-full rounded-lg border border-input bg-background py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export interface AuthCardProps {
  title: string
  subtitle?: string
  logoUrl?: string
  loading?: boolean
  success?: boolean
  error?: string
  successName?: string
  onSubmit: (username: string, password: string) => void | Promise<void>
  submitText?: string
  forgotText?: string
  onForgotClick?: () => void
  badgeText?: string
  badgeIcon?: ReactNode
  /**
   * Jika diisi, tautan lupa password akan menggeser (slide) kartu ke panel
   * pemulihan akun di dalam kartu yang sama — bukan membuka modal.
   */
  recoveryMode?: "applicant" | "staff" | "mixed"
  /** Base URL API untuk panel pemulihan (mis. `API_BASE`). */
  recoveryApiBase?: string
}

export function AuthCard({
  title, subtitle, logoUrl, loading = false, success = false, error, successName,
  onSubmit, submitText = "Masuk", forgotText, onForgotClick, badgeText, badgeIcon,
  recoveryMode, recoveryApiBase = "",
}: AuthCardProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const logoRef = useRef<HTMLImageElement | null>(null)

  // Tinggi kartu murni content-driven: elemen logo baru masuk ke alur layout
  // setelah gambar asli benar-benar selesai dimuat. Selama logo belum tampil
  // (belum tersedia / masih dimuat / gagal) tidak ada ruang yang disisihkan,
  // placeholder, skeleton, maupun gambar pengganti.
  useEffect(() => {
    setLogoLoaded(false)
    const img = logoRef.current
    // Gambar dari cache bisa terlewat event onLoad — cek langsung statusnya.
    if (img?.complete && img.naturalWidth > 0) setLogoLoaded(true)
  }, [logoUrl])

  const canRecover = Boolean(recoveryMode)
  const recovering = canRecover && showRecovery
  const recoveryApplicant: boolean | "mixed" =
    recoveryMode === "applicant" ? true : recoveryMode === "mixed" ? "mixed" : false

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit(username.trim(), password)
  }

  function handleForgot() {
    if (onForgotClick) { onForgotClick(); return }
    if (canRecover) setShowRecovery(true)
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card px-7 py-9 shadow-xl sm:px-8 sm:py-10">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${EMERALD}, ${GOLD})` }}
      />
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex transition-transform duration-300 ease-out",
            canRecover ? "w-[200%]" : "w-full",
          )}
          style={canRecover ? { transform: recovering ? "translateX(-50%)" : "translateX(0)" } : undefined}
        >
          {/* ── Panel: Login ── */}
          <div
            className={cn("shrink-0", canRecover ? "w-1/2" : "w-full")}
            aria-hidden={recovering}
            inert={recovering ? true : undefined}
          >
            <div className="mb-6 flex flex-col items-center text-center">
              {logoUrl ? (
                <img
                  ref={logoRef}
                  src={logoUrl}
                  alt="Logo"
                  onLoad={() => setLogoLoaded(true)}
                  className={cn("mb-4 h-16 max-w-48 object-contain", !logoLoaded && "hidden")}
                />
              ) : null}
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: HEADING_FONT }}>{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: HEADING_FONT }}>{subtitle}</p> : null}
              {badgeText ? (
                <div className="mt-4 flex w-full items-center gap-3">
                  <span className="h-px flex-1" style={{ backgroundColor: GOLD_FAINT }} />
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    {badgeIcon ?? <ShieldCheck className="h-3.5 w-3.5" />}
                    {badgeText}
                  </span>
                  <span className="h-px flex-1" style={{ backgroundColor: GOLD_FAINT }} />
                </div>
              ) : null}
            </div>
            {success ? (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
                <p className="font-semibold">Login berhasil</p>
                {successName ? <p className="mt-1">Selamat datang, {successName}.</p> : null}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-username">Email / Username</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="auth-username"
                      autoComplete="username"
                      required
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className={cn(inputBaseClass, "rounded-[10px] pl-10 pr-3")}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Masukkan kata sandi"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={cn(inputBaseClass, "rounded-[10px] pl-10 pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full rounded-[10px]" loading={loading} disabled={loading}>{loading ? "Memproses…" : submitText}</Button>
                {forgotText ? (
                  (onForgotClick || canRecover)
                    ? <button type="button" onClick={handleForgot} className="w-full text-center text-sm text-muted-foreground hover:underline">{forgotText}</button>
                    : <p className="text-center text-sm text-muted-foreground">{forgotText}</p>
                ) : null}
              </form>
            )}
          </div>

          {/* ── Panel: Pemulihan akun (geser) ──
              Saat tidak aktif, panel ini dikeluarkan dari perhitungan tinggi kartu
              (grid-template-rows 0fr pada satu baris grid) supaya tinggi kartu
              mengikuti panel yang benar-benar terlihat. Tanpa ini, panel pemulihan
              yang lebih tinggi memaksa baris flex (dan kartu) ikut meninggi sehingga
              menyisakan ruang kosong di bawah panel login selama logo belum tampil.
              Panel tetap ter-render (bukan display:none) agar animasi geser tetap ada. */}
          {canRecover ? (
            <div
              className="grid w-1/2 shrink-0 transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: recovering ? "1fr" : "0fr" }}
              aria-hidden={!recovering}
              inert={!recovering ? true : undefined}
            >
              <div className="min-h-0 overflow-hidden">
                <AuthRecoveryForm
                  apiBase={recoveryApiBase}
                  applicant={recoveryApplicant}
                  onClose={() => setShowRecovery(false)}
                  closeText="Kembali ke login"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
