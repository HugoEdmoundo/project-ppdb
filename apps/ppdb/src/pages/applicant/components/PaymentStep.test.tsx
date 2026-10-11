import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PaymentStep from './PaymentStep'

const toast = vi.fn()
vi.mock('@/components/Toast', () => ({ useToast: () => ({ toast }) }))

const APPLICANT = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  full_name: 'Ahmad Fauzi',
  registration_path: 'reguler',
}

// Transaksi nyata: ID 36 karakter seperti di database.
const PAID_TX = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  amount: 275000,
  method: 'qris',
  status: 'paid',
  updated_at: '2026-03-01T10:00:00Z',
}

describe('PaymentStep — kuitansi tidak boleh dibuat dari data karangan', () => {
  it('menampilkan LUNAS dan nominal sebenarnya saat transaksi lunas', () => {
    render(<PaymentStep transaction={PAID_TX} applicant={APPLICANT} />)
    expect(screen.getByText('LUNAS')).toBeInTheDocument()
    expect(screen.getByText('Rp 275.000')).toBeInTheDocument()
  })

  // Ini regresi untuk bug yang pernah ada: badge LUNAS dirender tanpa syarat,
  // sehingga pendaftar tanpa transaksi apa pun tetap melihat kuitansi resmi.
  it('TIDAK menampilkan LUNAS saat belum ada transaksi sama sekali', () => {
    render(<PaymentStep transaction={null} applicant={APPLICANT} />)
    expect(screen.queryByText('LUNAS')).not.toBeInTheDocument()
  })

  it('TIDAK menampilkan badge LUNAS saat transaksi masih pending', () => {
    render(
      <PaymentStep
        transaction={{ ...PAID_TX, status: 'pending' }}
        applicant={APPLICANT}
      />
    )
    expect(screen.queryByText('LUNAS')).not.toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  // 250.000 pernah dipatok sebagai nominal default kuitansi.
  it('tidak pernah memunculkan nominal 250.000 tanpa transaksi', () => {
    render(<PaymentStep transaction={null} applicant={APPLICANT} />)
    expect(screen.queryByText('Rp 250.000')).not.toBeInTheDocument()
  })

  // Metode pembayaran tidak boleh ditebak "QRIS" saat belum ada transaksi.
  it('tidak menebak metode QRIS saat metode tidak tercatat', () => {
    render(<PaymentStep transaction={{ ...PAID_TX, method: null }} applicant={APPLICANT} />)
    expect(screen.getByText('TIDAK DIKETAHUI')).toBeInTheDocument()
    expect(screen.queryByText('QRIS')).not.toBeInTheDocument()
  })

  // Nomor kuitansi sebelumnya hanya 8 karakter pertama ID (32 bit entropy).
  it('mengambil 12 karakter ID untuk nomor kuitansi', () => {
    render(<PaymentStep transaction={PAID_TX} applicant={APPLICANT} />)
    expect(screen.getByText('No: KUI-PPDB-ABCDEF123456')).toBeInTheDocument()
  })
})