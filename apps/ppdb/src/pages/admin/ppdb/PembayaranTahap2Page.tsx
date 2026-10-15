import { Link } from 'react-router-dom'
import { Button } from "@/components/ui"
import { ArrowRight, Activity, CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import Stage2BillsMonitoring from './components/Stage2BillsMonitoring'

export default function PembayaranTahap2Page() {
  const periodsQuery = useQuery({
    queryKey: ['periods-all'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/periods/all')
      return res || []
    },
  })

  const activePeriod = (periodsQuery.data || []).find((p) => p.status === 'active') || null
  const periodLoading = periodsQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Pembayaran Tahap 2"
        description="Monitoring tagihan DP dan cicilan biaya pendidikan. Status terverifikasi otomatis via webhook."
        loading={periodLoading}
        docKey="ppdb-pembayaran-tahap2"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Periode Aktif', value: activePeriod?.name || 'Tidak ada', active: !!activePeriod, pulse: !!activePeriod },
          { icon: CreditCard, label: 'Sistem Pembayaran', value: 'Monitoring Otomatis', active: true },
        ]}
      />

      {!periodLoading && !activePeriod && (
        <NoActiveWaveBanner message="Tidak ada periode yang aktif saat ini. Aktifkan periode terlebih dahulu untuk memantau pembayaran tahap 2." />
      )}

      {/* Murni Monitoring Tagihan & Cicilan */}
      <Stage2BillsMonitoring />
    </div>
  )
}
