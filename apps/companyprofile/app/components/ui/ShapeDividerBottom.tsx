'use client'

export default function ShapeDividerBottom({ fill = "var(--bg)" }: { fill?: string }) {
  return (
    <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0] z-0 rotate-180">
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className="relative block w-[calc(100%+1.3px)] h-[78px]"
      >
        <path
          d="M1200,0H0V120H281.94C572.9,116.24,602.45,3.86,602.45,3.86h0S632,116.24,923,120h277Z"
          style={{ fill }}
        />
      </svg>
    </div>
  )
}
