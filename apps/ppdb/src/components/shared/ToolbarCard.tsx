import type { ReactNode } from 'react'
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Card } from "@/components/ui"
import { Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarCardProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  searchPlaceholder?: string
  onRefresh?: () => void
  refreshing?: boolean
  searchActions?: ReactNode
  children?: ReactNode
}

export default function ToolbarCard({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Cari nama atau email...',
  onRefresh,
  refreshing,
  searchActions,
  children,
}: ToolbarCardProps) {
  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <form onSubmit={onSearchSubmit} className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                className="h-10 rounded-full border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs sm:text-sm transition-all focus:bg-white"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-10 shrink-0 rounded-full px-4 sm:px-5 font-semibold text-xs sm:text-sm shadow-md shadow-emerald-primary/20">
              Cari
            </Button>
            {searchActions}
            {onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full text-slate-500 hover:bg-emerald-primary/10 hover:text-primary sm:hidden"
                onClick={onRefresh}
                disabled={refreshing}
                title="Muat ulang"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            )}
          </form>
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex h-10 w-10 shrink-0 rounded-full text-slate-500 hover:bg-emerald-primary/10 hover:text-primary"
              onClick={onRefresh}
              disabled={refreshing}
              title="Muat ulang"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          )}
        </div>
        {children && <div className="overflow-x-auto no-scrollbar border-t border-slate-100 pt-3">{children}</div>}
      </div>
    </Card>
  )
}
