import { createContext, useContext, type ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'
import { Toaster } from '@/components/ui'

type ToastType = 'success' | 'error' | 'warning'

interface ToastContextType {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider
      value={{
        toast: (type, message) => {
          if (type === 'success') sonnerToast.success(message)
          else if (type === 'error') sonnerToast.error(message)
          else sonnerToast.warning(message)
        },
      }}
    >
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
