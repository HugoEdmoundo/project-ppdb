import { ErrorState } from "@/components/ui"

export default function ForbiddenPage() {
  return <ErrorState status={403} />
}
