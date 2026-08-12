import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const navBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={navBtn}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              p === page
                ? cn(buttonVariants({ variant: 'default', size: 'icon' }), 'h-9 w-9 rounded-lg text-sm')
                : 'h-9 w-9 rounded-lg text-sm font-medium text-foreground hover:bg-accent/20 transition-colors'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={navBtn}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
