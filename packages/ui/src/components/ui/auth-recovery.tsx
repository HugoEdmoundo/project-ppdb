import { AuthRecoveryForm } from "./auth-recovery-form"

type Props = { open: boolean; onClose: () => void; apiBase: string; applicant?: boolean | "mixed" }

/**
 * Modal pemulihan akun. Dipertahankan untuk kompatibilitas; halaman login kini
 * memakai panel geser di dalam `AuthCard` (prop `recoveryMode`) agar UX-nya
 * bukan modal lagi.
 */
export function AuthRecovery({ open, onClose, apiBase, applicant = false }: Props) {
  if (!open) return null

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-recovery-title">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
      <AuthRecoveryForm apiBase={apiBase} applicant={applicant} onClose={onClose} />
    </section>
  </div>
}
