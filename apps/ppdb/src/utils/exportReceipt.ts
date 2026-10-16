import {
  captureElementToCanvas,
  downloadCanvasAsPng,
  waitForDocumentAssets,
} from './exportDocUtils'
import { jsPDF } from 'jspdf'

function getSafeFilename(applicantName: string, receiptNo?: string): string {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (receiptNo || 'kuitansi')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  return `kuitansi-resmi-${safeName}-${safeNo}`
}

export async function downloadReceiptPdf(
  element: HTMLElement,
  applicantName: string,
  receiptNo?: string
): Promise<void> {
  await waitForDocumentAssets(element)
  const baseFilename = getSafeFilename(applicantName, receiptNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')

  // Standar format resmi A4 Portrait (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // Tempatkan kuitansi secara proporsional dengan margin fisik yang rapi (15mm samping)
  const marginX = 15
  const printableWidth = 210 - marginX * 2
  const imgHeight = (canvas.height * printableWidth) / canvas.width

  // Posisikan di tengah vertikal bila muat, atau gunakan margin atas bila tinggi
  const marginY = imgHeight <= 267 ? Math.max(15, (297 - imgHeight) / 2) : 15

  pdf.addImage(imgData, 'PNG', marginX, marginY, printableWidth, Math.min(imgHeight, 267), undefined, 'FAST')
  pdf.save(`${baseFilename}.pdf`)
}

export async function downloadReceiptImage(
  element: HTMLElement,
  applicantName: string,
  receiptNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, receiptNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  downloadCanvasAsPng(canvas, baseFilename)
}
