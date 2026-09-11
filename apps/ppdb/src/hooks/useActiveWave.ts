import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'

export interface ActiveWave {
  id: string
  name: string
  allowed_paths: string[] | null
  allowed_levels: string[] | null
  active: boolean
}

export function useActiveWave() {
  const query = useQuery<ActiveWave>({
    queryKey: ['active-wave-public'],
    queryFn: () => apiFetch<ActiveWave>('/ppdb/waves/active-public'),
    staleTime: 60_000
  })

  return {
    ...query,
    isActive: !!query.data?.active,
    allowedPaths: query.data?.allowed_paths || null,
    allowedLevels: query.data?.allowed_levels || null,
  }
}