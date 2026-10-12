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
          d="M0,120H1200V16C1060,16 962,56 762,64C556,73 358,23 0,32Z"
          style={{ fill }}
        />
      </svg>
    </div>
  )
}
