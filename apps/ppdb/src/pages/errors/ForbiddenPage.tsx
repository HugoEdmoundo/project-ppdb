import { ErrorState } from "@repo/ui"

export default function ForbiddenPage() {
  return <ErrorState status={403} />
}
