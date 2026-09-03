import { usePermission } from '../contexts/AuthContext'

export type AccessLevel = 'dashboard' | 'read' | 'crud'

export function useCan(module: string, level: AccessLevel = 'crud') {
  const { hasModuleAccess, isSuperadmin, permissions } = usePermission()
  return {
    level: (permissions?.[module] || 'none') as string,
    canAccess: hasModuleAccess(module, level),
    canCrud: hasModuleAccess(module, 'crud'),
    canRead: hasModuleAccess(module, 'read'),
    isSuperadmin,
  }
}
