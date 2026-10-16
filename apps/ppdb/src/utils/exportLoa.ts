import {
  captureElementToCanvas,
  exportCanvasesToPdf,
  downloadCanvasAsPng,
} from './exportDocUtils'

export interface DownloadLoaOptions {
  containerElement: HTMLElement
  format: 'pdf' | 'image'
  applicantName: string
  registrationNo?: string
  pageMode?: 1 | 2 | 'both'
}

function getSafeFilename(applicantName: string, registrationNo?: string): string {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (registrationNo || 'reg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  return `letter-of-acceptance-${safeName}-${safeNo}`
}

export async function downloadLoaPdf(
  pageElements: HTMLElement[],
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, registrationNo)
  const canvases: HTMLCanvasElement[] = []

  for (const pageEl of pageElements) {
    const canvas = await captureElementToCanvas(pageEl, {
      scale: 2,
      backgroundColor: '#ffffff',
    })
    canvases.push(canvas)
  }

  exportCanvasesToPdf(canvases, baseFilename, { orientation: 'portrait' })
}

export async function downloadLoaImage(
  pageElement: HTMLElement,
  pageNo: number,
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename(applicantName, registrationNo)
  const canvas = await captureElementToCanvas(pageElement, {
    scale: 2,
    backgroundColor: '#ffffff',
  })
  downloadCanvasAsPng(canvas, `${baseFilename}-hal${pageNo}`)
}

export async function downloadAllLoaImages(
  pageElements: HTMLElement[],
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i]
    const pageNumAttr = pageEl.getAttribute('data-page')
    const pageNo = pageNumAttr ? parseInt(pageNumAttr, 10) : i + 1
    await downloadLoaImage(pageEl, pageNo, applicantName, registrationNo)
    if (i < pageElements.length - 1) {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
}

export async function downloadLoaDoc({
  containerElement,
  format,
  applicantName,
  registrationNo,
  pageMode,
}: DownloadLoaOptions): Promise<void> {
  let pageElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>('.loa-page')
  )

  if (pageElements.length === 0) {
    pageElements = [containerElement]
  }

  // Jika format gambar dan pengguna sedang melihat halaman tertentu (1 atau 2), ekspor hanya halaman tersebut
  if (format === 'image' && pageMode && pageMode !== 'both') {
    const filtered = pageElements.filter((el) => {
      const pageNumAttr = el.getAttribute('data-page')
      return pageNumAttr === String(pageMode)
    })
    if (filtered.length > 0) {
      pageElements = filtered
    }
  }

  if (format === 'image') {
    await downloadAllLoaImages(pageElements, applicantName, registrationNo)
  } else {
    await downloadLoaPdf(pageElements, applicantName, registrationNo)
  }
}

export async function shareLoaDoc({
  applicantName,
  registrationNo,
}: {
  applicantName: string
  registrationNo?: string
}): Promise<{ shared: boolean; method: 'native' | 'clipboard' }> {
  const safeNo = registrationNo || 'official'
  const shareUrl = `${window.location.origin}/loa/${safeNo}`
  const shareData = {
    title: `Letter of Acceptance (LoA) - ${applicantName}`,
    text: `Surat Resmi Penerimaan Calon Santri Baru (Letter of Acceptance) Pesantren Tahfidz Qur'an dan Digital Arrahman atas nama ${applicantName}.`,
    url: shareUrl,
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
      return { shared: true, method: 'native' }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' }
      }
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl)
    return { shared: true, method: 'clipboard' }
  }

  return { shared: false, method: 'clipboard' }
}
