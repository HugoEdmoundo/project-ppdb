import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Modal } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { Search, History, Activity, Eye, RefreshCw } from 'lucide-react'
import PageHero from '../components/PageHero'

interface AuditRow {
  id: string
  user_id?: string | null
  user_username?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  changes?: Record<string, any> | null
  ip_address?: string | null
  created_at: string
}

function formatDateTime(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

function actionBadge(action: string) {
  const a = (action || '').toLowerCase()
  if (['crud', 'delete', 'deactivate'].some(k => a.includes(k))) return 'destructive'
  if (['activate', 'create', 'approve', 'verified', 'passed'].some(k => a.includes(k))) return 'success'
  if (['update', 'edit'].some(k => a.includes(k))) return 'warning'
  return 'secondary'
}

export default function ActivitiesPage() {
  const { toast } = useToast()

  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<AuditRow | null>(null)
  const perPage = 20

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.getAuditLogs({
        search,
        entity_type: entityType,
        action,
        page,
        per_page: perPage,
      })
      setLogs(res?.data || [])
      setTotal(res?.total ?? 0)
      if (res?.entity_types) setEntityTypes(res.entity_types)
      if (res?.actions) setActions(res.actions)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat riwayat aktivitas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  useEffect(() => {
    if (page > 1 || search !== '' || entityType !== '' || action !== '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, entityType, action])

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Superadmin"
        title="Riwayat Aktivitas"
        description="Kelola dan telusuri jejak aktivitas seluruh pengguna sistem — siapa melakukan apa, kapan, dan terhadap data apa."
        loading={loading && logs.length === 0}
        chips={[
          { icon: Activity, label: `${total} Aktivitas` },
          { icon: History, label: `${entityTypes.length || 0} Jenis Entitas` },
          { icon: Eye, label: `${actions.length || 0} Jenis Aksi` },
        ]}
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari username / aksi / entitas..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <Button type="submit" variant="secondary">Cari</Button>
            </form>
            <Button type="button" variant="outline" size="sm" onClick={() => { setPage(1); fetchLogs() }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Muat Ulang
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 w-full sm:w-auto sm:shrink-0">
              <Eye className="h-4 w-4" /> Filter:
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
            >
              <option value="">Semua Entitas</option>
              {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
            >
              <option value="">Semua Aksi</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
                <TableHead>ID Entitas</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <EmptyState
                      icon={History}
                      title="Belum Ada Aktivitas"
                      description="Tidak ada catatan aktivitas yang cocok dengan pencarian / filter saat ini."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-foreground">{log.user_username || 'System'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionBadge(log.action)} className="uppercase text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs text-muted-foreground">{log.entity_type}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                      {log.entity_id || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(log)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Halaman {page} dari {totalPages} ({total} aktivitas)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Detail Aktivitas"
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setSelected(null)}>Tutup</Button>
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs">Deskripsi</p>
                <p className="font-medium mt-1">
                  <span className="font-semibold">{selected.user_username || 'System'}</span> melakukan{' '}
                  <span className="font-semibold text-primary">{selected.action}</span> pada{' '}
                  <span className="font-semibold">{selected.entity_type}</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Waktu</p>
                <p className="font-medium mt-1">{formatDateTime(selected.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">IP Address</p>
                <p className="font-mono font-medium mt-1">{selected.ip_address || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">User ID</p>
                <p className="font-mono text-xs font-medium mt-1">{selected.user_id || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Entity ID</p>
                <p className="font-mono text-xs font-medium mt-1">{selected.entity_id || '—'}</p>
              </div>
            </div>

            {selected.changes && (
              <div>
                <p className="text-muted-foreground text-xs mb-2">Perubahan Data (JSON)</p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-slate-50 p-4 text-xs text-slate-700">
                  {JSON.stringify(selected.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
