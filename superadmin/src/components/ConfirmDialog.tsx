import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmOptions & { resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, resolve })
    })
  }, [])

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  const dialog = state ? (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleCancel()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <div
            className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full ${
              state.danger ? 'bg-destructive/10' : 'bg-warning/10'
            }`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${state.danger ? 'text-destructive' : 'text-warning'}`}
            />
          </div>
          <DialogTitle>{state.title || 'Konfirmasi'}</DialogTitle>
          <DialogDescription>{state.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            {state.cancelLabel || 'Batal'}
          </Button>
          <Button
            variant={state.danger ? 'destructive' : 'default'}
            onClick={handleConfirm}
            className="flex-1"
          >
            {state.confirmLabel || 'Ya, lanjutkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null

  return { confirm, dialog }
}
