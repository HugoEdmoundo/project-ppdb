import { describe, it, expect } from 'vitest'
import {
  canRenderQr,
  describeCreateError,
  formatCountdown,
  isOpenTransaction,
  isPaidTransaction,
  mapSyncResponse,
  resolveLocalPaymentState,
  shouldPollTransaction,
} from './paymentStatus'

describe('paymentStatus — kontrak status pembayaran QRIS', () => {
  describe('isOpenTransaction', () => {
    it('menganggap pending & pending_verification sebagai transaksi terbuka', () => {
      expect(isOpenTransaction({ status: 'pending' })).toBe(true)
      expect(isOpenTransaction({ status: 'pending_verification' })).toBe(true)
    })

    it('menolak status terminal dan nilai kosong', () => {
      for (const status of ['success', 'paid', 'cancelled', 'failed', 'expired', 'exception']) {
        expect(isOpenTransaction({ status })).toBe(false)
      }
      expect(isOpenTransaction(null)).toBe(false)
      expect(isOpenTransaction(undefined)).toBe(false)
    })
  })

  describe('isPaidTransaction', () => {
    it('mengenali success dan paid', () => {
      expect(isPaidTransaction({ status: 'success' })).toBe(true)
      expect(isPaidTransaction({ status: 'paid' })).toBe(true)
      expect(isPaidTransaction({ status: 'pending' })).toBe(false)
    })
  })

  describe('canRenderQr', () => {
    it('hanya menampilkan QR saat status pending dan qr_string valid', () => {
      expect(canRenderQr({ status: 'pending', qr_string: 'QRIS-DATA' })).toBe(true)
    })

    it('tidak menampilkan QR untuk pending tanpa qr_string', () => {
      expect(canRenderQr({ status: 'pending', qr_string: '' })).toBe(false)
      expect(canRenderQr({ status: 'pending' })).toBe(false)
    })

    it('tidak menampilkan QR untuk pending_verification walau ada qr_string', () => {
      expect(canRenderQr({ status: 'pending_verification', qr_string: 'QRIS-DATA' })).toBe(false)
    })

    it('tidak menampilkan QR untuk status terminal', () => {
      expect(canRenderQr({ status: 'success', qr_string: 'QRIS-DATA' })).toBe(false)
      expect(canRenderQr({ status: 'cancelled', qr_string: 'QRIS-DATA' })).toBe(false)
    })
  })

  describe('shouldPollTransaction', () => {
    it('polling berjalan untuk pending dan pending_verification', () => {
      expect(shouldPollTransaction({ status: 'pending' })).toBe(true)
      expect(shouldPollTransaction({ status: 'pending_verification' })).toBe(true)
    })

    it('polling berhenti pada status terminal', () => {
      expect(shouldPollTransaction({ status: 'success' })).toBe(false)
      expect(shouldPollTransaction({ status: 'cancelled' })).toBe(false)
      expect(shouldPollTransaction(null)).toBe(false)
    })
  })

  describe('resolveLocalPaymentState', () => {
    it('memetakan setiap status lokal yang dikenal', () => {
      expect(resolveLocalPaymentState(null)).toBe('none')
      expect(resolveLocalPaymentState({ status: 'pending' })).toBe('awaiting_payment')
      expect(resolveLocalPaymentState({ status: 'pending_verification' })).toBe('verifying')
      expect(resolveLocalPaymentState({ status: 'success' })).toBe('paid')
      expect(resolveLocalPaymentState({ status: 'paid' })).toBe('paid')
      expect(resolveLocalPaymentState({ status: 'cancelled' })).toBe('cancelled')
      expect(resolveLocalPaymentState({ status: 'expired' })).toBe('expired')
      expect(resolveLocalPaymentState({ status: 'failed' })).toBe('failed')
      expect(resolveLocalPaymentState({ status: 'exception' })).toBe('exception')
    })

    it('memperlakukan status tak dikenal sebagai "verifying", bukan gagal/sukses', () => {
      expect(resolveLocalPaymentState({ status: 'mystery' })).toBe('verifying')
      expect(resolveLocalPaymentState({})).toBe('verifying')
    })
  })

  describe('mapSyncResponse', () => {
    it('success → paid terminal', () => {
      const outcome = mapSyncResponse({ status: 'success' })
      expect(outcome.kind).toBe('paid')
      expect(outcome.terminal).toBe(true)
    })

    it('pending & pending_verification → non-terminal', () => {
      expect(mapSyncResponse({ status: 'pending' }).kind).toBe('pending')
      expect(mapSyncResponse({ status: 'pending' }).terminal).toBe(false)
      expect(mapSyncResponse({ status: 'pending_verification' }).kind).toBe('verifying')
      expect(mapSyncResponse({ status: 'pending_verification' }).terminal).toBe(false)
    })

    it('cancelled/expired/failed/exception → terminal', () => {
      expect(mapSyncResponse({ status: 'cancelled' }).kind).toBe('cancelled')
      expect(mapSyncResponse({ status: 'expired' }).kind).toBe('expired')
      expect(mapSyncResponse({ status: 'failed' }).kind).toBe('failed')
      expect(mapSyncResponse({ status: 'exception' }).kind).toBe('exception')
      expect(mapSyncResponse({ status: 'exception' }).terminal).toBe(true)
    })

    it('respons tidak sesuai kontrak → verifying non-terminal, bukan sukses', () => {
      const outcome = mapSyncResponse({})
      expect(outcome.kind).toBe('verifying')
      expect(outcome.terminal).toBe(false)
    })
  })

  describe('describeCreateError', () => {
    it('respons tidak pasti (pesan rekonsiliasi) → reconciling', () => {
      const info = describeCreateError({
        message:
          'Status pembuatan pembayaran belum dapat dipastikan. Transaksi ditandai untuk rekonsiliasi.',
        status: 502,
      })
      expect(info.kind).toBe('reconciling')
    })

    it('respons tidak lengkap → reconciling', () => {
      const info = describeCreateError({
        message: 'Gateway membalas data pembayaran yang tidak lengkap. Transaksi ditandai untuk rekonsiliasi.',
        status: 502,
      })
      expect(info.kind).toBe('reconciling')
    })

    it('penolakan 4xx → rejected', () => {
      const info = describeCreateError({ message: 'Kuota gelombang sudah penuh', status: 400 })
      expect(info.kind).toBe('rejected')
      expect(info.message).toBe('Kuota gelombang sudah penuh')
    })

    it('kegagalan gateway definitif / jaringan → network (aman dicoba ulang)', () => {
      const info = describeCreateError({
        message: 'Gagal membuat transaksi ke payment gateway: timeout',
        status: 502,
      })
      expect(info.kind).toBe('network')
    })
  })

  describe('formatCountdown', () => {
    it('memformat detik ke mm:ss', () => {
      expect(formatCountdown(0)).toBe('00:00')
      expect(formatCountdown(59)).toBe('00:59')
      expect(formatCountdown(60)).toBe('01:00')
      expect(formatCountdown(900)).toBe('15:00')
    })

    it('aman untuk nilai negatif / bukan angka', () => {
      expect(formatCountdown(-5)).toBe('00:00')
      expect(formatCountdown(NaN)).toBe('00:00')
    })
  })
})
