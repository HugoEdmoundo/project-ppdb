import { Button } from '@/components/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 sm:px-4 py-3 border-t">
      <span className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        Halaman <span className="font-semibold text-foreground">{page}</span> dari <span className="font-semibold text-foreground">{totalPages}</span>
      </span>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none h-9 px-3 text-xs sm:text-sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1 shrink-0" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none h-9 px-3 text-xs sm:text-sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1 shrink-0" />
        </Button>
      </div>
    </div>
  )
}
