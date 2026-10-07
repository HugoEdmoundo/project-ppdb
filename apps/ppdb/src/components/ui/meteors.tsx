import { cn } from '@/lib/utils'

// pseudo-random deterministik dari index — `Math.random()` dilarang di render
// (react-hooks: components must be pure) dan akan membuat posisi meteor berubah
// tiap kali LandingPage re-render (mis. saat state `scrolled` berganti).
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const Meteors = ({
  number,
  className,
}: {
  number?: number
  className?: string
}) => {
  const meteorCount = number || 20
  const meteors = Array.from({ length: meteorCount }, (_, idx) => {
    // Sebar merata selebar 800px, dipusatkan di 0.
    const position = idx * (800 / meteorCount) - 400
    return {
      key: `meteor${idx}`,
      position,
      delay: pseudoRandom(idx + 1) * 5,
      duration: Math.floor(pseudoRandom(idx + 7) * 5 + 5),
    }
  })

  return (
    <div className="pointer-events-none animate-fade-in" aria-hidden="true">
      {meteors.map((meteor) => (
        <span
          key={meteor.key}
          className={cn(
            'absolute h-0.5 w-0.5 animate-meteor-effect rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] motion-reduce:hidden',
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
            className,
          )}
          style={{
            top: '-40px',
            left: `${meteor.position}px`,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
