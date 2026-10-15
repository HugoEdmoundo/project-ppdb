import { Dialog, DialogContent, Button } from '@/components/ui'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'

interface OfficialReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: ReceiptData | null
}

export default function OfficialReceiptModal({ open, onOpenChange, receipt }: OfficialReceiptModalProps) {
  if (!receipt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
        <div className="relative">
          <OfficialReceiptCard receipt={receipt} />
          <div className="p-3 bg-white border-t rounded-b-2xl flex flex-col sm:flex-row justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto h-9 text-xs cursor-pointer"
            >
              Cetak Dokumen
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-9 text-xs bg-slate-800 text-white cursor-pointer hover:bg-slate-700"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
