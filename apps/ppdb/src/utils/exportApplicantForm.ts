import {
  captureElementToCanvas,
  exportCanvasesToPdf,
  downloadCanvasAsPng,
} from './exportDocUtils'
import type { Applicant, HealthIdentificationData } from '@/types/ppdb'

export interface DownloadApplicantFormOptions {
  containerElement: HTMLElement
  format: 'pdf' | 'image'
  applicantName: string
  registrationNo?: string
  pageMode?: 1 | 2 | 'both'
}

function getSafeFilename(prefix: string, applicantName: string, registrationNo?: string): string {
  const safeName = (applicantName || 'santri')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
  const safeNo = (registrationNo || 'reg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
  return `${prefix}-${safeName}-${safeNo}`
}

export function parseHealthData(raw?: string | null): HealthIdentificationData | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null && ('chronic_disease' in parsed || 'emergency_contact_name' in parsed)) {
      return parsed as HealthIdentificationData
    }
  } catch {
    // bukan JSON valid
  }
  return null
}

export function formatHealthSummary(raw?: string | null): string {
  const parsed = parseHealthData(raw)
  if (!parsed) {
    return raw?.trim() ? raw.trim() : 'Tidak ada catatan kesehatan'
  }
  const notes: string[] = []
  if (parsed.chronic_disease) {
    notes.push(`Kronis: ${parsed.chronic_disease_description || 'Ya'}`)
  }
  if (parsed.allergies) {
    const list = parsed.allergy_types?.join(', ') || ''
    notes.push(`Alergi: ${list || 'Ya'}${parsed.allergy_description ? ` (${parsed.allergy_description})` : ''}`)
  }
  if (parsed.diagnosed_conditions && parsed.diagnosed_conditions.length > 0) {
    notes.push(`Diagnosis: ${parsed.diagnosed_conditions.join(', ')}`)
  }
  if (parsed.regular_medication) {
    notes.push(`Obat Rutin: ${parsed.regular_medication_description || 'Ya'}`)
  }
  if (parsed.physical_limitation) {
    notes.push(`Fisik: ${parsed.physical_limitation_description || 'Ada keterbatasan'}`)
  }
  if (parsed.hospitalization_history) {
    notes.push(`Rawat Inap: ${parsed.hospitalization_history_description || 'Ya'}`)
  }
  if (parsed.special_needs) {
    notes.push(`Khusus: ${parsed.special_needs_description || 'Ya'}`)
  }
  return notes.length > 0 ? notes.join('; ') : 'Kondisi Sehat (Tidak ada riwayat penyakit/alergi khusus)'
}

export async function downloadApplicantFormPdf(
  pageElements: HTMLElement[],
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename('formulir-pendaftaran', applicantName, registrationNo)
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

export async function downloadApplicantFormImage(
  pageElement: HTMLElement,
  pageNo: number,
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  const baseFilename = getSafeFilename('formulir-pendaftaran', applicantName, registrationNo)
  const canvas = await captureElementToCanvas(pageElement, {
    scale: 2,
    backgroundColor: '#ffffff',
  })
  downloadCanvasAsPng(canvas, `${baseFilename}-hal${pageNo}`)
}

export async function downloadAllApplicantFormImages(
  pageElements: HTMLElement[],
  applicantName: string,
  registrationNo?: string
): Promise<void> {
  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i]
    const pageNumAttr = pageEl.getAttribute('data-page')
    const pageNo = pageNumAttr ? parseInt(pageNumAttr, 10) : i + 1
    await downloadApplicantFormImage(pageEl, pageNo, applicantName, registrationNo)
    if (i < pageElements.length - 1) {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
}

export async function downloadApplicantFormDoc({
  containerElement,
  format,
  applicantName,
  registrationNo,
  pageMode = 'both',
}: DownloadApplicantFormOptions): Promise<void> {
  let allPages = Array.from(
    containerElement.querySelectorAll<HTMLElement>('.applicant-form-page')
  )

  if (allPages.length === 0) {
    allPages = [containerElement]
  }

  let targetPages: HTMLElement[] = []
  if (pageMode === 1) {
    targetPages = allPages.filter((el) => el.getAttribute('data-page') === '1')
  } else if (pageMode === 2) {
    targetPages = allPages.filter((el) => el.getAttribute('data-page') === '2')
  }

  if (targetPages.length === 0) {
    targetPages = allPages
  }

  if (format === 'image') {
    if (targetPages.length === 1) {
      const pageNumAttr = targetPages[0].getAttribute('data-page')
      const pageNo = pageNumAttr ? parseInt(pageNumAttr, 10) : (pageMode === 2 ? 2 : 1)
      await downloadApplicantFormImage(targetPages[0], pageNo, applicantName, registrationNo)
    } else {
      await downloadAllApplicantFormImages(targetPages, applicantName, registrationNo)
    }
  } else {
    await downloadApplicantFormPdf(targetPages, applicantName, registrationNo)
  }
}

/**
 * Ekspor semua data pendaftar ke dokumen Microsoft Word (.doc) lengkap dengan kop resmi,
 * metadata, ringkasan pendaftaran, tabel komprehensif seluruh data formulir, dan kolom tanda tangan.
 */
export function exportAllApplicantsToWord(
  applicants: (Applicant | any)[],
  periodName: string = 'Periode Aktif',
  committeeHead: string = 'Ust. Wijaya Kurnia, M.Pd.'
): void {
  const nowStr = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Ringkasan statistik
  const total = applicants.length
  const totalL = applicants.filter((a) => (a.gender || '').toUpperCase() === 'L').length
  const totalP = applicants.filter((a) => (a.gender || '').toUpperCase() === 'P').length
  const totalPaid = applicants.filter((a) => (a.payment_status || '').toLowerCase() === 'paid').length
  const totalPending = applicants.filter((a) => (a.payment_status || '').toLowerCase() === 'pending').length

  const rowsHtml = applicants
    .map((a, index) => {
      const no = index + 1
      const regId = a.nisn || a.nik || (a.id ? a.id.slice(0, 8).toUpperCase() : `REG-${no}`)
      const name = a.full_name || '-'
      const gender = a.gender === 'L' ? 'L' : a.gender === 'P' ? 'P' : '-'
      const ttl = [a.birth_place, a.birth_date].filter(Boolean).join(', ') || '-'
      const school = a.previous_school || '-'
      const path = (a.registration_path || '-').toUpperCase()
      const wave = a.wave_name || '-'
      const wa = a.phone || '-'
      const email = a.email || '-'
      
      const domisiliParts = [a.address, a.district, a.city, a.province].filter(Boolean)
      const domisili = domisiliParts.length > 0 ? domisiliParts.join(', ') : '-'

      // Orang tua
      const ayah = [a.father_name || a.parent_name, a.father_job, a.father_phone || a.parent_phone].filter(Boolean).join(' | ')
      const ibu = [a.mother_name, a.mother_job, a.mother_phone].filter(Boolean).join(' | ')
      const wali = a.guardian_name ? [a.guardian_name, a.guardian_job, a.guardian_phone].filter(Boolean).join(' | ') : ''
      const parentInfo = [ayah ? `Ayah: ${ayah}` : '', ibu ? `Ibu: ${ibu}` : '', wali ? `Wali: ${wali}` : ''].filter(Boolean).join('<br/>') || '-'

      // Kesehatan
      const healthSummary = formatHealthSummary(a.disease_history)
      const healthData = parseHealthData(a.disease_history)
      const emergencyContact = healthData?.emergency_contact_name
        ? `${healthData.emergency_contact_name} (${healthData.emergency_contact_relation || 'Kontak'}: ${healthData.emergency_contact_phone || '-'})`
        : '-'

      // Status
      const isPaid = (a.payment_status || '').toLowerCase() === 'paid'
      const payStatusText = isPaid ? 'LUNAS' : (a.payment_status || 'PENDING').toUpperCase()
      const payStatusClass = isPaid ? 'badge-paid' : 'badge-pending'
      const createdDate = a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'

      return `
        <tr>
          <td style="text-align: center; vertical-align: top;">${no}</td>
          <td style="font-family: monospace; font-weight: bold; vertical-align: top;">${regId}</td>
          <td style="font-weight: bold; word-break: break-word; vertical-align: top;">${name}</td>
          <td style="text-align: center; vertical-align: top;">${gender}</td>
          <td style="vertical-align: top;">${ttl}</td>
          <td style="vertical-align: top;">${school}</td>
          <td style="vertical-align: top;">${path}</td>
          <td style="vertical-align: top;">${wave}</td>
          <td style="vertical-align: top;">${wa}<br/><small style="color: #64748b;">${email}</small></td>
          <td style="vertical-align: top;">${domisili}</td>
          <td style="vertical-align: top;">${parentInfo}</td>
          <td style="vertical-align: top; font-size: 7.5pt;">${healthSummary}<br/><small style="color: #065f46;">Darurat: ${emergencyContact}</small></td>
          <td style="text-align: center; vertical-align: top;">
            <span class="badge ${payStatusClass}">${payStatusText}</span>
          </td>
          <td style="text-align: center; vertical-align: top;">${createdDate}</td>
        </tr>
      `
    })
    .join('')

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Rekapitulasi Data Formulir Pendaftar PPDB Ar-Rahman - ${periodName}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 841.9pt 595.3pt; /* A4 Landscape (297mm x 210mm) */
          mso-page-orientation: landscape;
          margin: 15mm 12mm 15mm 12mm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 8.5pt;
          color: #0f172a;
          line-height: 1.3;
        }
        .header-table {
          width: 100%;
          border-bottom: 2.5pt solid #065f46;
          margin-bottom: 12pt;
          padding-bottom: 8pt;
        }
        .inst-title {
          font-size: 14pt;
          font-weight: bold;
          color: #065f46;
          text-transform: uppercase;
          margin: 0;
        }
        .inst-subtitle {
          font-size: 10pt;
          font-weight: bold;
          color: #047857;
          text-transform: uppercase;
          margin: 2pt 0 0 0;
        }
        .inst-meta {
          font-size: 8pt;
          color: #475569;
          margin: 3pt 0 0 0;
        }
        .doc-title {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
          margin: 10pt 0 4pt 0;
        }
        .doc-period {
          font-size: 9.5pt;
          text-align: center;
          font-weight: bold;
          color: #047857;
          margin: 0 0 12pt 0;
        }
        .summary-table {
          width: 100%;
          margin-bottom: 12pt;
          background-color: #f8fafc;
          border: 1pt solid #cbd5e1;
        }
        .summary-table td {
          padding: 6pt 10pt;
          font-size: 8.5pt;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16pt;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        .data-table th {
          background-color: #065f46;
          color: #ffffff;
          font-weight: bold;
          padding: 6pt 5pt;
          border: 1pt solid #047857;
          font-size: 8pt;
          text-align: left;
        }
        .data-table td {
          padding: 5pt 5pt;
          border: 1pt solid #cbd5e1;
          font-size: 7.5pt;
          vertical-align: top;
        }
        .data-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          padding: 2pt 5pt;
          font-size: 7pt;
          font-weight: bold;
          border-radius: 3pt;
        }
        .badge-paid {
          background-color: #d1fae5;
          color: #065f46;
          border: 1pt solid #a7f3d0;
        }
        .badge-pending {
          background-color: #fef3c7;
          color: #92400e;
          border: 1pt solid #fde68a;
        }
        .signature-table {
          width: 100%;
          margin-top: 20pt;
          page-break-inside: avoid;
        }
        .signature-table td {
          padding: 4pt;
          vertical-align: top;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Kop Lembaga Resmi -->
        <table class="header-table" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="text-align: center;">
              <div class="inst-title">PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN</div>
              <div class="inst-subtitle">PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)</div>
              <div class="inst-meta">
                Rukan Hexa Green Kalimalang, Jl. Inspeksi Kalimalang C8-C9, Jatimulya, Tambun Selatan, Bekasi 17510<br/>
                Website: www.ptdarrahman.sch.id &nbsp;|&nbsp; WhatsApp: 0815-1004-0999 &nbsp;|&nbsp; Email: info@ptdarrahman.sch.id
              </div>
            </td>
          </tr>
        </table>

        <!-- Judul Dokumen -->
        <div class="doc-title">REKAPITULASI DATA FORMULIR PENDAFTARAN CALON SANTRI BARU</div>
        <div class="doc-period">PERIODE: ${periodName.toUpperCase()} &nbsp;·&nbsp; WAKTU EKSPOR: ${nowStr}</div>

        <!-- Ringkasan Statistik -->
        <table class="summary-table" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td width="25%"><strong>Total Calon Santri:</strong> ${total} Orang</td>
            <td width="25%"><strong>Jenis Kelamin:</strong> Laki-laki: ${totalL} | Perempuan: ${totalP}</td>
            <td width="25%"><strong>Status Biaya Formulir:</strong> Lunas: ${totalPaid} | Pending: ${totalPending}</td>
            <td width="25%"><strong>Status Arsip:</strong> Dokumen Resmi Terverifikasi</td>
          </tr>
        </table>

        <!-- Tabel Data Lengkap -->
        <table class="data-table" border="1" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th width="3%" style="text-align: center;">No</th>
              <th width="8%">No. Registrasi</th>
              <th width="12%">Nama Calon Santri</th>
              <th width="3%" style="text-align: center;">L/P</th>
              <th width="9%">TTL</th>
              <th width="9%">Asal Sekolah</th>
              <th width="6%">Jalur</th>
              <th width="6%">Gelombang</th>
              <th width="9%">Kontak Santri</th>
              <th width="11%">Domisili</th>
              <th width="12%">Data Orang Tua / Wali</th>
              <th width="11%">Riwayat Kesehatan</th>
              <th width="5%" style="text-align: center;">Formulir</th>
              <th width="6%" style="text-align: center;">Tgl Daftar</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Lembar Pengesahan Panitia (Persis Format LoA) -->
        <table class="signature-table" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td width="60%"></td>
            <td width="40%" style="text-align: right;">
              <div style="font-size: 8pt; color: #475569;">Bekasi, ${nowStr.split(' pukul')[0]}</div>
              <div style="font-size: 8pt; color: #475569; margin-top: 2pt;">Hormat Kami,</div>
              <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-top: 1pt;">Office of Admission PPDB Ar-Rahman</div>
              <div style="margin: 6pt 0 4pt 0;">
                <table border="0" cellspacing="0" cellpadding="0" style="margin-left: auto;">
                  <tr>
                    <td style="border: 1pt solid #cbd5e1; padding: 4pt 8pt; background: #f0fdf4; border-radius: 4pt; text-align: center;">
                      <span style="font-family: monospace; font-size: 8pt; font-weight: bold; color: #065f46;">[ QR VERIFIKASI RESMI DIGITAL ]</span><br/>
                      <span style="font-size: 7pt; color: #047857; font-family: monospace;">VERIFIED DIGITAL · PANITIA PPDB</span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="font-size: 9.5pt; font-weight: bold; text-decoration: underline; color: #0f172a; margin-top: 4pt;">
                ${committeeHead}
              </div>
              <div style="font-size: 8pt; color: #64748b;">Ketua Panitia Seleksi PPDB</div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `

  const safePeriod = periodName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const filename = `rekapitulasi-formulir-pendaftar-${safePeriod || 'ppdb'}.doc`

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/msword;charset=utf-8',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Ekspor semua data pendaftar ke lembar cetak PDF (Lanskap Resmi)
 * menggunakan format vektor HTML Print Preview langsung ke dialog PDF browser.
 */
export function exportAllApplicantsToPdf(
  applicants: (Applicant | any)[],
  periodName: string = 'Periode Aktif',
  committeeHead: string = 'Ust. Wijaya Kurnia, M.Pd.'
): void {
  const nowStr = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const total = applicants.length
  const totalL = applicants.filter((a) => (a.gender || '').toUpperCase() === 'L').length
  const totalP = applicants.filter((a) => (a.gender || '').toUpperCase() === 'P').length
  const totalPaid = applicants.filter((a) => (a.payment_status || '').toLowerCase() === 'paid').length
  const totalPending = applicants.filter((a) => (a.payment_status || '').toLowerCase() === 'pending').length

  const rowsHtml = applicants
    .map((a, index) => {
      const no = index + 1
      const regId = a.nisn || a.nik || (a.id ? a.id.slice(0, 8).toUpperCase() : `REG-${no}`)
      const name = a.full_name || '-'
      const gender = a.gender === 'L' ? 'L' : a.gender === 'P' ? 'P' : '-'
      const ttl = [a.birth_place, a.birth_date].filter(Boolean).join(', ') || '-'
      const school = a.previous_school || '-'
      const path = (a.registration_path || '-').toUpperCase()
      const wave = a.wave_name || '-'
      const wa = a.phone || '-'
      const email = a.email || '-'

      const domisiliParts = [a.address, a.district, a.city, a.province].filter(Boolean)
      const domisili = domisiliParts.length > 0 ? domisiliParts.join(', ') : '-'

      const ayah = [a.father_name || a.parent_name, a.father_job, a.father_phone || a.parent_phone].filter(Boolean).join(' | ')
      const ibu = [a.mother_name, a.mother_job, a.mother_phone].filter(Boolean).join(' | ')
      const parentInfo = [ayah ? `Ayah: ${ayah}` : '', ibu ? `Ibu: ${ibu}` : ''].filter(Boolean).join('<br/>') || '-'

      const healthSummary = formatHealthSummary(a.disease_history)
      const isPaid = (a.payment_status || '').toLowerCase() === 'paid'
      const payStatusText = isPaid ? 'LUNAS' : (a.payment_status || 'PENDING').toUpperCase()
      const payColor = isPaid ? '#065f46' : '#92400e'
      const payBg = isPaid ? '#d1fae5' : '#fef3c7'
      const createdDate = a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'

      return `
        <tr>
          <td style="text-align: center;">${no}</td>
          <td style="font-family: monospace; font-weight: bold;">${regId}</td>
          <td style="font-weight: 600; word-break: break-word;">${name}</td>
          <td style="text-align: center;">${gender}</td>
          <td>${ttl}</td>
          <td>${school}</td>
          <td>${path}</td>
          <td>${wave}</td>
          <td>${wa}<br/><span style="color: #64748b; font-size: 7pt;">${email}</span></td>
          <td>${domisili}</td>
          <td>${parentInfo}</td>
          <td style="font-size: 7pt;">${healthSummary}</td>
          <td style="text-align: center;">
            <span style="background: ${payBg}; color: ${payColor}; padding: 2px 5px; border-radius: 4px; font-weight: bold; font-size: 7pt;">
              ${payStatusText}
            </span>
          </td>
          <td style="text-align: center;">${createdDate}</td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Mohon izinkan pop-up jendela untuk mencetak/mengunduh dokumen PDF.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Formulir Pendaftar PPDB - ${periodName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 8pt;
          color: #0f172a;
          line-height: 1.3;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #065f46;
          padding-bottom: 8px;
          margin-bottom: 12px;
          text-align: center;
        }
        .title {
          font-size: 13pt;
          font-weight: bold;
          color: #065f46;
          text-transform: uppercase;
          margin: 0;
        }
        .subtitle {
          font-size: 9pt;
          font-weight: bold;
          color: #047857;
          text-transform: uppercase;
          margin: 2px 0 0 0;
        }
        .meta {
          font-size: 7.5pt;
          color: #64748b;
          margin-top: 2px;
        }
        .doc-title {
          font-size: 11pt;
          font-weight: bold;
          text-align: center;
          margin: 6px 0 2px 0;
          text-transform: uppercase;
        }
        .doc-sub {
          font-size: 8.5pt;
          text-align: center;
          color: #047857;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .stats-box {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 8pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.5pt;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th {
          background-color: #065f46;
          color: #ffffff;
          font-weight: bold;
          padding: 5px 4px;
          border: 1px solid #047857;
          text-align: left;
        }
        td {
          padding: 4px 4px;
          border: 1px solid #cbd5e1;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .signature-section {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
        .signature-box {
          text-align: center;
          width: 250px;
          font-size: 8pt;
        }
        .signature-space {
          height: 55px;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; margin-bottom: 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; color: #166534; font-size: 9pt;">
          Lembar Cetak PDF Rekapitulasi Data Pendaftar PPDB (${total} Pendaftar)
        </span>
        <button onclick="window.print()" style="background: #065f46; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 9pt;">
          Cetak / Simpan ke PDF Sekarang
        </button>
      </div>

      <div class="header">
        <div class="title">PESANTREN TAHFIDZ QUR'AN DAN DIGITAL AR-RAHMAN</div>
        <div class="subtitle">PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)</div>
        <div class="meta">
          Rukan Hexa Green Kalimalang, Jl. Inspeksi Kalimalang C8-C9, Jatimulya, Tambun Selatan, Bekasi 17510 | info@ptdarrahman.sch.id
        </div>
      </div>

      <div class="doc-title">REKAPITULASI DATA FORMULIR PENDAFTARAN CALON SANTRI BARU</div>
      <div class="doc-sub">PERIODE: ${periodName.toUpperCase()} · WAKTU CETAK: ${nowStr}</div>

      <div class="stats-box">
        <div><strong>Total Pendaftar:</strong> ${total} Orang</div>
        <div><strong>Jenis Kelamin:</strong> Laki-laki: ${totalL} | Perempuan: ${totalP}</div>
        <div><strong>Status Formulir:</strong> Lunas: ${totalPaid} | Pending: ${totalPending}</div>
        <div><strong>Arsip:</strong> Dokumen Sah PPDB</div>
      </div>

      <table>
        <thead>
          <tr>
            <th width="3%" style="text-align: center;">No</th>
            <th width="8%">No. Registrasi</th>
            <th width="12%">Nama Calon Santri</th>
            <th width="3%" style="text-align: center;">L/P</th>
            <th width="9%">TTL</th>
            <th width="9%">Asal Sekolah</th>
            <th width="6%">Jalur</th>
            <th width="6%">Gelombang</th>
            <th width="9%">Kontak Santri</th>
            <th width="11%">Domisili</th>
            <th width="12%">Data Orang Tua / Wali</th>
            <th width="11%">Riwayat Kesehatan</th>
            <th width="5%" style="text-align: center;">Formulir</th>
            <th width="6%" style="text-align: center;">Tgl Daftar</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-section" style="margin-top: 25px; display: flex; justify-content: flex-end;">
        <div class="signature-box" style="text-align: right; width: 280px; font-size: 8pt;">
          <div style="color: #64748b;">Bekasi, ${nowStr.split(' pukul')[0]}</div>
          <div style="color: #64748b; margin-top: 2px;">Hormat Kami,</div>
          <div style="font-weight: bold; color: #0f172a; font-size: 9pt; margin-top: 1px;">Office of Admission PPDB Ar-Rahman</div>
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 6px 0;">
            <div style="border: 1px solid #cbd5e1; padding: 3px; border-radius: 4px; background: #ffffff;">
              <svg width="42" height="42" viewBox="0 0 33 33" shape-rendering="crispEdges">
                <rect width="33" height="33" fill="#ffffff"/>
                <path d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2zm7-2h1v3h-1zm2 0h2v1h-2zm3 0h1v1h-1zm2 0h1v2h-1zm2 0h1v1h-1zm2 0h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3zm-11 1h1v1h-1zm3 0h2v1h-2zm-5 1h1v1h-1zm6 0h1v1h-1zm-4 1h1v2h-1zm2 0h1v1h-1zm1 0h2v1h-2zm-3 1h1v1h-1zm5 0h1v2h-1zm-6 1h1v2h-1zm3 0h1v1h-1zm-8 2h1v1H0zm2 0h2v1H2zm3 0h1v2H5zm2 0h1v1H7zm2 0h1v1H9zm2 0h3v1h-3zm4 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm2 0h1v2h-1zm2 0h1v1h-1zm2 0h2v1h-2zm-19 1h1v2H6zm3 0h2v1H9zm3 0h1v2h-1zm3 0h2v1h-2zm3 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm2 0h1v2h-1zm-22 1h1v1H3zm4 0h1v1H7zm4 0h1v1h-1zm5 0h2v1h-2zm3 0h1v1h-1zm-18 1h1v1H1zm2 0h1v1H3zm2 0h1v1H5zm6 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm2 0h2v1h-2zm4 0h1v1h-1zm-17 1h1v2H2zm2 0h1v1H4zm3 0h2v1H7zm3 0h2v1h-2zm3 0h1v1h-1zm2 0h2v1h-2zm4 0h1v2h-1zm-14 1h1v1H5zm8 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm-19 1h1v2H0zm2 0h1v1H2zm3 0h1v1H5zm4 0h1v1H9zm2 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm3 0h2v1h-2zm3 0h1v1h-1zm2 0h1v1h-1zm1 0h2v1h-2zm-20 1h2v1H1zm4 0h1v1H5zm2 0h1v1H7zm3 0h1v1h-1zm4 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm-19 1h7v7H0zm1 1v5h5v-5zm1 1h3v3H2zm7-2h1v1h-1zm3 0h1v1h-1zm3 0h1v2h-1zm2 0h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm-15 1h1v1H9zm5 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm-10 1h1v1H9zm2 0h1v1h-1zm3 0h1v2h-1zm2 0h1v1h-1zm3 0h1v1h-1zm-9 1h1v2H8zm2 0h1v1h-1zm3 0h1v1h-1zm3 0h1v1h-1zm-8 1h1v1H7zm3 0h1v1h-1zm5 0h1v1h-1zm-7 1h1v1H8zm2 0h1v1h-1zm4 0h1v1h-1zm-6 1h2v1H8zm3 0h2v1h-2zm3 0h1v1h-1z" fill="#065f46"/>
              </svg>
            </div>
            <div style="text-align: right;">
              <span style="font-family: monospace; font-size: 7.5pt; font-weight: bold; color: #065f46; display: block;">VERIFIED DIGITAL</span>
              <span style="font-size: 6.5pt; color: #64748b; font-family: monospace; display: block;">PANITIA PPDB</span>
            </div>
          </div>
          <div style="font-weight: bold; text-decoration: underline; color: #0f172a; font-size: 9pt;">${committeeHead}</div>
          <div style="color: #64748b; font-size: 8pt;">Ketua Panitia Seleksi PPDB</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
