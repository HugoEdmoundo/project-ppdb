import { cn } from "../../lib/utils"

export interface BrandMarkProps {
  logoUrl?: string
  faviconUrl?: string
  name?: string
  mark?: React.ReactNode
  size?: "sm" | "md"
  className?: string
}

export function BrandMark({ logoUrl, faviconUrl, name = "Brand", mark, size = "md", className }: BrandMarkProps) {
  const iconSrc = faviconUrl || logoUrl
  const box = size === "sm" ? "h-8 w-8 text-lg" : "h-9 w-9 text-lg"
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={name}
        className={cn(size === "sm" ? "h-8 w-8" : "h-9 w-9", "object-contain shrink-0 drop-shadow-sm", className)}
      />
    )
  }
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-br from-primary to-[#145337] text-white flex items-center justify-center font-bold shrink-0 select-none shadow-sm",
        box,
        className
      )}
    >
      {mark ?? "ار"}
    </div>
  )
}
