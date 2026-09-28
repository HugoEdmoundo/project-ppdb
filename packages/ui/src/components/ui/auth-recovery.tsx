import { useState, type FormEvent } from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"

type Props = { open: boolean; onClose: () => void; apiBase: string; applicant?: boolean | "mixed" }

export function AuthRecovery({ open, onClose, apiBase, applicant = false }: Props) {
  const [identifier, setIdentifier] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [finished, setFinished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [accountType, setAccountType] = useState<"applicant" | "staff">(applicant === true ? "applicant" : "staff")
  if (!open) return null
  const isApplicant = applicant === true || (applicant === "mixed" && accountType === "applicant")

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("")
    try {
      const endpoint = isApplicant ? "/auth/recover-applicant" : sent ? "/auth/recovery/verify" : "/auth/recovery/request"
      const payload = isApplicant ? { nik: identifier, birth_date: birthDate } : sent ? { identifier, code } : { identifier }
      const response = await fetch(`${apiBase}${endpoint}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.detail || "Permintaan belum dapat diproses.")
      if (!isApplicant && !sent) { setSent(true); setMessage("Jika akun cocok, kode verifikasi dikirim ke WhatsApp terdaftar.") }
      else { setMessage(body.message || "Jika data cocok, kredensial akan dikirim ke WhatsApp terdaftar."); setFinished(true) }
    } catch (e) { setError(e instanceof Error ? e.message : "Permintaan gagal.") }
    finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-recovery-title">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
      <h2 id="auth-recovery-title" className="font-heading text-xl font-semibold">Pulihkan akun</h2>
      <p className="mt-2 text-sm text-muted-foreground">{isApplicant ? "Masukkan NIK dan tanggal lahir pendaftar." : "Masukkan username atau email. Kode verifikasi dikirim ke WhatsApp yang terdaftar."}</p>
      {isApplicant && <p className="mt-1 text-xs text-muted-foreground">Jika data tidak cocok, silakan hubungi admin PPDB untuk bantuan.</p>}
      <form onSubmit={submit} className="mt-5 space-y-4">
        {applicant === "mixed" && !sent && <div className="flex gap-4 text-sm"><label><input type="radio" checked={accountType === "applicant"} onChange={() => { setAccountType("applicant"); setIdentifier(""); setMessage("") }} /> Pendaftar</label><label><input type="radio" checked={accountType === "staff"} onChange={() => { setAccountType("staff"); setIdentifier(""); setMessage("") }} /> Admin</label></div>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!finished ? <>
          <div className="space-y-2"><Label>{isApplicant ? "NIK Pendaftar" : "Username atau email"}</Label><Input className="rounded-[10px]" required inputMode={isApplicant ? "numeric" : "text"} minLength={isApplicant ? 16 : undefined} maxLength={isApplicant ? 16 : 255} value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" /></div>
          {isApplicant && <div className="space-y-2"><Label>Tanggal lahir</Label><Input className="rounded-[10px]" type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} /></div>}
          {sent && !isApplicant && <div className="space-y-2"><Label>Kode verifikasi</Label><Input className="rounded-[10px]" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" /></div>}
          <Button className="w-full rounded-[10px]" disabled={busy}>{busy ? "Memproses…" : isApplicant ? "Pulihkan akun" : sent ? "Verifikasi dan kirim kredensial" : "Kirim kode WhatsApp"}</Button>
        </> : null}
      </form>
      <button type="button" className="mt-4 w-full text-center text-sm text-muted-foreground hover:underline" onClick={() => { onClose(); setIdentifier(""); setCode(""); setBirthDate(""); setSent(false); setFinished(false); setMessage(""); setError("") }}>Tutup</button>
    </section>
  </div>
}
