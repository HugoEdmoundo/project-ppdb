'use client'

import ErrorDisplay from './components/ui/ErrorDisplay'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const status = (error as Error & { status?: number })?.status || 500

  return <ErrorDisplay status={status} retry={reset} />
}
