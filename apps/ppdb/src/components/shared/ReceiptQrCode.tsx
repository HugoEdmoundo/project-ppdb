import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface ReceiptQrCodeProps {
  /** Nilai yang di-encode ke dalam QR (biasanya URL kuitansi publik). */
  value: string
  /** Ukuran sisi QR dalam piksel. */
  size?: number
  className?: string
}

/**
 * QR Code kuitansi yang benar-benar dapat dipindai.
 *
 * Sebelumnya kartu kuitansi hanya menampilkan ikon `QrCode` dari lucide-react —
 * itu gambar dekoratif tanpa data, jadi tidak akan pernah terbaca kamera.
 * Komponen ini meng-encode URL verifikasi publik (`/kuitansi/:id`) sehingga
 * pemindaian membuka halaman kuitansi resmi yang bisa diverifikasi keasliannya.
 *
 * `level="M"` dipilih sebagai keseimbangan ketahanan rusak vs kepadatan modul,
 * dan `marginSize={2}` menyisakan quiet zone agar tetap terbaca saat dicetak.
 */
export default function ReceiptQrCode({ value, size = 116, className }: ReceiptQrCodeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white p-2 ring-1 ring-slate-200 shadow-2xs',
        className
      )}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={1}
        bgColor="#ffffff"
        fgColor="#0f172a"
        className="block h-auto w-full max-w-full"
      />
    </div>
  )
}
