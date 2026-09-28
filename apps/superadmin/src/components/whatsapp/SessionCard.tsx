import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@repo/ui'
import { waGetQrRaw, waRequestPairingCode, type WAProxyStatus } from '../../api/client'
import type { LoginMethod } from './constants'

interface Props {
  session: WAProxyStatus | null
  sessionLoading: boolean
  actionLoading: boolean
  loginMethod: LoginMethod
  isReady: boolean
  isActive: boolean
  testPhone: string
  sendingTest: boolean
  statusLabel: string
  onMethodChange: (method: LoginMethod) => void
  onInit: () => void
  onDisconnect: () => void
  onRefreshStatus: (silent?: boolean) => void | Promise<void>
  onTestPhoneChange: (phone: string) => void
  onSendTest: () => void
}

export default function SessionCard(props: Props) {
  const [qr, setQr] = useState('')
  const [phone, setPhone] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingError, setPairingError] = useState('')

  useEffect(() => {
    let alive = true
    if (props.session?.status !== 'qr' || props.loginMethod !== 'qr') {
      return
    }
    const loadQr = async () => {
      try {
        const result = await waGetQrRaw()
        if (alive && result.success) setQr(result.data?.raw || '')
      } catch { if (alive) setQr('') }
    }
    void loadQr()
    const timer = window.setInterval(loadQr, 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [props.session?.status, props.loginMethod])

  async function requestCode() {
    setPairingLoading(true)
    setPairingError('')
    try {
      await waRequestPairingCode(phone.trim())
      await props.onRefreshStatus(true)
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Gagal meminta kode pairing.')
    } finally { setPairingLoading(false) }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold text-slate-900">Sesi WhatsApp</h2><p className="text-sm text-slate-500">Status: {props.statusLabel}</p></div>
        <Button variant="outline" size="sm" onClick={() => void props.onRefreshStatus()} disabled={props.sessionLoading}>Perbarui</Button>
      </header>
      {props.session?.phone && <p className="text-sm text-slate-600">Terhubung sebagai {props.session.pushName || props.session.phone} ({props.session.phone})</p>}
      {props.session?.lastError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{props.session.lastError}</p>}
      {!props.isReady && <div className="space-y-3">
        <div className="flex gap-2"><Button size="sm" variant={props.loginMethod === 'qr' ? 'default' : 'outline'} onClick={() => props.onMethodChange('qr')}>Scan QR</Button><Button size="sm" variant={props.loginMethod === 'phone' ? 'default' : 'outline'} onClick={() => props.onMethodChange('phone')}>Nomor HP</Button></div>
        {props.loginMethod === 'qr' && (props.session?.status === 'qr' ? <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-lg bg-white p-3">{qr ? <QRCodeSVG value={qr} size={192} level="M" /> : <p className="text-sm text-slate-500">Memuat QR...</p>}<p className="text-xs text-slate-500">Pindai QR melalui WhatsApp di ponsel Anda.</p></div> : <Button onClick={props.onInit} disabled={props.actionLoading}>{props.actionLoading ? 'Memulai...' : 'Mulai sesi'}</Button>)}
        {props.loginMethod === 'phone' && <div className="space-y-2"><label className="text-sm font-medium" htmlFor="wa-pair-phone">Nomor WhatsApp</label><div className="flex gap-2"><input id="wa-pair-phone" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="62812..." className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><Button onClick={() => void requestCode()} disabled={pairingLoading || !phone.trim() || !props.isActive}>{pairingLoading ? 'Meminta...' : 'Minta kode'}</Button></div>{props.session?.pairingCode && <p className="rounded bg-emerald-50 p-3 text-center font-mono text-xl tracking-widest">{props.session.pairingCode}</p>}{pairingError && <p role="alert" className="text-sm text-red-600">{pairingError}</p>}</div>}
      </div>}
      {props.isReady && <div className="space-y-3"><p className="text-sm text-emerald-700">WhatsApp siap mengirim notifikasi.</p><div className="flex gap-2"><input type="tel" inputMode="numeric" aria-label="Nomor untuk pesan uji coba" value={props.testPhone} onChange={e => props.onTestPhoneChange(e.target.value.replace(/\D/g, ''))} placeholder="62812..." className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><Button onClick={props.onSendTest} disabled={props.sendingTest}>{props.sendingTest ? 'Mengirim...' : 'Kirim tes'}</Button></div><Button variant="outline" onClick={props.onDisconnect} disabled={props.actionLoading}>Putuskan sesi</Button></div>}
    </section>
  )
}
