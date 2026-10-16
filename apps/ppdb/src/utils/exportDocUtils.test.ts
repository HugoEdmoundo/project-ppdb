import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportCanvasesToPdf,
  downloadCanvasAsPng,
  waitForDocumentAssets,
} from './exportDocUtils'

// Mock jsPDF
const mockSave = vi.fn()
const mockAddPage = vi.fn()
const mockAddImage = vi.fn()

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation((config) => ({
      ...config,
      addPage: mockAddPage,
      addImage: mockAddImage,
      save: mockSave,
    })),
  }
})

describe('exportDocUtils — Standard A4 & Multi-page PDF Export', () => {
  beforeEach(() => {
    mockSave.mockClear()
    mockAddPage.mockClear()
    mockAddImage.mockClear()
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockPngData')
  })

  it('mengekspor multiple canvas ke format A4 PDF dengan orientasi portrait secara presisi', () => {
    const canvas1 = document.createElement('canvas')
    canvas1.width = 1587
    canvas1.height = 2245

    const canvas2 = document.createElement('canvas')
    canvas2.width = 1587
    canvas2.height = 2245

    exportCanvasesToPdf([canvas1, canvas2], 'test-loa-document', { orientation: 'portrait' })

    // Halaman kedua harus memanggil addPage('a4', 'portrait')
    expect(mockAddPage).toHaveBeenCalledTimes(1)
    expect(mockAddPage).toHaveBeenCalledWith('a4', 'portrait')

    // Harus menambahkan 2 gambar dengan ukuran 210 x 297 mm secara lossless ('NONE')
    expect(mockAddImage).toHaveBeenCalledTimes(2)
    expect(mockAddImage).toHaveBeenNthCalledWith(1, 'data:image/png;base64,mockPngData', 'PNG', 0, 0, 210, 297, undefined, 'NONE')
    expect(mockAddImage).toHaveBeenNthCalledWith(2, 'data:image/png;base64,mockPngData', 'PNG', 0, 0, 210, 297, undefined, 'NONE')

    // Harus menyimpan dengan nama file yang benar
    expect(mockSave).toHaveBeenCalledWith('test-loa-document.pdf')
  })

  it('mengekspor canvas landscape ke format A4 PDF (297mm x 210mm) untuk sertifikat SKD', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 2245
    canvas.height = 1587

    exportCanvasesToPdf([canvas], 'test-skd-document', { orientation: 'landscape' })

    expect(mockAddImage).toHaveBeenCalledWith('data:image/png;base64,mockPngData', 'PNG', 0, 0, 297, 210, undefined, 'NONE')
    expect(mockSave).toHaveBeenCalledWith('test-skd-document.pdf')
  })

  it('mengunduh canvas sebagai file gambar PNG beresolusi tinggi', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    const clickSpy = vi.fn()
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    HTMLAnchorElement.prototype.click = clickSpy

    downloadCanvasAsPng(canvas, 'test-export-image')

    expect(appendSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
  })

  it('waitForDocumentAssets menyelesaikan penantian font dan gambar tanpa crash', async () => {
    const container = document.createElement('div')
    const img = document.createElement('img')
    container.appendChild(img)

    Object.defineProperty(img, 'complete', { value: true })
    Object.defineProperty(img, 'naturalWidth', { value: 100 })

    await expect(waitForDocumentAssets(container)).resolves.toBeUndefined()
  })
})
