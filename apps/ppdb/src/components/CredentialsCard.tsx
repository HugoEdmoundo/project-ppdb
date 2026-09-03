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

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast('success', `${label} disalin ke clipboard`)
  }

  return (
    <div className="bg-muted/70 p-4 rounded-xl space-y-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>

      <div className="flex justify-between items-center bg-background border rounded-lg p-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Username</p>
          <p className="font-mono font-bold text-base">{username}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Salin username" onClick={() => copy(username, 'Username')}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-between items-center bg-background border rounded-lg p-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Password</p>
          <p className="font-mono font-bold text-base tracking-wider">{password}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Salin password" onClick={() => copy(password, 'Password')}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-amber-600 font-medium text-center bg-amber-50 p-2 rounded">
        Simpan informasi ini dengan baik. Anda akan membutuhkannya untuk masuk ke sistem.
      </p>
    </div>
  )
}
