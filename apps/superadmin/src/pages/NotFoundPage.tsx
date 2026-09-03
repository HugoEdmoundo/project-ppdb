import { ErrorState } from "../components/ui/errorstate"

export default function NotFoundPage() {
  return <ErrorState status={404} />
}
