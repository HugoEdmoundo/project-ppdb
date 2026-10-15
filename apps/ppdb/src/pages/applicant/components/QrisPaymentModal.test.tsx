import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import QrisPaymentModal from './QrisPaymentModal'

const baseTx = {
  id: 'tx-1',
  order_id: 'ord-1',
  status: 'pending',
  payment_type: 'dp',
  amount: 5000000,
  qr_string: 'QRIS-DATA',
}

function renderModal(overrides: Partial<React.ComponentProps<typeof QrisPaymentModal>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    activeTx: baseTx,
    state: 'awaiting_payment' as const,
    secondsRemaining: 900,
    checkingStatus: false,
    syncMessage: null,
    onCheckStatus: vi.fn(),
    onCancelTx: vi.fn(),
    isCancelling: false,
    ...overrides,
  }
  return render(<QrisPaymentModal {...props} />)
}

describe('QrisPaymentModal — tampilan status pembayaran', () => {
  it('menampilkan QR & instruksi saat menunggu pembayaran', () => {
    renderModal()
    expect(screen.getByText(/Pembayaran QRIS Pak Kasir/i)).toBeInTheDocument()
    expect(screen.getByText(/Petunjuk Pembayaran/i)).toBeInTheDocument()
    expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cek Status Pembayaran/i })).toBeInTheDocument()
    expect(screen.getByText(/Jangan membuat transaksi atau membayar ulang/i)).toBeInTheDocument()
  })

  it('menampilkan pemeriksaan status untuk pending_verification', () => {
    renderModal({ state: 'verifying', activeTx: { ...baseTx, status: 'pending_verification', qr_string: null } })
    expect(screen.getByText(/Memeriksa status pembayaran/i)).toBeInTheDocument()
    expect(screen.getAllByText(/jangan membayar ulang/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Cek Status Pembayaran/i })).toBeInTheDocument()
  })

  it('menampilkan pesan sukses saat pembayaran terverifikasi', () => {
    renderModal({ state: 'paid' })
    expect(screen.getByText(/Pembayaran Berhasil/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cek Status Pembayaran/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tutup$/i })).toBeInTheDocument()
  })

  it('menampilkan status tidak aktif (backend-confirmed) tanpa aksi cek status', () => {
    renderModal({ state: 'expired' })
    expect(screen.getByText(/Transaksi Tidak Aktif/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cek Status Pembayaran/i })).not.toBeInTheDocument()
  })

  it('menampilkan status dibatalkan (backend-confirmed)', () => {
    renderModal({ state: 'cancelled' })
    expect(screen.getByText(/Transaksi Dibatalkan/i)).toBeInTheDocument()
  })

  it('menampilkan keadaan memuat saat transaksi disiapkan', () => {
    renderModal({ state: 'loading', activeTx: null, secondsRemaining: 0 })
    expect(screen.getByText(/Menyiapkan transaksi/i)).toBeInTheDocument()
  })

  it('menampilkan catatan pemeriksaan saat countdown tampilan habis', () => {
    renderModal({ secondsRemaining: 0 })
    expect(screen.getByText(/Batas tampilan tercapai/i)).toBeInTheDocument()
  })
})
