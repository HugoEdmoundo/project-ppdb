import { ErrorState } from '../components/ui/ErrorState'

export default function NotFoundPage() {
  return <ErrorState status={404} />
}
