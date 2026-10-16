import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import { Printer, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { downloadReceiptPdf, downloadReceiptImage } from '@/utils/exportReceipt'

interface OfficialReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: ReceiptData | null
}

export default function OfficialReceiptModal({ open, onOpenChange, receipt }: OfficialReceiptModalProps) {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)

  if (!receipt) return null

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return
    try {
      setIsDownloading('pdf')
      await downloadReceiptPdf(cardRef.current, receipt.applicant_name, receipt.receipt_no)
      toast('success', 'Kuitansi resmi PDF (A4) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh kuitansi PDF')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    try {
      setIsDownloading('image')
      await downloadReceiptImage(cardRef.current, receipt.applicant_name, receipt.receipt_no)
      toast('success', 'Gambar kuitansi (PNG) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh gambar kuitansi')
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        <div className="relative">
          <div ref={cardRef}>
            <OfficialReceiptCard receipt={receipt} />
          </div>
          <div className="p-3 bg-white border-t rounded-b-2xl flex flex-col sm:flex-row justify-end gap-2 print:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!isDownloading}
                  className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer font-medium"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh Kuitansi</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={handleDownloadPdf}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="font-semibold">Unduh Dokumen PDF</div>
                    <div className="text-[10px] text-slate-500">Ukuran A4 Standar</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDownloadImage}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold">Unduh Gambar (PNG)</div>
                    <div className="text-[10px] text-slate-500">Resolusi Tinggi 2x</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Dokumen</span>
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
