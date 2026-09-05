import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Shield, GraduationCap, Bell } from 'lucide-react'
import * as api from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"

interface Stats {
  total_users: number
  total_roles: number
  total_applicants?: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? '—', icon: Users, color: 'bg-blue-500' },
    { label: 'Total Roles', value: stats?.total_roles ?? '—', icon: Shield, color: 'bg-purple-500' },
    { label: 'Pendaftar', value: stats?.total_applicants ?? '—', icon: GraduationCap, color: 'bg-emerald-500', link: '/applicants' },
    { label: 'Notifikasi', value: 'Kirim', icon: Bell, color: 'bg-indigo-500', link: '/notifications' },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview sistem superadmin PTDARRAHMAN</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            const CardWrap = ({ children }: { children: React.ReactNode }) => (
              card.link ? <Link to={card.link} className="block transition-transform hover:scale-[1.02]">{children}</Link> : <>{children}</>
            )
            return (
              <CardWrap key={card.label}>
                <Card className="transition-shadow hover:shadow-md h-full cursor-pointer">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              </CardWrap>
            )
          })}
        </div>
      )}
    </div>
  )
}
