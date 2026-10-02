import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ListTree, ArrowRight, Activity, Users } from 'lucide-react'
import { Button } from "@/components/ui"
import { TabsTrigger } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import SelectionSessions from './components/SelectionSessions'
import SelectionCategories from './components/SelectionCategories'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import TabsBarCard from '@/components/shared/TabsBarCard'

const TAB_LABELS: Record<string, string> = {
  sesi: 'Jadwal Sesi',
  kategori: 'Struktur Penilaian'
}

export default function SelectionPage() {
  const [activeTab, setActiveTab] = useState<'sesi' | 'kategori'>('sesi')

  const activeWaveQuery = useQuery({
    queryKey: ['waves-active'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/waves')
      return res.find((w) => w.status === 'active') || null
    },
  })

  const activeWave = activeWaveQuery.data ?? null
  const wavesLoading = activeWaveQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Seleksi"
        description="Kelola sesi ujian (booking) dan kriteria penilaian."
        loading={wavesLoading}
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWave?.name || 'Tidak ada', active: !!activeWave, pulse: !!activeWave },
          { icon: Users, label: 'Modul Aktif', value: TAB_LABELS[activeTab], active: true },
        ]}
      />

      <TabsBarCard value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsTrigger value="sesi" className="flex-1 rounded-full text-xs sm:text-sm">
          <CalendarDays className="h-4 w-4 mr-1.5" /> Jadwal Sesi
        </TabsTrigger>
        <TabsTrigger value="kategori" className="flex-1 rounded-full text-xs sm:text-sm">
          <ListTree className="h-4 w-4 mr-1.5" /> Struktur Penilaian
        </TabsTrigger>
      </TabsBarCard>

      {!wavesLoading && !activeWave && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk mengelola seleksi." />
      )}

      {/* Tab Content */}
      {activeTab === 'sesi' && <SelectionSessions />}
      {activeTab === 'kategori' && <SelectionCategories />}
    </div>
  )
}
