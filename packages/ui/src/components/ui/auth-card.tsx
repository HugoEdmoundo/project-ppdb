import { useState, type FormEvent, type ReactNode } from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"

export interface AuthCardProps {
  title: string
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
  title, logoUrl, loading = false, success = false, error, successName,
  onSubmit, submitText = "Masuk", forgotText, onForgotClick, badgeText, badgeIcon,
}: AuthCardProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit(username.trim(), password)
  }

  return (
    <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        {logoUrl ? <img src={logoUrl} alt="Logo" className="mb-4 h-16 max-w-48 object-contain" /> : null}
        {badgeText ? <span className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">{badgeIcon}{badgeText}</span> : null}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {success ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          <p className="font-semibold">Login berhasil</p>
          {successName ? <p className="mt-1">Selamat datang, {successName}.</p> : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="auth-username">Username</Label>
            <Input id="auth-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Memproses..." : submitText}</Button>
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
