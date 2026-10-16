import {
  captureElementToCanvas,
  exportCanvasesToPdf,
  downloadCanvasAsPng,
} from './exportDocUtils'

export async function downloadAssessmentDoc(
  element: HTMLElement,
  format: 'pdf' | 'image',
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (registrationNo || 'reg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  const baseFilename = `lembar-penilaian-${safeName}-${safeNo}`

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  })

  if (format === 'image') {
    downloadCanvasAsPng(canvas, baseFilename)
  } else {
    exportCanvasesToPdf([canvas], baseFilename, { orientation: 'portrait' })
  }
}
