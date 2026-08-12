import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function ForbiddenPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground/30">403</h1>
        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">Akses Ditolak</h2>
        <p className="mt-2 text-sm text-muted-foreground">Anda tidak memiliki izin.</p>
        <Link to="/" className="mt-6 inline-block"><Button>Kembali</Button></Link>
      </div>
    </div>
  )
}
