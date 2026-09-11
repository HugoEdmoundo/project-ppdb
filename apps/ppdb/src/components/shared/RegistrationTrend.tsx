import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

export interface TrendPoint {
  date: string
  count: number
}

interface RegistrationTrendProps {
  data?: TrendPoint[]
  loading?: boolean
}

const formatLabel = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function RegistrationTrend({ data = [], loading }: RegistrationTrendProps) {
  const total = data.reduce((sum, point) => sum + (point.count || 0), 0)
  const chartData = data.map((point) => ({ ...point, label: formatLabel(point.date) }))

  return (
    <Card className="border-slate-100 shadow-sm rounded-2xl bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <TrendingUp className="h-4 w-4 text-primary" />
          Pendaftar 14 Hari Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : total === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400">
            <TrendingUp className="h-8 w-8 mb-2 text-slate-300" />
            <p className="text-sm">Belum ada pendaftar dalam 14 hari terakhir.</p>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value) => [value, 'Pendaftar']}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}