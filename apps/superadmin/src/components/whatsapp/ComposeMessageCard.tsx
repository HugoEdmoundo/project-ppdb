import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@/components/ui'
import { Search, Send, UserRound, GraduationCap, RefreshCw } from 'lucide-react'
import * as api from '../../api/client'
import type { WhatsAppContact } from '../../api/client'

const PER_PAGE = 20

/**
 * Panel kirim chat manual ke satu kontak.
 *
 * Tujuan WA dipilih dari daftar (semua user + pendaftar yang punya nomor HP) —
 * sengaja tidak ada input nomor bebas supaya admin tidak salah kirim ke nomor
 * yang tidak ada di sistem.
 */
export default function ComposeMessageCard({
  isReady,
  onSent,
}: {
  isReady: boolean
  onSent: (contact: WhatsAppContact) => void
}) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<WhatsAppContact | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function load(nextPage = 1) {
    setLoading(true)
    setError('')
    try {
      const res = await api.getWhatsAppContacts({
        search: search.trim() || undefined,
        page: nextPage,
        per_page: PER_PAGE,
      })
      setContacts(res?.data || [])
      setTotalPages(res?.totalPages || 1)
      setTotal(res?.total || 0)
    } catch (e: any) {
      setError(e.message || 'Gagal memuat daftar kontak')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    await load(1)
  }

  async function handleSend() {
    if (!selected) {
      setError('Pilih kontak tujuan terlebih dahulu.')
      return
    }
    if (!message.trim()) {
      setError('Isi pesan terlebih dahulu.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api.waSendMessage({
        phone: selected.phone,
        message: message.trim(),
        eventKey: 'superadmin_chat',
        recipientUserId: selected.user_id || undefined,
      })
      onSent(selected)
      setMessage('')
      setSelected(null)
      await load(page)
    } catch (e: any) {
      setError(e.message || 'Gagal mengirim pesan')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Kirim Pesan Manual
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(page)}
            disabled={loading || !isReady}
            title="Muat ulang"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {total} kontak tersedia (pendaftar + admin/panitia) yang punya nomor
          WhatsApp.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {!isReady && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sesi WhatsApp belum READY. Hubungkan sesi (scan QR) terlebih dahulu
            sebelum mengirim pesan.
          </div>
        )}

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / nomor / email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!isReady}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!isReady || loading}>
            Cari
          </Button>
        </form>

        {/* Daftar kontak */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Memuat kontak...
            </p>
          ) : contacts.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Tidak ada kontak yang cocok.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((c) => {
                const active = selected?.id === c.id
                const Icon = c.kind === 'applicant' ? GraduationCap : UserRound
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!isReady}
                      onClick={() => {
                        setSelected(c)
                        setError('')
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
                          : 'hover:bg-muted/60'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {c.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.phone}
                          {c.kind === 'applicant' && (c.period_name || c.wave_name)
                            ? ` · ${c.period_name ?? '—'} · ${c.wave_name ?? '—'}`
                            : ''}
                        </span>
                      </span>
                      <Badge variant={c.kind === 'applicant' ? 'success' : 'secondary'}>
                        {c.kind === 'applicant' ? 'Pendaftar' : 'User'}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => {
                  setPage(page - 1)
                  load(page - 1)
                }}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  setPage(page + 1)
                  load(page + 1)
                }}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}

        {selected && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{selected.name}</span>
              <span className="block text-xs text-muted-foreground">
                {selected.phone}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              className="shrink-0"
            >
              Ganti
            </Button>
          </div>
        )}

        <div>
          <Textarea
            rows={4}
            placeholder="Tulis pesan... (mendukung beberapa baris)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isReady}
            maxLength={4096}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {message.length}/4096
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={handleSend}
          loading={sending}
          disabled={!isReady || sending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? 'Mengirim...' : 'Kirim Pesan'}
        </Button>
      </CardContent>
    </Card>
  )
}
