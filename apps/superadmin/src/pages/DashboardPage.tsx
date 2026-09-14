import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, Shield, GraduationCap, Bell, Send, Activity, ChevronRight,
  UserRound, Settings, CreditCard, Waves, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { Badge } from "@/components/ui"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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
    users_by_type: Record<string, number>
    users_active: number
    users_inactive: number
    users_new_30d: number
    system_roles: number
    custom_roles: number
    applicants_by_payment: Record<string, number>
    applicants_new_30d: number
  }
  notifications: { sent: number; failed: number; sent_today: number } | null
  active_wave: { name: string; quota: number; filled: number } | null
  recent_logs: AuditLog[]
  trend: TrendPoint[]
  trend_delta: { current: number; previous: number; pct: number | null } | null
}

interface ColorItem {
  label: string
  value: number
  color: string
}

interface StatCardDef {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  chip: string
  link?: string
  chipTop?: React.ReactNode
  sub?: React.ReactNode
  footer?: React.ReactNode
}

const ENTITY_ICONS: [string, { icon: LucideIcon; chip: string; iconCls: string }][] = [
  ['applicant', { icon: GraduationCap, chip: 'bg-emerald-50', iconCls: 'text-emerald-600' }],
  ['notif', { icon: Bell, chip: 'bg-amber-50', iconCls: 'text-amber-600' }],
  ['role', { icon: Shield, chip: 'bg-purple-50', iconCls: 'text-purple-600' }],
  ['user', { icon: UserRound, chip: 'bg-blue-50', iconCls: 'text-blue-600' }],
]

const USER_TYPE_META: { key: string; label: string; color: string }[] = [
  { key: 'superadmin', label: 'Superadmin', color: '#6B7280' },
  { key: 'admin', label: 'Admin', color: '#3B82F6' },
  { key: 'applicant', label: 'Pendaftar', color: '#1A6B47' },
]

const PAYMENT_META: { key: string; label: string; color: string }[] = [
  { key: 'paid', label: 'Lunas', color: '#22C55E' },
  { key: 'pending', label: 'Menunggu', color: '#D4A853' },
  { key: 'expired', label: 'Kadaluarsa', color: '#F43F5E' },
  { key: 'failed', label: 'Gagal', color: '#F97316' },
]

const emptyStats = (): Stats['stats'] => ({
  total_users: 0,
  total_roles: 0,
  total_applicants: 0,
  users_by_type: {},
  users_active: 0,
  users_inactive: 0,
  users_new_30d: 0,
  system_roles: 0,
  custom_roles: 0,
  applicants_by_payment: {},
  applicants_new_30d: 0,
})

function entityMeta(entity: string) {
  const key = (entity || '').toLowerCase()
  for (const [token, meta] of ENTITY_ICONS) {
    if (key.includes(token)) return meta
  }
  return { icon: Settings, chip: 'bg-slate-100', iconCls: 'text-slate-500' }
}

function MiniSparkline({ data }: { data: TrendPoint[] }) {
  return (
    <div className="mt-3 h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="miniSpark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A6B47" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1A6B47" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="users" stroke="#1A6B47" strokeWidth={2} fill="url(#miniSpark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function SegmentedBar({ items, max }: { items: ColorItem[]; max?: number }) {
  const totalIsh = max !== undefined ? max : items.reduce((s, i) => s + i.value, 0)
  if (totalIsh === 0) {
    return <p className="mt-3 text-xs text-slate-400">Belum ada data</p>
  }
  return (
    <div className="mt-3">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {items.filter((i) => i.value > 0).map((i) => (
          <div key={i.label} style={{ width: `${(i.value / totalIsh) * 100}%`, backgroundColor: i.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {items.filter((i) => i.value > 0).map((i) => (
          <span key={i.label} className="inline-flex items-center gap-1 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} />
            {i.label} <span className="font-semibold text-slate-700">{i.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DonutCard({ title, description, icon: Icon, items, emptyText }: {
  title: string
  description: string
  icon: LucideIcon
  items: ColorItem[]
  emptyText: string
}) {
  const visible = items.filter((i) => i.value > 0)
  const total = items.reduce((s, i) => s + i.value, 0)
  return (
    <Card className="flex flex-col rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex-1 pt-5">
        {visible.length > 0 ? (
          <div className="flex items-center gap-6">
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={visible} dataKey="value" nameKey="label" innerRadius={44} outerRadius={64} paddingAngle={2} strokeWidth={2}>
                    {visible.map((i) => <Cell key={i.label} fill={i.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{total}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">total</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {visible.map((i) => (
                <li key={i.label} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                    {i.label}
                  </span>
                  <span className="font-semibold text-slate-800">{i.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  )
}

function WaveQuotaCard({ wave }: { wave: Stats['active_wave'] }) {
  return (
    <Card className="flex flex-col rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Waves className="h-4 w-4 text-primary" />
          Kuota Gelombang Aktif
        </CardTitle>
        <p className="text-xs text-muted-foreground">Daya tampung pendaftar pada gelombang yang sedang berjalan</p>
      </CardHeader>
      <CardContent className="flex-1 pt-5">
        {wave ? (
          <div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900">{wave.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {wave.filled} dari {wave.quota} kuota terisi
                </p>
              </div>
              <span className="text-2xl font-bold text-primary">
                {wave.quota > 0 ? Math.round((wave.filled / wave.quota) * 100) : 0}%
              </span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${wave.quota > 0 && wave.filled / wave.quota >= 0.9 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-primary to-emerald-600'}`}
                style={{ width: `${wave.quota > 0 ? Math.min(100, (wave.filled / wave.quota) * 100) : 0}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Terisi</span>
              <span>
                {wave.quota > 0 ? Math.max(0, wave.quota - wave.filled) : 0} slot tersisa
              </span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada gelombang aktif. Aktifkan gelombang terlebih dahulu.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
              total_applicants: res.total_applicants || 0,
              users_by_type: {},
              users_active: 0,
              users_inactive: 0,
              users_new_30d: 0,
              system_roles: 0,
              custom_roles: 0,
              applicants_by_payment: {},
              applicants_new_30d: 0,
            },
            notifications: null,
            active_wave: null,
            recent_logs: [],
            trend: [],
            trend_delta: null,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const s = data?.stats ?? emptyStats()
  const usersByType = s.users_by_type || {}
  const adminCount = usersByType['admin'] || 0
  const applicantCount = usersByType['applicant'] || 0
  const superadminCount = usersByType['superadmin'] || 0
  const otherUsers = Math.max(s.total_users - adminCount - applicantCount - superadminCount, 0)

  const knownPayment = PAYMENT_META.reduce((sum, m) => sum + (s.applicants_by_payment[m.key] || 0), 0)
  const otherPayment = Math.max(s.total_applicants - knownPayment, 0)

  const userTypeItems: ColorItem[] = [
    ...USER_TYPE_META.map((m) => ({ label: m.label, value: usersByType[m.key] || 0, color: m.color })),
    ...(otherUsers > 0 ? [{ label: 'Lainnya', value: otherUsers, color: '#D4A853' }] : []),
  ]

  const paymentItems: ColorItem[] = [
    ...PAYMENT_META.map((m) => ({ label: m.label, value: s.applicants_by_payment[m.key] || 0, color: m.color })),
    ...(otherPayment > 0 ? [{ label: 'Lainnya', value: otherPayment, color: '#94A3B8' }] : []),
  ]

  const activeBarItems: ColorItem[] = [
    { label: 'Aktif', value: s.users_active, color: '#22C55E' },
    { label: 'Nonaktif', value: s.users_inactive, color: '#F43F5E' },
  ]

  const statCards: StatCardDef[] = [
    {
      label: 'Total Pengguna',
      value: s.total_users,
      icon: Users,
      chip: 'bg-blue-500',
      link: '/users',
      chipTop: (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.users_new_30d > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {s.users_new_30d > 0 ? '+' : ''}{s.users_new_30d} 30 hr
        </span>
      ),
      sub: (
        <span className="text-slate-500">
          {adminCount} admin · {applicantCount} pendaftar · {superadminCount} superadmin
        </span>
      ),
      footer: <SegmentedBar items={activeBarItems} max={s.total_users} />,
    },
    {
      label: 'Total Role',
      value: s.total_roles,
      icon: Shield,
      chip: 'bg-purple-500',
      link: '/roles',
      sub: (
        <span className="text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> {s.system_roles} sistem
          </span>
          <span className="mx-2 text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> {s.custom_roles} khusus
          </span>
        </span>
      ),
      footer: <p className="mt-3 text-xs text-slate-400">Role sistem dilindungi dari penghapusan.</p>,
    },
    {
      label: 'Pendaftar',
      value: s.total_applicants,
      icon: GraduationCap,
      chip: 'bg-emerald-500',
      chipTop: (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.applicants_new_30d > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {s.applicants_new_30d > 0 ? '+' : ''}{s.applicants_new_30d} 30 hr
        </span>
      ),
      sub: (
        <span className="text-slate-500">Registrasi 30 hari terakhir sesuai grafik</span>
      ),
      footer: (
        <>
          <MiniSparkline data={data?.trend || []} />
          <SegmentedBar items={paymentItems} max={s.total_applicants} />
        </>
      ),
    },
    {
      label: 'Notifikasi',
      value: (
        <span className="inline-flex items-center gap-2">
          {data?.notifications?.sent ?? 0}
          <span className="text-sm font-medium text-slate-400">terkirim</span>
        </span>
      ),
      icon: Bell,
      chip: 'bg-amber-500',
      link: '/notifications',
      chipTop: (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700">
          {data?.notifications?.sent_today ?? 0} hari ini
        </span>
      ),
      sub: (
        <span className={`inline-flex items-center gap-1 ${(data?.notifications?.failed ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
          {data?.notifications ? (
            <>{(data.notifications.failed || 0) > 0 ? `${data.notifications.failed} gagal kirim` : 'Tidak ada pengiriman gagal'}</>
          ) : (
            'Belum ada data'
          )}
        </span>
      ),
      footer: (
        <div className="mt-3">
          <Link
            to="/notifications"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Send className="h-3.5 w-3.5" /> Kirim Notifikasi
          </Link>
        </div>
      ),
    },
  ]

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString)
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  }

  const trendHasData = (data?.trend?.length ?? 0) > 0 && (data?.trend?.some(p => p.users > 0) ?? false)
  const deltaPct = data?.trend_delta?.pct ?? null

  const displayName = (user?.full_name || user?.username || 'Admin').trim().split(' ')[0] || 'Admin'
  const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const heroChips = [
    { icon: Users, label: `${s.total_users} Pengguna` },
    { icon: Waves, label: data?.active_wave?.name ?? 'Tanpa Gelombang Aktif' },
    { icon: Bell, label: `${data?.notifications?.sent_today ?? 0} Notif Hari Ini` },
  ]

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Hero card: sapaan + status sistem */}
      {loading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E3B26] via-[#1A6B47] to-[#237A52] p-6 text-white shadow-lg shadow-emerald-900/20 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-pattern-dots opacity-20" />
          <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[#D4A853]/25" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-100">Assalamu'alaikum, {displayName} — {todayLabel}</p>
              <h1 className="mt-0.5 font-heading text-2xl font-bold tracking-tight md:text-3xl">Superadmin Control Center</h1>
              <p className="mt-1 text-sm text-emerald-50/90">Pantau aktivitas, akses, dan konfigurasi sistem PTDARRAHMAN.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {heroChips.map((chip) => {
                  const ChipIcon = chip.icon
                  return (
                    <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                      <ChipIcon className="h-3.5 w-3.5" />
                      {chip.label}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <Badge variant="outline" className="border-emerald-200/40 bg-emerald-50/10 px-3 py-1.5 text-emerald-50">
                <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                System Online
              </Badge>
              <div className="flex flex-wrap gap-2">
                <Link to="/users" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25">
                  <Users className="h-3.5 w-3.5" /> Kelola Users
                </Link>
                <Link to="/notifications" className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A853] px-4 py-2 text-xs font-bold text-[#0E3B26] transition-colors hover:bg-[#E2BC6B]">
                  <Send className="h-3.5 w-3.5" /> Kirim Notifikasi
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <div className="flex items-end justify-between gap-2">
                        <p className="text-3xl font-bold text-foreground leading-none">{card.value}</p>
                        {card.chipTop}
                      </div>
                      {card.sub && <div className="mt-2 text-xs">{card.sub}</div>}
                      {card.footer}
                    </CardContent>
                  </Card>
                )
                return card.link ? (
                  <div
                    key={card.label}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(card.link!)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(card.link!)
                      }
                    }}
                    className="block h-full cursor-pointer rounded-2xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    {content}
                  </div>
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
              {!loading && deltaPct !== null && (
                <Badge
                  variant="outline"
                  className={
                    deltaPct > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : deltaPct < 0
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                  }
                >
                  {deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '•'} {deltaPct > 0 ? deltaPct : Math.abs(deltaPct)}% vs 30 hari sebelumnya
                </Badge>
              )}
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

      {/* Distribution Cards */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DonutCard
            title="Komposisi Pengguna"
            description="Distribusi akun berdasarkan tipe pengguna"
            icon={Users}
            items={userTypeItems}
            emptyText="Belum ada data pengguna"
          />
          <DonutCard
            title="Status Pembayaran"
            description="Distribusi status pembayaran seluruh pendaftar"
            icon={CreditCard}
            items={paymentItems}
            emptyText="Belum ada data pendaftar"
          />
          <WaveQuotaCard wave={data?.active_wave ?? null} />
        </div>
      )}
    </div>
  )
}