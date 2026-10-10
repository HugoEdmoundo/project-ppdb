import { Link } from 'react-router-dom'
import { ArrowRight, Activity, ListTree } from 'lucide-react'
import { Button } from "@/components/ui"
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import SelectionCategories from './components/SelectionCategories'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

export default function SelectionPage() {
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
        title="Rubrik Penilaian"
        description="Konfigurasi kriteria, bobot, dan deskripsi penilaian evaluator Tahfidz dan Wawancara. Rubrik bersifat global institusi — berlaku di semua gelombang."
        loading={wavesLoading}
        docKey="ppdb-rubrik"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWave?.name || 'Tidak ada', active: !!activeWave, pulse: !!activeWave },
          { icon: ListTree, label: 'Kategori Rubrik', value: 'Tahfidz & Wawancara', active: true },
        ]}
      />

      {/* Struktur Rubrik Penilaian — selalu tampil, tidak perlu gelombang aktif */}
      <SelectionCategories />
    </div>
  )
}
