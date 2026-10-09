import { Link } from 'react-router-dom'
import { Button } from "@/components/ui"
import { ArrowRight, Activity, CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import Stage2BillsMonitoring from './components/Stage2BillsMonitoring'

export default function PembayaranTahap2Page() {
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
        title="Pembayaran Tahap 2"
        description="Monitoring tagihan DP dan cicilan biaya pendidikan santri. Status terverifikasi otomatis via webhook payment gateway."
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
          { icon: CreditCard, label: 'Sistem Pembayaran', value: 'Monitoring Otomatis', active: true },
        ]}
      />

      {!wavesLoading && !activeWave && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk memantau pembayaran tahap 2." />
      )}

      {/* Murni Monitoring Tagihan & Cicilan */}
      <Stage2BillsMonitoring />
    </div>
  )
}
