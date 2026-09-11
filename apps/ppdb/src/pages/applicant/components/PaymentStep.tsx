import { CheckCircle } from 'lucide-react'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export default function PaymentStep({ transaction }: { transaction: any }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg border">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Pembayaran Berhasil
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <p className="text-muted-foreground">Metode Pembayaran</p>
            <p className="font-medium uppercase">{transaction?.method || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nominal</p>
            <p className="font-medium">{formatRp(transaction?.amount || 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tanggal Pembayaran</p>
            <p className="font-medium">
              {transaction?.updated_at ? new Date(transaction.updated_at).toLocaleDateString('id-ID') : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">ID Transaksi</p>
            <p className="font-medium text-xs font-mono break-all">{transaction?.id || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
