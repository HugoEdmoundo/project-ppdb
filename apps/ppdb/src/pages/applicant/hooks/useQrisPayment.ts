import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import {
  canRenderQr,
  describeCreateError,
  isOpenTransaction,
  mapSyncResponse,
  resolveLocalPaymentState,
  shouldPollTransaction,
  type LocalPaymentState,
  type QrisPaymentType,
  type SyncOutcome,
} from './paymentStatus'

const DEFAULT_POLL_MS = 7000

const DEFAULT_FINANCIALS = {
  total_obligation: 15000000,
  minimum_dp: 5000000,
  dp_paid: false,
  dp_amount_paid: 0,
  total_paid: 0,
  remaining_balance: 15000000,
  is_lunas: false,
  successful_installments_count: 0,
}

export interface UseQrisPaymentOptions {
  defaultType?: QrisPaymentType
  /**
   * Setel `false` untuk menonaktifkan polling otomatis. Bila tidak diisi,
   * polling berjalan selama ada transaksi terbuka (pending/pending_verification)
   * — termasuk saat modal tertutup — dan berhenti saat transaksi terminal atau
   * komponen dibongkar.
   */
  pollEnabled?: boolean
  /**
   * Buka modal otomatis begitu ditemukan transaksi terbuka (mis. transaksi
   * `pending_verification` setelah respons tidak pasti atau setelah refresh),
   * agar pengguna tidak terjebak / membuat pembayaran ganda.
   */
  autoOpenOnOpenTransaction?: boolean
  pollIntervalMs?: number
}

/**
 * Sumber tunggal state pembayaran QRIS Pakasir untuk pendaftar.
 *
 * Menjembatani kontrak backend:
 * - `GET /payment/my-transaction` → `active_transaction` (pending | pending_verification).
 * - `POST /payment/create-qris` → transaksi (atau 502 untuk hasil tidak pasti).
 * - `POST /payment/transactions/{id}/sync-status` → status terkonfirmasi.
 * - `POST /payment/transactions/{id}/cancel`.
 */
export function useQrisPayment(options: UseQrisPaymentOptions = {}) {
  const {
    defaultType = 'dp',
    pollEnabled,
    autoOpenOnOpenTransaction = false,
    pollIntervalMs = DEFAULT_POLL_MS,
  } = options

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<QrisPaymentType>(defaultType)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [syncOutcome, setSyncOutcome] = useState<SyncOutcome | null>(null)
  // Respons pembuatan terakhir tidak pasti & belum ada transaksi terbuka yang
  // terlihat (mis. sebelum refetch selesai) → tetap tampilkan state "memeriksa".
  const [createUncertain, setCreateUncertain] = useState(false)

  // Cegah request sync overlapping (polling + cek manual) sekaligus race.
  const inFlightRef = useRef(false)
  const autoOpenedTxRef = useRef<string | null>(null)

  const myTxQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const activeTx: any = myTxQuery.data?.active_transaction
  const financials = myTxQuery.data?.financials || DEFAULT_FINANCIALS
  const recentTransactions: any[] = myTxQuery.data?.recent_transactions || []

  const hasOpenTransaction = isOpenTransaction(activeTx)
  const qrReady = canRenderQr(activeTx)

  const localState: LocalPaymentState = useMemo(() => {
    const resolved = resolveLocalPaymentState(activeTx)
    if (resolved !== 'none') return resolved
    if (createUncertain) return 'verifying'
    return 'none'
  }, [activeTx, createUncertain])

  // ── Countdown (murni tampilan; tidak pernah mengubah status) ───────────────
  // Dihitung turunan dari `expired_at` + tick `nowTick`, bukan state terpisah,
  // sehingga tidak ada sinkronisasi state di dalam effect.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (!hasOpenTransaction) return
    const timer = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasOpenTransaction])

  const secondsRemaining = useMemo(() => {
    if (!activeTx) return 0
    const rawExpired = activeTx.expired_at
    // Hanya pakai `expired_at` bila berisi offset zona waktu eksplisit, agar
    // tidak salah tafsir sebagai waktu lokal browser.
    if (typeof rawExpired === 'string' && /(Z|[+-]\d{2}:?\d{2})$/.test(rawExpired)) {
      const expiresAt = new Date(rawExpired).getTime()
      if (Number.isFinite(expiresAt)) {
        return Math.max(0, Math.floor((expiresAt - nowTick) / 1000))
      }
    }
    // Fallback: sisa waktu dari server (disegarkan tiap refetch/polling).
    const expiresIn = Number(activeTx.expires_in_seconds)
    if (Number.isFinite(expiresIn) && expiresIn > 0) {
      return Math.max(0, Math.floor(expiresIn))
    }
    return 0
  }, [activeTx, nowTick])

  // ── Rekonsiliasi status ke gateway ─────────────────────────────────────────
  const runSync = useCallback(
    async (txId: string): Promise<SyncOutcome | null> => {
      if (inFlightRef.current) return null
      inFlightRef.current = true
      try {
        const res = await apiFetch<any>(`/payment/transactions/${txId}/sync-status`, {
          method: 'POST',
        })
        const outcome = mapSyncResponse(res)
        setSyncOutcome(outcome)
        setCreateUncertain(false)
        // Selalu segarkan data agar rekonsiliasi (mis. pending_verification →
        // pending dengan txn_id) tercermin di UI.
        await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
        if (outcome.kind === 'paid') setPaymentModalOpen(false)
        return outcome
      } catch {
        // Jaringan/5xx saat sinkronisasi: status tidak berubah, tampilkan info.
        const outcome: SyncOutcome = {
          kind: 'error',
          terminal: false,
          message: 'Koneksi bermasalah. Status belum dapat diperiksa — silakan coba lagi.',
        }
        setSyncOutcome(outcome)
        return outcome
      } finally {
        inFlightRef.current = false
      }
    },
    [queryClient],
  )

  const handleCheckStatus = useCallback(
    async (txId?: string) => {
      const targetId = txId || activeTx?.id
      if (!targetId) {
        toast('info', 'Tidak ada transaksi aktif untuk diperiksa.')
        return
      }
      setCheckingStatus(true)
      try {
        const outcome = await runSync(targetId)
        if (!outcome) return
        switch (outcome.kind) {
          case 'paid':
            toast('success', 'Alhamdulillah! Pembayaran Anda berhasil diverifikasi.')
            break
          case 'cancelled':
          case 'pending':
          case 'verifying':
            toast('info', outcome.message)
            break
          case 'expired':
          case 'exception':
            toast('warning', outcome.message)
            break
          case 'failed':
          case 'error':
            toast('error', outcome.message)
            break
        }
      } finally {
        setCheckingStatus(false)
      }
    },
    [activeTx?.id, runSync, toast],
  )

  // ── Mutasi ─────────────────────────────────────────────────────────────────
  const createQrisMutation = useMutation({
    mutationFn: ({ pType, amt }: { pType: QrisPaymentType; amt?: number }) =>
      apiFetch<any>('/payment/create-qris', {
        method: 'POST',
        body: JSON.stringify({ payment_type: pType, amount: amt }),
      }),
    onSuccess: async (data: any) => {
      setSyncOutcome(null)
      setCreateUncertain(false)
      const state = resolveLocalPaymentState(data)
      await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      if (state === 'paid') {
        toast('success', 'Pembayaran Anda sudah terverifikasi sukses.')
        return
      }
      setPaymentModalOpen(true)
      if (canRenderQr(data)) {
        toast('success', 'Kode QRIS Pakasir berhasil diterbitkan!')
      } else {
        // Transaksi dikembalikan tanpa QR (mis. pemulihan transaksi
        // rekonsiliasi) — jangan klaim berhasil, arahkan ke pemeriksaan.
        setCreateUncertain(true)
        toast('info', 'Transaksi ditemukan. Sistem sedang memverifikasi status ke gateway.')
      }
    },
    onError: async (err: any) => {
      const info = describeCreateError(err)
      // Segarkan agar transaksi `pending_verification` (jika ada) ikut tampil.
      await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      if (info.kind === 'reconciling') {
        setCreateUncertain(true)
        setPaymentModalOpen(true)
        toast('info', info.message)
      } else {
        toast('error', info.message)
      }
    },
  })

  const cancelTxMutation = useMutation({
    mutationFn: (txId: string) =>
      apiFetch<any>(`/payment/transactions/${txId}/cancel`, { method: 'POST' }),
    onSuccess: async (res: any) => {
      if (res?.success === false) {
        toast(
          'warning',
          res.message ||
            'Permintaan pembatalan terkirim, tetapi status gateway belum dapat dipastikan.',
        )
      } else {
        toast('success', res?.message || 'Transaksi berhasil dibatalkan')
      }
      await queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
    },
    onError: (err: any) => {
      toast('error', err?.message || 'Gagal membatalkan transaksi')
    },
  })

  /**
   * Buat QRIS baru dengan pengaman anti-duplikasi: bila masih ada transaksi
   * terbuka, jangan buat transaksi baru — tampilkan transaksi yang ada.
   */
  const requestCreateQris = useCallback(
    (pType: QrisPaymentType, amt?: number) => {
      setPaymentType(pType)
      if (hasOpenTransaction) {
        const sameType = activeTx?.payment_type === pType
        const sameAmount = amt === undefined || Number(activeTx?.amount) === Number(amt)
        setPaymentModalOpen(true)
        if (!sameType || !sameAmount) {
          toast(
            'warning',
            'Anda masih memiliki transaksi QRIS yang belum selesai. Selesaikan atau batalkan transaksi tersebut terlebih dahulu.',
          )
        } else {
          void queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
        }
        return
      }
      createQrisMutation.mutate({ pType, amt })
    },
    [
      activeTx?.amount,
      activeTx?.payment_type,
      createQrisMutation,
      hasOpenTransaction,
      queryClient,
      toast,
    ],
  )

  // ── Polling ────────────────────────────────────────────────────────────────
  // Berjalan selama transaksi terbuka (pending ATAU pending_verification),
  // tanpa bergantung pada countdown tampilan maupun status modal.
  const pollingActive = shouldPollTransaction(activeTx) && pollEnabled !== false
  const pollTxId: string | undefined = activeTx?.id

  useEffect(() => {
    if (!pollingActive || !pollTxId) return
    let stopped = false
    const tick = () => {
      if (stopped) return
      void runSync(pollTxId)
    }
    const interval = setInterval(tick, pollIntervalMs)
    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [pollingActive, pollTxId, pollIntervalMs, runSync])

  // ── Pemulihan: buka modal saat ditemukan transaksi terbuka ──────────────────
  useEffect(() => {
    if (!autoOpenOnOpenTransaction) return
    if (!activeTx?.id || !isOpenTransaction(activeTx)) return
    if (autoOpenedTxRef.current === activeTx.id) return
    autoOpenedTxRef.current = activeTx.id
    setPaymentModalOpen(true)
  }, [autoOpenOnOpenTransaction, activeTx?.id, activeTx?.status, activeTx])

  const viewState: LocalPaymentState = useMemo(() => {
    if (localState !== 'none') return localState
    if (createQrisMutation.isPending) return 'loading'
    return 'none'
  }, [localState, createQrisMutation.isPending])

  return {
    // data
    myTransaction: myTxQuery.data,
    activeTx,
    financials,
    recentTransactions,
    isLoading: myTxQuery.isLoading,
    isError: myTxQuery.isError,
    // status
    localState,
    viewState,
    syncOutcome,
    hasOpenTransaction,
    qrReady,
    // ui state
    paymentModalOpen,
    setPaymentModalOpen,
    paymentType,
    setPaymentType,
    checkingStatus,
    secondsRemaining,
    isCreating: createQrisMutation.isPending,
    isCancelling: cancelTxMutation.isPending,
    // actions
    createQrisMutation,
    cancelTxMutation,
    requestCreateQris,
    handleCheckStatus,
    refetchTransaction: () => queryClient.invalidateQueries({ queryKey: ['my-transaction'] }),
  }
}
