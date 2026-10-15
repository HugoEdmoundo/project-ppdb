import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ApplicantsTable from './ApplicantsTable'

const applicant = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  full_name: 'Muhammad Abdul Rahman Al-Fatih',
  email: 'muhammad.abdul.rahman.alfatih@contoh-domain-panjang.sch.id',
  phone: '081234567890',
  registration_path: 'prestasi_beasiswa',
  wave_name: 'Gelombang 1 — 2026/2027',
  payment_status: 'paid',
  status: 'document_uploaded',
}

function renderTable(props: Partial<Parameters<typeof ApplicantsTable>[0]> = {}) {
  return render(
    <ApplicantsTable
      applicants={[applicant]}
      loading={false}
      hasActiveWave={true}
      showSelectionColumn
      {...props}
    />
  )
}

describe('ApplicantsTable — struktur & proporsi kolom', () => {
  it('menampilkan header ringkas yang tidak berhimpitan', () => {
    renderTable()
    for (const label of ['Pendaftar', 'Kontak', 'Jalur', 'Pembayaran', 'Dokumen', 'Seleksi']) {
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument()
    }
    // Header panjang lama "Jalur Pendaftaran" diganti label ringkas "Jalur".
    expect(screen.queryByRole('columnheader', { name: /jalur pendaftaran/i })).not.toBeInTheDocument()
  })

  it('memakai colgroup eksplisit berjumlah sama dengan kolom (dengan seleksi)', () => {
    const { container } = renderTable()
    expect(container.querySelectorAll('colgroup col')).toHaveLength(7)
  })

  it('memakai colgroup eksplisit berjumlah sama dengan kolom (tanpa seleksi)', () => {
    const { container } = renderTable({ showSelectionColumn: false })
    expect(container.querySelectorAll('colgroup col')).toHaveLength(6)
    expect(screen.queryByRole('columnheader', { name: 'Seleksi' })).not.toBeInTheDocument()
  })

  it('mengunci lebar tabel di layar besar dan menyediakan scroll minimum di layar kecil', () => {
    const { container } = renderTable()
    const table = container.querySelector('table')!
    expect(table.className).toContain('min-w-[880px]')
    expect(table.className).toContain('xl:table-fixed')
  })
})

describe('ApplicantsTable — keterbacaan data', () => {
  it('meringkas nama, email, dan WhatsApp dengan atribut title agar tetap utuh saat terpotong', () => {
    const { container } = renderTable()
    expect(screen.getByTitle(applicant.full_name)).toBeInTheDocument()
    expect(screen.getByTitle(applicant.email)).toBeInTheDocument()
    expect(screen.getByTitle(applicant.phone)).toBeInTheDocument()
    expect(container.querySelectorAll('.truncate').length).toBeGreaterThanOrEqual(3)
  })

  it('menampilkan jalur pendaftaran sebagai label yang dirapikan, bukan snake_case mentah', () => {
    renderTable()
    expect(screen.getByText('Prestasi Beasiswa')).toBeInTheDocument()
    expect(screen.queryByText('prestasi_beasiswa')).not.toBeInTheDocument()
  })

  it('menampilkan status pembayaran, dokumen, dan seleksi secara konsisten', () => {
    renderTable()
    expect(screen.getByText('Lunas')).toBeInTheDocument()
    expect(screen.getByText('Menunggu')).toBeInTheDocument()
    // Dokumen menunggu verifikasi: label ringkas tapi info lengkap tetap ada lewat title.
    expect(screen.getByTitle('Menunggu Verifikasi')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('ApplicantsTable — fungsi tetap berjalan', () => {
  it('memanggil onRowClick saat baris diklik', () => {
    const onRowClick = vi.fn()
    renderTable({ onRowClick })
    fireEvent.click(screen.getByText(applicant.full_name))
    expect(onRowClick).toHaveBeenCalledWith(applicant)
  })

  it('menampilkan empty state saat tidak ada pendaftar', () => {
    renderTable({ applicants: [] })
    expect(screen.getByText('Belum Ada Pendaftar')).toBeInTheDocument()
  })

  it('menampilkan state gelombang tidak aktif', () => {
    renderTable({ applicants: [], hasActiveWave: false })
    expect(screen.getByText('Tidak Ada Gelombang Aktif')).toBeInTheDocument()
  })

  it('menampilkan skeleton saat loading', () => {
    const { container } = renderTable({ applicants: [], loading: true })
    expect(container.querySelectorAll('tbody tr').length).toBe(6)
  })
})
