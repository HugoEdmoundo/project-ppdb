import { useState } from 'react'
import * as api from '../../../api/client'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { Search, UserRoundSearch, Waves, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'

export default function DataPendaftarPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['applicants', searchQuery, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      qs.append('page', page.toString())
      qs.append('limit', limit.toString())
      
      const res = await api.apiFetch<{ data: Applicant[], total: number, active_wave: any }>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const hasActiveWave = data?.active_wave !== null && data?.active_wave !== undefined
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserRoundSearch className="h-6 w-6 text-primary" />
          Data Pendaftar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola data biodata lengkap calon santri yang telah mendaftar.
        </p>
      </div>

      {/* Banner tidak ada gelombang aktif */}
      {!loading && hasActiveWave === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Waves className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data pendaftar.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama / email..." 
              className="pl-9"
              value={searchInput}
              onChange={(e: any) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" className="shrink-0">Cari</Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Pendaftar</TableHead>
                <TableHead>Email / No. WA</TableHead>
                <TableHead>Gelombang</TableHead>
                <TableHead>Jalur / Jenjang</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead>Status Dokumen</TableHead>
                <TableHead>Status Seleksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows cols={7} rows={6} />
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <EmptyState
                      icon={hasActiveWave === false ? Waves : UserRoundSearch}
                      title={hasActiveWave === false ? "Tidak Ada Gelombang Aktif" : "Belum Ada Pendaftar"}
                      description={
                        hasActiveWave === false
                          ? "Aktifkan gelombang terlebih dahulu untuk menampilkan data."
                          : "Belum ada pendaftar yang sesuai kriteria pencarian."
                      }
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a: Applicant) => (
                  <TableRow 
                    key={a.id} 
                    onClick={() => setSelectedApplicant(a)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">{a.full_name}</TableCell>
                    <TableCell className="text-sm">
                      {a.email} <br/>
                      <span className="text-muted-foreground">{a.phone}</span>
                    </TableCell>
                    <TableCell>{a.wave_name || '-'}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {a.registration_path} <br/>
                      <span className="font-medium">{a.registration_level}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.payment_status === 'paid' ? 'success' : a.payment_status === 'expired' ? 'destructive' : 'warning'}>
                        {a.payment_status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {['passed', 'failed', 'selection'].includes(a.status) ? 'DOCUMENT APPROVED' : a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.status === 'passed' ? (
                        <Badge variant="success">LULUS</Badge>
                      ) : a.status === 'failed' ? (
                        <Badge variant="destructive">TIDAK LULUS</Badge>
                      ) : a.status === 'selection' ? (
                        <Badge variant="warning">SELEKSI</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedApplicant} onOpenChange={(v) => !v && setSelectedApplicant(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pendaftar</DialogTitle>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                  <p className="font-medium">{selectedApplicant.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                  <Badge
                    variant={
                      selectedApplicant.payment_status === 'paid'
                        ? 'success'
                        : selectedApplicant.payment_status === 'expired'
                        ? 'destructive'
                        : 'warning'
                    }
                    className="mt-1"
                  >
                    {selectedApplicant.payment_status?.toUpperCase() || 'PENDING'}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{selectedApplicant.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">No. WhatsApp</p>
                  <p className="font-medium">{selectedApplicant.phone}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
                  <p className="font-medium capitalize">{selectedApplicant.registration_path}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Jenjang Tujuan</p>
                  <p className="font-medium">{selectedApplicant.registration_level}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p>
                  <p className="font-medium">{selectedApplicant.birth_place || '-'}, {selectedApplicant.birth_date || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                  <p className="font-medium">{selectedApplicant.gender === 'L' ? 'Laki-laki' : selectedApplicant.gender === 'P' ? 'Perempuan' : '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">NISN</p>
                  <p className="font-medium">{selectedApplicant.nisn || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NIK</p>
                  <p className="font-medium">{selectedApplicant.nik || '-'}</p>
                </div>

                <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Provinsi</p>
                      <p className="font-medium">{selectedApplicant.province || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kota/Kabupaten</p>
                      <p className="font-medium">{selectedApplicant.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kecamatan</p>
                      <p className="font-medium">{selectedApplicant.district || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kelurahan/Desa</p>
                      <p className="font-medium">{selectedApplicant.village || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kode Pos</p>
                      <p className="font-medium">{selectedApplicant.postal_code || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Alamat Detail</p>
                      <p className="font-medium">{selectedApplicant.address || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Nama Orang Tua/Wali</p>
                  <p className="font-medium">{selectedApplicant.parent_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Asal Sekolah</p>
                  <p className="font-medium">{selectedApplicant.previous_school || '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Gelombang</p>
                  <p className="font-medium">{selectedApplicant.wave_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                  <p className="font-medium">{new Date(selectedApplicant.created_at).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
