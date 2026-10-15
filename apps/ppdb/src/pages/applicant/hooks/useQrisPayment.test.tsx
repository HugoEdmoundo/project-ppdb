import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useQrisPayment } from './useQrisPayment'

const toast = vi.fn()

vi.mock('@/components/Toast', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('@/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/api/client'

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>

// ── Helper data ────────────────────────────────────────────────────────────────
const PENDING_TX = {
  id: 'tx-1',
  order_id: 'ord-1',
  txn_id: 'txn-1',
  status: 'pending',
  payment_type: 'dp',
  amount: 5000000,
  qr_string: 'QRIS-DATA',
  expires_in_seconds: 900,
  expired_at: new Date(Date.now() + 900_000).toISOString(),
  created_at: new Date().toISOString(),
}

const VERIFYING_TX = {
  id: 'tx-2',
  order_id: 'ord-2',
  status: 'pending_verification',
  payment_type: 'dp',
  amount: 5000000,
  qr_string: null,
  expires_in_seconds: 900,
  created_at: new Date().toISOString(),
}

function makeTx(overrides: Record<string, unknown>) {
  return { ...PENDING_TX, ...overrides }
}

function myTransaction(active: any = null) {
  return {
    applicant: { id: 'app-1' },
    active_transaction: active,
    transaction: active,
    financials: { minimum_dp: 5000000, remaining_balance: 15000000 },
    recent_transactions: active ? [active] : [],
  }
}

type Handler = (url: string, opts?: any) => any

let handler: Handler

function setup(initialHandler: Handler) {
  handler = initialHandler
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  toast.mockReset()
  apiFetchMock.mockReset()
  apiFetchMock.mockImplementation((url: string, opts?: any) =>
    Promise.resolve().then(() => handler(url, opts)),
  )
})

async function mount(options: Parameters<typeof useQrisPayment>[0], initialHandler: Handler) {
  const { wrapper } = setup(initialHandler)
  const view = renderHook(() => useQrisPayment(options), { wrapper })
  await waitFor(() => expect(view.result.current.isLoading).toBe(false))
  return view
}

describe('useQrisPayment — integrasi kontrak pembayaran', () => {
  it('1) create valid: membuka modal QR dan menandai QR siap', async () => {
    let myTx = myTransaction(null)
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTx
      if (url === '/payment/create-qris') {
        myTx = myTransaction(PENDING_TX)
        return PENDING_TX
      }
      throw new Error('unexpected ' + url)
    })

    await act(async () => {
      result.current.createQrisMutation.mutate({ pType: 'dp' })
    })

    await waitFor(() => expect(result.current.paymentModalOpen).toBe(true))
    await waitFor(() => expect(result.current.qrReady).toBe(true))
    expect(result.current.viewState).toBe('awaiting_payment')
    expect(result.current.hasOpenTransaction).toBe(true)
  })

  it('2) pemulihan setelah refresh: transaksi pending_verification tampil & dipantau', async () => {
    const { result } = await mount(
      { defaultType: 'dp', autoOpenOnOpenTransaction: true },
      (url) => {
        if (url === '/payment/my-transaction') return myTransaction(VERIFYING_TX)
        throw new Error('unexpected ' + url)
      },
    )

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    expect(result.current.viewState).toBe('verifying')
    expect(result.current.qrReady).toBe(false)
    await waitFor(() => expect(result.current.paymentModalOpen).toBe(true))
  })

  it('3) polling berjalan selama transaksi pending', async () => {
    let syncCalls = 0
    const { result } = await mount({ defaultType: 'dp', pollEnabled: true, pollIntervalMs: 20 }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url.endsWith('/sync-status')) {
        syncCalls += 1
        return { status: 'pending' }
      }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(syncCalls).toBeGreaterThan(0))
    expect(result.current.activeTx?.status).toBe('pending')
  })

  it('4) polling berjalan selama transaksi pending_verification', async () => {
    let syncCalls = 0
    await mount({ defaultType: 'dp', pollEnabled: true, pollIntervalMs: 20 }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(VERIFYING_TX)
      if (url.endsWith('/sync-status')) {
        syncCalls += 1
        return { status: 'pending_verification' }
      }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(syncCalls).toBeGreaterThan(0))
  })

  it('5) countdown habis TIDAK menghentikan polling dan TIDAK menandai kedaluwarsa', async () => {
    let syncCalls = 0
    const expiredTx = makeTx({ expired_at: new Date(Date.now() - 60_000).toISOString(), expires_in_seconds: 0 })
    const { result } = await mount(
      { defaultType: 'dp', pollEnabled: true, pollIntervalMs: 20 },
      (url) => {
        if (url === '/payment/my-transaction') return myTransaction(expiredTx)
        if (url.endsWith('/sync-status')) {
          syncCalls += 1
          // Gateway masih menganggap pending meski countdown tampilan habis.
          return { status: 'pending' }
        }
        throw new Error('unexpected ' + url)
      },
    )

    await waitFor(() => expect(result.current.secondsRemaining).toBe(0))
    // Status tetap "menunggu pembayaran" (bukan expired) karena backend belum mengonfirmasi.
    expect(result.current.viewState).toBe('awaiting_payment')
    await waitFor(() => expect(syncCalls).toBeGreaterThan(0))
  })

  it('6) create timeout/5xx (respons tidak pasti) → mode rekonsiliasi, bukan gagal', async () => {
    let myTx = myTransaction(null)
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTx
      if (url === '/payment/create-qris') {
        const err = Object.assign(
          new Error(
            'Status pembuatan pembayaran belum dapat dipastikan. Transaksi ditandai untuk rekonsiliasi.',
          ),
          { status: 502 },
        )
        // Backend menyimpan transaksi pending_verification walau respons tidak pasti.
        myTx = myTransaction(VERIFYING_TX)
        throw err
      }
      throw new Error('unexpected ' + url)
    })

    await act(async () => {
      result.current.createQrisMutation.mutate({ pType: 'dp' })
    })

    await waitFor(() => expect(result.current.paymentModalOpen).toBe(true))
    await waitFor(() => expect(result.current.viewState).toBe('verifying'))
    expect(toast).toHaveBeenCalledWith('info', expect.stringContaining('belum dapat dipastikan'))
  })

  it('6b) respons create tidak lengkap (502) juga → mode rekonsiliasi', async () => {
    let myTx = myTransaction(null)
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTx
      if (url === '/payment/create-qris') {
        myTx = myTransaction(VERIFYING_TX)
        throw Object.assign(
          new Error('Gateway membalas data pembayaran yang tidak lengkap. Transaksi ditandai untuk rekonsiliasi.'),
          { status: 502 },
        )
      }
      throw new Error('unexpected ' + url)
    })

    await act(async () => {
      result.current.createQrisMutation.mutate({ pType: 'dp' })
    })

    await waitFor(() => expect(result.current.viewState).toBe('verifying'))
  })

  it('7) penolakan pasti (4xx) → toast error, tidak masuk mode rekonsiliasi', async () => {
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(null)
      if (url === '/payment/create-qris') {
        throw Object.assign(new Error('Kuota pendaftaran sudah penuh'), { status: 400 })
      }
      throw new Error('unexpected ' + url)
    })

    await act(async () => {
      result.current.createQrisMutation.mutate({ pType: 'dp' })
    })

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('error', 'Kuota pendaftaran sudah penuh'),
    )
    expect(result.current.paymentModalOpen).toBe(false)
    expect(result.current.viewState).toBe('none')
  })

  it('8) mencegah duplikasi: tidak membuat transaksi baru saat masih ada transaksi terbuka', async () => {
    let createCalls = 0
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url === '/payment/create-qris') {
        createCalls += 1
        return PENDING_TX
      }
      if (url.endsWith('/sync-status')) return { status: 'pending' }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    act(() => {
      result.current.requestCreateQris('dp', 5000000)
    })

    expect(createCalls).toBe(0)
    await waitFor(() => expect(result.current.paymentModalOpen).toBe(true))
  })

  it('8b) tetap membuat transaksi saat tidak ada transaksi terbuka', async () => {
    let createCalls = 0
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(null)
      if (url === '/payment/create-qris') {
        createCalls += 1
        return PENDING_TX
      }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(false))
    await act(async () => {
      result.current.requestCreateQris('dp', 5000000)
    })

    await waitFor(() => expect(createCalls).toBe(1))
  })

  it('9) gangguan jaringan saat cek status → outcome error, bukan sukses', async () => {
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url.endsWith('/sync-status')) throw new Error('Network Error')
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    await act(async () => {
      await result.current.handleCheckStatus()
    })

    await waitFor(() => expect(result.current.syncOutcome?.kind).toBe('error'))
    expect(toast).toHaveBeenCalledWith('error', expect.stringContaining('Koneksi bermasalah'))
  })

  it('10) sync sukses → terminal paid, toast sukses, transaksi tidak lagi terbuka', async () => {
    let myTx = myTransaction(PENDING_TX)
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTx
      if (url.endsWith('/sync-status')) {
        myTx = myTransaction(null)
        return { status: 'success' }
      }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    await act(async () => {
      await result.current.handleCheckStatus()
    })

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('success', expect.stringContaining('berhasil diverifikasi')),
    )
    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(false))
  })

  it('11) status terminal dikonfirmasi backend (cancelled) → outcome terminal', async () => {
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url.endsWith('/sync-status')) return { status: 'cancelled' }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    await act(async () => {
      await result.current.handleCheckStatus()
    })

    await waitFor(() => expect(result.current.syncOutcome?.kind).toBe('cancelled'))
    expect(result.current.syncOutcome?.terminal).toBe(true)
  })

  it('12) respons sync tidak sesuai kontrak → verifying, tanpa klaim sukses', async () => {
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url.endsWith('/sync-status')) return {}
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    await act(async () => {
      await result.current.handleCheckStatus()
    })

    await waitFor(() => expect(result.current.syncOutcome?.kind).toBe('verifying'))
    expect(toast).not.toHaveBeenCalledWith('success', expect.anything())
  })

  it('13) mencegah request sync tumpang tindih (race)', async () => {
    let syncCalls = 0
    let resolveSync: ((value: unknown) => void) | undefined
    const { result } = await mount({ defaultType: 'dp' }, (url) => {
      if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
      if (url.endsWith('/sync-status')) {
        syncCalls += 1
        return new Promise((resolve) => {
          resolveSync = resolve
        })
      }
      throw new Error('unexpected ' + url)
    })

    await waitFor(() => expect(result.current.hasOpenTransaction).toBe(true))
    act(() => {
      void result.current.handleCheckStatus()
      void result.current.handleCheckStatus()
    })

    await waitFor(() => expect(syncCalls).toBe(1))
    await act(async () => {
      resolveSync?.({ status: 'pending' })
    })
    expect(syncCalls).toBe(1)
  })

  it('14) menghentikan polling saat unmount (tanpa kebocoran interval)', async () => {
    let syncCalls = 0
    const { result, unmount } = await mount(
      { defaultType: 'dp', pollEnabled: true, pollIntervalMs: 20 },
      (url) => {
        if (url === '/payment/my-transaction') return myTransaction(PENDING_TX)
        if (url.endsWith('/sync-status')) {
          syncCalls += 1
          return { status: 'pending' }
        }
        throw new Error('unexpected ' + url)
      },
    )

    await waitFor(() => expect(syncCalls).toBeGreaterThan(0))
    expect(result.current.hasOpenTransaction).toBe(true)
    unmount()
    const callsAtUnmount = syncCalls
    await new Promise((resolve) => setTimeout(resolve, 90))
    expect(syncCalls).toBe(callsAtUnmount)
  })
})
