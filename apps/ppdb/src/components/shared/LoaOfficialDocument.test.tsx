import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoaOfficialDocument, { type LoaData } from './LoaOfficialDocument'

const mockLoaData: LoaData = {
  letter_number: 'LOA/PPDB/2026/001',
  registration_number: 'REG-2026-001',
  academic_year: '2026/2027',
  admission_officer: 'Ust. Wijaya Kurnia, M.Pd.',
  location: 'Bekasi',
  date_str: '17 Oktober 2026',
  applicant: {
    id: 'app-001',
    full_name: 'Ahmad Faiz Syamil',
    registration_path: 'Reguler',
    nisn: '1234567890',
    nik: '3275000000000001',
    previous_school: 'SMP Islam Terpadu',
    parent_name: 'Budi Santoso',
  },
  fee_items: [
    { name: 'Biaya Gedung & Sarana', nominal: 10000000, description: 'Fasilitas santri' },
    { name: 'SPP Bulan Juli', nominal: 1500000, description: 'SPP perdana' },
  ],
  total_fee: 11500000,
  minimum_dp: 3000000,
  deadline_lunas: '25 Oktober 2026',
  fixed_clause: 'Dana tidak dapat dikembalikan',
  is_graduated: true,
  is_loa_signed: false,
}

describe('LoaOfficialDocument — Presisi A4 & Konsistensi Layout', () => {
  it('menerapkan ukuran fisik standar A4 portrait (210mm x 297mm) pada setiap halaman', () => {
    const { container } = render(<LoaOfficialDocument data={mockLoaData} page="both" />)
    const pages = container.querySelectorAll<HTMLElement>('.loa-page')
    expect(pages).toHaveLength(2)

    pages.forEach((page) => {
      expect(page).toHaveClass('a4-document-page')
      expect(page.style.width).toBe('210mm')
      expect(page.style.minWidth).toBe('210mm')
      expect(page.style.maxWidth).toBe('210mm')
      expect(page.style.height).toBe('297mm')
      expect(page.style.minHeight).toBe('297mm')
      expect(page.style.paddingTop).toBe('7mm')
      expect(page.style.paddingRight).toBe('8mm')
      expect(page.style.paddingBottom).toBe('8mm')
      expect(page.style.paddingLeft).toBe('8mm')
    })
  })

  it('tidak menampilkan label teks VERIFIED DIGITAL PANITIA PPDB di samping QR code', () => {
    render(<LoaOfficialDocument data={mockLoaData} page="both" />)
    expect(screen.queryByText(/VERIFIED DIGITAL/i)).toBeNull()
    expect(screen.queryByText(/PANITIA PPDB/i)).toBeNull()
  })

  it('tidak menampilkan bulatan hitam angka 1 dan 2 pada Tata Cara Pembayaran', () => {
    const { container } = render(<LoaOfficialDocument data={mockLoaData} page={2} />)

    // Heading langkah pertama dan kedua harus ada
    expect(screen.getByText(/I\. LANGKAH PERTAMA/i)).toBeInTheDocument()
    expect(screen.getByText(/II\. LANGKAH KEDUA/i)).toBeInTheDocument()

    // Verifikasi bahwa TIDAK ADA badge rounded-full dengan teks 1 atau 2 di dalam heading
    const h3Elements = container.querySelectorAll('h3')
    h3Elements.forEach((h3) => {
      const circleBadge = h3.querySelector('.rounded-full')
      expect(circleBadge).toBeNull()
    })
  })

  it('menampilkan informasi santri, rincian biaya, dan kop resmi secara konsisten', () => {
    render(<LoaOfficialDocument data={mockLoaData} page={1} />)
    expect(screen.getByText('Ahmad Faiz Syamil')).toBeInTheDocument()
    expect(screen.getAllByText('REG-2026-001').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /LETTER OF ACCEPTANCE/i })).toBeInTheDocument()
  })
})
