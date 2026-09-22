import { Copy } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Button } from '@/components/ui'

interface CredentialsCardProps {
  username: string
  password: string
  title?: string
}

export function CredentialsCard({ username, password, title = 'Akun Anda' }: CredentialsCardProps) {
  const { toast } = useToast()

  const copy = async (text: string, label: string) => {
    let ok: boolean
    let ta: HTMLTextAreaElement | null = null
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      try {
        ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ok = document.execCommand('copy')
      } catch {
        ok = false
      } finally {
        if (ta) document.body.removeChild(ta)
      }
    }
    toast(ok ? 'success' : 'error', ok ? `${label} disalin ke clipboard` : `Gagal menyalin ${label.toLowerCase()}`)
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900 p-6 rounded-2xl shadow-2xl border border-emerald-primary/30 text-left">
      {/* Decorative ticket cutouts */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r border-emerald-primary/30" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l border-emerald-primary/30" />
      
      {/* Dashed line */}
      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t border-dashed border-white/20" />

      <p className="text-xs font-bold uppercase tracking-widest text-gold-accent mb-4 text-center">{title}</p>

      <div className="relative space-y-4 z-10 pb-4">
        <div className="flex justify-between items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div>
            <p className="text-[11px] text-emerald-200/70 font-semibold uppercase tracking-wider mb-1">Username</p>
            <p className="font-mono font-bold text-lg text-white">{username}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" aria-label="Salin username" onClick={() => copy(username, 'Username')}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative space-y-4 z-10 pt-4">
        <div className="flex justify-between items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <div>
            <p className="text-[11px] text-emerald-200/70 font-semibold uppercase tracking-wider mb-1">Password</p>
            <p className="font-mono font-bold text-lg tracking-widest text-white">{password}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" aria-label="Salin password" onClick={() => copy(password, 'Password')}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mt-6 text-xs text-center text-emerald-100/60 font-medium">
        Simpan informasi kredensial ini. Anda akan membutuhkannya untuk masuk ke Dasbor Peserta.
      </p>
    </div>
  )
}
