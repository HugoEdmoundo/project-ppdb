import type { ReactNode } from 'react'
import { Tabs, TabsList } from "@/components/ui"
import { Card } from "@/components/ui"
import { cn } from '@/lib/utils'

interface TabsBarCardProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

export default function TabsBarCard({ value, defaultValue, onValueChange, children, className }: TabsBarCardProps) {
  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
      <div className="px-3.5 py-3 sm:px-5 sm:py-4 overflow-x-auto no-scrollbar">
        <Tabs value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
          <TabsList className={cn('inline-flex h-10 w-auto min-w-full sm:min-w-0 sm:max-w-lg rounded-full bg-slate-100/80 p-1 whitespace-nowrap', className)}>
            {children}
          </TabsList>
        </Tabs>
      </div>
    </Card>
  )
}
