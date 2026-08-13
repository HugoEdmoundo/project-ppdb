import { ErrorState } from '@/components/ui/ErrorState'

export default function ForbiddenPage() {
  return <ErrorState status={403} />
}
