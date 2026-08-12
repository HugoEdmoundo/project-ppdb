import type { ReactNode } from 'react'
import { useCan, type AccessLevel } from '../hooks/useCan'

export function Can({ module, level = 'crud', children }: { module: string; level?: AccessLevel; children: ReactNode }) {
  const { canAccess } = useCan(module, level)
  return <>{canAccess ? children : null}</>
}
