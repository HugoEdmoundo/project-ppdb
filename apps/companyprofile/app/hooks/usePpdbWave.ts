'use client'

import { useEffect, useState } from 'react'

import { fetchActivePpdbWave, type ActivePpdbWave } from '@/app/lib/ppdb'

/**
 * Gelombang PPDB aktif untuk halaman yang hanya bisa dirender di client
 * (mis. `/ppdb` yang me-mount hero 3D dengan `ssr: false`).
 *
 * Halaman yang merupakan server component sebaiknya memanggil
 * `fetchActivePpdbWave()` langsung agar tidak ada fetch susulan di browser.
 */
export function useActivePpdbWave(): ActivePpdbWave | null {
  const [wave, setWave] = useState<ActivePpdbWave | null>(null)

  useEffect(() => {
    let alive = true
    fetchActivePpdbWave().then((data) => {
      if (alive) setWave(data)
    })
    return () => {
      alive = false
    }
  }, [])

  return wave
}
