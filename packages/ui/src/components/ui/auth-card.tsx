import { useState, type FormEvent, type ReactNode } from "react"
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react"
import { Button } from "./button"
import { Label } from "./label"
import { cn } from "../../lib/utils"

const GOLD = "#D4A853"

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
}

export function AuthCard({
  title, subtitle, logoUrl, loading = false, success = false, error, successName,
  onSubmit, submitText = "Masuk", forgotText, onForgotClick, badgeText, badgeIcon,
}: AuthCardProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit(username.trim(), password)
  }

  return (
    <section className="relative z-10 mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, var(--color-emerald-primary, #146C43), ${GOLD})` }}
      />
      <div className="mb-6 flex flex-col items-center text-center">
        {logoUrl ? <img src={logoUrl} alt="Logo" className="mb-4 h-16 max-w-48 object-contain" /> : null}
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: HEADING_FONT }}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: HEADING_FONT }}>{subtitle}</p> : null}
        {badgeText ? (
          <div className="mt-4 flex w-full items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: `${GOLD}55` }} />
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              {badgeIcon ?? <ShieldCheck className="h-3.5 w-3.5" />}
              {badgeText}
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: `${GOLD}55` }} />
          </div>
        ) : null}
      </div>
      {success ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          <p className="font-semibold">Login berhasil</p>
          {successName ? <p className="mt-1">Selamat datang, {successName}.</p> : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <Button type="submit" className="h-11 w-full rounded-[10px]" disabled={loading}>{loading ? "Memproses..." : submitText}</Button>
          {forgotText ? (
            onForgotClick
              ? <button type="button" onClick={onForgotClick} className="w-full text-center text-sm text-muted-foreground hover:underline">{forgotText}</button>
              : <p className="text-center text-sm text-muted-foreground">{forgotText}</p>
          ) : null}
        </form>
      )}
    </section>
  )
}
