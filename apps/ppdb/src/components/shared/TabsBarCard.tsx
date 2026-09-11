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
      <div className="px-5 py-4">
        <Tabs value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
          <TabsList className={cn('inline-flex h-10 w-full max-w-lg rounded-full bg-slate-100/80 p-1', className)}>
            {children}
          </TabsList>
        </Tabs>
      </div>
    </Card>
  )
}