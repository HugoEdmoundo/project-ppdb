'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/app/lib/utils'

export interface AccordionItemData {
  id: string
  title: string
  description?: string
  features?: string[]
  image?: string
}

interface InteractiveImageAccordionProps {
  items: AccordionItemData[]
  className?: string
  defaultActiveIndex?: number
}

export default function InteractiveImageAccordion({
  items,
  className,
  defaultActiveIndex,
}: InteractiveImageAccordionProps) {
  const [activeIndex, setActiveIndex] = useState(
    defaultActiveIndex ?? (items.length > 0 ? Math.floor(items.length / 2) : -1),
  )

  if (items.length === 0) return null

  const active = items[Math.min(Math.max(activeIndex, 0), items.length - 1)]

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-row items-stretch justify-center gap-3 sm:gap-4 overflow-x-auto pb-6 px-1 no-scrollbar">
        {items.map((item, index) => {
          const isActive = index === activeIndex
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={item.title}
              aria-pressed={isActive}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveIndex(index)
                }
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'relative h-[380px] sm:h-[430px] rounded-2xl overflow-hidden cursor-pointer flex-none bg-[var(--bg-secondary)]',
                'transition-all duration-700 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                isActive ? 'w-[240px] sm:w-[320px]' : 'w-[60px] sm:w-[70px]',
              )}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 240px, 320px"
                  className="pointer-events-none select-none object-cover"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
              )}
              <div className="absolute inset-0 bg-black/40" />

              <span
                className={cn(
                  'absolute text-white font-semibold whitespace-nowrap transition-all duration-300 ease-in-out',
                  'font-[var(--font-heading)] text-sm sm:text-lg',
                  isActive
                    ? 'bottom-5 left-1/2 -translate-x-1/2 rotate-0'
                    : 'bottom-24 left-1/2 -translate-x-1/2 rotate-90 origin-center',
                )}
              >
                {item.title}
              </span>
            </div>
          )
        })}
      </div>

      <div key={active.id} className="animate-fade-up-in mt-6 text-center max-w-3xl mx-auto px-2">
        <div className="verse-strip w-16 mx-auto mb-5" />
        <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text)]">
          {active.title}
        </h3>
        {active.description && (
          <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            {active.description}
          </p>
        )}
        {active.features && active.features.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {active.features.map((feature, i) => (
              <span
                key={i}
                className="text-[10px] sm:text-xs px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}