import { Waves } from 'lucide-react'

export default function NoActiveWaveBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Waves className="h-5 w-5 shrink-0 text-amber-500" />
      <span>{message}</span>
    </div>
  )
}
