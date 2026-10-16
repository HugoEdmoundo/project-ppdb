import {
  captureElementToCanvas,
  exportCanvasesToPdf,
  downloadCanvasAsPng,
} from './exportDocUtils'

function getSafeFilename(applicantName: string, registrationNo?: string): string {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (registrationNo || 'reg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  return `skd-kelulusan-${safeName}-${safeNo}`
}

export async function downloadSkdPdf(
  element: HTMLElement,
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, registrationNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#022c22', // emerald-950
  })

  exportCanvasesToPdf([canvas], baseFilename, { orientation: 'landscape' })
}

export async function downloadSkdImage(
  element: HTMLElement,
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, registrationNo)

  const canvas = await captureElementToCanvas(element, {
    scale: 2,
    backgroundColor: '#022c22',
  })

  downloadCanvasAsPng(canvas, baseFilename)
}
