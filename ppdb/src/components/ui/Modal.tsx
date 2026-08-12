import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog'

const sizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
  description?: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md', className, description }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('max-h-[90vh] flex flex-col overflow-hidden gap-0 p-0', sizes[size], className)}
      >
        {(title || description) && (
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-secondary/30 text-left">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="overflow-y-auto flex-1 min-h-0 p-6">{children}</div>
        {footer && (
          <DialogFooter className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30 shrink-0 sm:justify-end sm:space-x-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
