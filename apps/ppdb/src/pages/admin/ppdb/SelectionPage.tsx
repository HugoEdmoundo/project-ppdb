import { useState } from 'react'
import { ClipboardList, CalendarDays, ListTree, Star } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from "@repo/ui"
import SelectionSessions from './components/SelectionSessions'
import SelectionCategories from './components/SelectionCategories'
import SelectionResults from './components/SelectionResults'

export default function SelectionPage() {
  const [activeTab, setActiveTab] = useState<'sesi' | 'kategori' | 'nilai'>('sesi')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Manajemen Seleksi Dinamis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola sesi ujian (booking), kriteria penilaian, dan input nilai peserta.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="sesi">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Jadwal Sesi
          </TabsTrigger>
          <TabsTrigger value="kategori">
            <ListTree className="h-4 w-4 mr-1.5" />
            Struktur Penilaian
          </TabsTrigger>
          <TabsTrigger value="nilai">
            <Star className="h-4 w-4 mr-1.5" />
            Penilai & Status
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'sesi' && <SelectionSessions />}
      {activeTab === 'kategori' && <SelectionCategories />}
      {activeTab === 'nilai' && <SelectionResults />}
    </div>
  )
}
