import { CheckCircle } from 'lucide-react'
import { Card, CardContent } from "@/components/ui"

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export default function PaymentStep({ transaction }: { transaction: any }) {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-100 bg-emerald-50/30 shadow-sm">
        <CardContent className="p-5">
          <h4 className="font-semibold mb-4 flex items-center gap-2 text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Pembayaran Berhasil
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Metode Pembayaran</p>
              <p className="font-medium uppercase">{transaction?.method || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Nominal</p>
              <p className="font-medium text-emerald-700">{formatRp(transaction?.amount || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Tanggal Pembayaran</p>
              <p className="font-medium">
                {transaction?.updated_at ? new Date(transaction.updated_at).toLocaleDateString('id-ID') : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">ID Transaksi</p>
              <p className="font-mono text-xs font-medium break-all">{transaction?.id || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
