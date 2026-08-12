import { useState, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface ConfirmOptions { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => new Promise(resolve => setState({ ...opts, resolve })), [])
  const handleConfirm = () => { state?.resolve(true); setState(null) }
  const handleCancel = () => { state?.resolve(false); setState(null) }
  const handleClose = () => { state?.resolve(false); setState(null) }
  const dialog = state ? (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl animate-scale-in">
        <button onClick={handleClose} className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-5 flex flex-col items-center text-center">
          <div className={cn('mb-3 flex h-12 w-12 items-center justify-center rounded-full', state.danger ? 'bg-rose-light' : 'bg-amber-50')}>
            <AlertTriangle className={cn('h-6 w-6', state.danger ? 'text-rose-danger' : 'text-amber-500')} />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground mb-1">{state.title || 'Konfirmasi'}</h3>
          <p className="text-sm text-muted-foreground">{state.message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>{state.cancelLabel || 'Batal'}</Button>
          <Button
            variant={state.danger ? 'danger' : 'default'}
            className="flex-1"
            onClick={handleConfirm}
          >
            {state.confirmLabel || 'Ya'}
          </Button>
        </div>
      </div>
    </div>
  ) : null
  return { confirm, dialog }
}
