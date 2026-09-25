import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import type { WAQueueStats } from '../../api/client'

export default function QueueStats({ stats, onRefresh }: { stats: WAQueueStats | null; onRefresh: () => void }) {
  const values: Array<[keyof WAQueueStats, string]> = [['waiting', 'Menunggu'], ['active', 'Diproses'], ['completed', 'Selesai'], ['failed', 'Gagal'], ['delayed', 'Tertunda']]
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Antrean Pesan</CardTitle><Button size="sm" variant="outline" onClick={onRefresh}>Perbarui</Button></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">{values.map(([key, label]) => <div key={key} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{stats?.[key] ?? '—'}</p></div>)}</CardContent></Card>
}
