import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

let nextId = 0

const icons = {
  success: <CheckCircle className="h-5 w-5 shrink-0 text-emerald-bright" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-rose-danger" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-500" />,
}

const borders = {
  success: 'border-l-emerald-bright',
  error: 'border-l-rose-danger',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  function remove(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2.5 px-4 pointer-events-none sm:px-0">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border border-border border-l-4 bg-card/95 p-4 shadow-glass backdrop-blur-md animate-slide-down',
              borders[t.type]
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.type]}</span>
            <p className="flex-1 text-sm font-semibold text-foreground leading-relaxed">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
