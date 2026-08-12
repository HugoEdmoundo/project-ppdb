import { useState, useEffect } from 'react'
import { BarChart3, Layers } from 'lucide-react'
import { dashboardService } from '../../services/index'
import { useToast } from '../../components/Toast'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface DashboardStats {
  total_periods: number
  total_waves: number
  active_period_name?: string | null
}

export default function AdminDashboardPage() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardService.getStats()
      .then((s) => setStats(s as DashboardStats))
      .catch(() => toast('error', 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [toast])

  const statCards = [
    { label: 'Periode', value: stats?.total_periods ?? '—', icon: BarChart3, color: 'bg-indigo-500' },
    { label: 'Gelombang', value: stats?.total_waves ?? '—', icon: Layers, color: 'bg-teal-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan data PPDB</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-4 py-2 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">Periode Aktif:</span>
            {stats?.active_period_name ? (
              <Badge variant="success" className="text-sm font-bold px-2.5 py-0.5">{stats.active_period_name}</Badge>
            ) : (
              <Badge variant="danger" className="text-sm font-bold px-2.5 py-0.5">Belum ada periode aktif</Badge>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="p-6">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className="glass-card p-6 hover:shadow-glass-hover transition-shadow">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                </div>
                <p className="font-heading text-3xl font-bold text-foreground">{card.value}</p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
