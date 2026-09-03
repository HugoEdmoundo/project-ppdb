import { ErrorState } from "@repo/ui"

export default function NotFoundPage() {
  return <ErrorState status={404} />
}
