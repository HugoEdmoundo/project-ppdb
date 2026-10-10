import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'

import GlobeLogo from './globe'

afterEach(cleanup)

/**
 * Mark brand Ar-Rahman. Huruf latin "A" pernah dipakai sebagai fallback di sini
 * dan itu anomali: `useBrand` mengosongkan `logoUrl`/`faviconUrl` di state awal,
 * jadi huruf itu muncul sebagai flash di setiap load dan menetap selamanya kalau
 * endpoint settings kosong. Fallback sekarang harus `ار`, sama dengan yang
 * dipakai di Footer, navbar, dan watermark CTA.
 */
const BRAND_MARK = 'ار'

describe('GlobeLogo — fallback mark', () => {
  it('menampilkan mark brand saat markUrl kosong', () => {
    const { container } = render(<GlobeLogo />)
    expect(container.textContent).toContain(BRAND_MARK)
  })

  it('tidak pernah menampilkan huruf latin sebagai fallback', () => {
    const { container } = render(<GlobeLogo />)

    // Cari elemen yang teksnya persis "A" — glogalalu tidak boleh punya
    // placeholder latin dalam bentuk apa pun.
    const latinA = [...container.querySelectorAll('*')].filter(
      (el) => el.textContent?.trim() === 'A',
    )
    expect(latinA).toHaveLength(0)
  })

  it('menampilkan gambar begitu markUrl tersedia', () => {
    const { container, queryByText } = render(<GlobeLogo markUrl="https://cdn.test/logo.png" />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/logo.png')
    expect(queryByText(BRAND_MARK)).toBeNull()
  })

  it('jatuh ke mark brand saat gambar gagal dimuat', () => {
    const { container, queryByText } = render(<GlobeLogo markUrl="https://cdn.test/hilang.png" />)

    expect(container.querySelector('img')).toBeTruthy()
    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(queryByText(BRAND_MARK)).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('mencoba ulang saat markUrl berubah lewat SSE', () => {
    const { container, rerender, queryByText } = render(
      <GlobeLogo markUrl="https://cdn.test/a.png" />,
    )

    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    expect(queryByText(BRAND_MARK)).toBeTruthy()

    // Brand berubah -> gambar baru harus dicoba lagi, bukan langsung fallback.
    rerender(<GlobeLogo markUrl="https://cdn.test/b.png" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/b.png')
    expect(queryByText(BRAND_MARK)).toBeNull()
  })

  it('menyembunyikan wordmark yang gagal dimuat, bukan menampilkan ikon rusak', () => {
    const { container, queryByText } = render(<GlobeLogo wordmarkUrl="https://cdn.test/w.png" />)
    const wordmark = container.querySelectorAll('img')[0]

    expect(wordmark).toBeTruthy()
    fireEvent.error(wordmark as HTMLImageElement)

    expect(queryByText(BRAND_MARK)).toBeTruthy()
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('dekoratif sepenuhnya — disembunyikan dari accessibility tree', () => {
    const { container } = render(<GlobeLogo />)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })
})