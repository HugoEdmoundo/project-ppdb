'use client'

import { useRef } from 'react'
import { useTiltEffect } from '../../hooks/useTiltEffect'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glare?: boolean
  maxTilt?: number
  scale?: number
  onClick?: () => void
}

export default function TiltCard({ children, className = '', glare = true, maxTilt, scale, onClick }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  useTiltEffect(ref, { glare, maxTilt, scale })
  return (
    <div ref={ref} className={className} onClick={onClick}>
      {children}
    </div>
  )
}
