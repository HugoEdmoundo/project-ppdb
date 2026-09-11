import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Shield, GraduationCap, Bell, Send, Activity, ChevronRight,
  UserRound, Settings, type LucideIcon,
} from 'lucide-react'
import * as api from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { Badge } from "@/components/ui"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendPoint {
  date: string
  users: number
}

interface AuditLog {
  id: string
  action: string
  entity_type: string
  user_username: string
  created_at: string
}

interface Stats {
  stats: {
    total_users: number
    total_roles: number
    total_applicants: number
  }
  recent_logs: AuditLog[]
  trend: TrendPoint[]
}

interface StatCardDef {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  chip: string
  link?: string
}

const ENTITY_ICONS: [string, { icon: LucideIcon; chip: string; iconCls: string }][] = [
  ['applicant', { icon: GraduationCap, chip: 'bg-emerald-50', iconCls: 'text-emerald-600' }],
  ['notif', { icon: Bell, chip: 'bg-amber-50', iconCls: 'text-amber-600' }],
  ['role', { icon: Shield, chip: 'bg-purple-50', iconCls: 'text-purple-600' }],
  ['user', { icon: UserRound, chip: 'bg-blue-50', iconCls: 'text-blue-600' }],
]

function entityMeta(entity: string) {
  const key = (entity || '').toLowerCase()
  for (const [token, meta] of ENTITY_ICONS) {
    if (key.includes(token)) return meta
  }
  return { icon: Settings, chip: 'bg-slate-100', iconCls: 'text-slate-500' }
}

export default function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then((res: any) => {
        if (res.stats) {
          setData(res)
        } else {
          setData({
            stats: {
              total_users: res.total_users || 0,
              total_roles: res.total_roles || 0,
              total_applicants: res.total_applicants || 0
            },
            recent_logs: [],
            trend: []
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards: StatCardDef[] = [
    { label: 'Total Pengguna', value: data?.stats?.total_users ?? '—', icon: Users, chip: 'bg-blue-500', link: '/users' },
    { label: 'Total Role', value: data?.stats?.total_roles ?? '—', icon: Shield, chip: 'bg-purple-500', link: '/roles' },
    { label: 'Pendaftar', value: data?.stats?.total_applicants ?? '—', icon: GraduationCap, chip: 'bg-emerald-500' },
    {
      label: 'Notifikasi',
      value: (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          <Send className="h-4 w-4" />
          Kirim
        </span>
      ),
      icon: Bell,
      chip: 'bg-amber-500',
      link: '/notifications',
    },
  ]

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  }

  const trendHasData = (data?.trend?.length ?? 0) > 0 && (data?.trend?.some(p => p.users > 0) ?? false)

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header section with Welcome & System Status */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Superadmin Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">Pantau aktivitas, akses, dan konfigurasi sistem PTDARRAHMAN.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1.5 px-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            System Online
          </Badge>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* Main Stats (Top row) */}
        <div className="col-span-1 md:col-span-3 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-slate-100 shadow-sm rounded-2xl">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            : statCards.map((card) => {
                const Icon = card.icon
                const content = (
                  <Card className="group h-full cursor-pointer overflow-hidden rounded-2xl border-slate-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] ${card.chip}`} />
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-slate-700">
                        {card.label}
                      </CardTitle>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.chip} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    </CardContent>
                  </Card>
                )
                return card.link ? (
                  <Link key={card.label} to={card.link} className="block h-full transition-transform hover:scale-[1.02]">
                    {content}
                  </Link>
                ) : (
                  <div key={card.label} className="h-full">{content}</div>
                )
              })}
        </div>

        {/* Growth Chart (Bento Large Box) */}
        <Card className="col-span-1 overflow-hidden flex flex-col rounded-2xl border-slate-100 shadow-sm md:col-span-2 lg:col-span-3">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Trend Pendaftaran
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Registrasi pendaftar sistem dalam 30 hari terakhir</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-[300px]">
            {loading ? (
              <div className="flex h-full items-center justify-center p-6">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ) : trendHasData ? (
              <div className="h-[300px] w-full p-4 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A6B47" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1A6B47" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                      formatter={(value) => [value, 'Pendaftar']}
                      labelFormatter={(label) => `Tanggal ${label}`}
                    />
                    <Area type="monotone" dataKey="users" stroke="#1A6B47" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada data registrasi pendaftar.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Logs (Bento Side Box) */}
        <Card className="col-span-1 flex h-[380px] flex-col rounded-2xl border-slate-100 shadow-sm lg:h-auto">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg">Aktivitas Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {loading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.recent_logs && data.recent_logs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.recent_logs.map((log) => {
                  const meta = entityMeta(log.entity_type)
                  const Icon = meta.icon
                  return (
                    <div key={log.id} className="group flex items-start gap-3 p-4 transition-colors hover:bg-slate-50">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.chip} transition-colors`}>
                        <Icon className={`h-4 w-4 ${meta.iconCls}`} />
                      </div>
                      <div>
                        <p className="text-sm leading-snug text-slate-700">
                          <span className="font-semibold text-slate-900">{log.user_username || 'System'}</span> melakukan{' '}
                          <span className="font-medium text-primary">{log.action}</span> pada{' '}
                          <span className="font-medium">{log.entity_type}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Belum ada log aktivitas.
              </div>
            )}
          </CardContent>
          <div className="mt-auto border-t border-slate-50 bg-slate-50/50 p-3">
            <Link to="/notifications" className="flex w-full items-center justify-center py-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
              Kelola Notifikasi <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}