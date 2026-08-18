import { useState, useEffect } from 'react'
import * as api from '../../../api/client'
import { useToast } from '@/components/Toast'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eye, Search, UserRoundSearch, FileCheck2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Can } from '@/components/Permission'

export default function DataPendaftarPage() {
  const { toast } = useToast()
  
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchApplicants = async (q = search) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (q) qs.append('search', q)
      // fetch all applicants ignoring status filter for Data Pendaftar page
      const res = await api.apiFetch<any>(`/ppdb/applicants?${qs.toString()}`)
      setApplicants(res.data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat pendaftar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplicants()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchApplicants(search)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
  }

  const openVerifyModal = (applicant: any) => {
    setSelectedApplicant(applicant)
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

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama / email..." 
              className="pl-9"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full sm:w-auto overflow-x-auto">
            <TabsList className="inline-flex w-max sm:w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm">Semua</TabsTrigger>
              <TabsTrigger value="document_uploaded" className="text-xs sm:text-sm">Menunggu Verifikasi</TabsTrigger>
              <TabsTrigger value="document_approved" className="text-xs sm:text-sm">Disetujui</TabsTrigger>
              <TabsTrigger value="document_rejected" className="text-xs sm:text-sm">Ditolak</TabsTrigger>
              <TabsTrigger value="expired" className="text-xs sm:text-sm">Expired</TabsTrigger>
            </TabsList>
          </Tabs>
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <EmptyState
                      icon={UserRoundSearch}
                      title="Belum Ada Pendaftar"
                      description="Belum ada pendaftar yang sesuai kriteria pencarian."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a) => (
                  <TableRow key={a.id}>
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
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {a.status === 'document_uploaded' && (
                        <Can module="ppdb" level="crud">
                          <Button variant="outline" size="sm" onClick={() => openVerifyModal(a)} className="mr-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                            <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Periksa Dokumen
                          </Button>
                        </Can>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setSelectedApplicant(a)} title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedApplicant} onOpenChange={(v) => !v && setSelectedApplicant(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pendaftar</DialogTitle>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                  <p className="font-medium">{selectedApplicant.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                  <Badge variant={selectedApplicant.payment_status === 'paid' ? 'success' : 'warning'} className="mt-1">
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

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
                  <div className="grid grid-cols-2 gap-4">
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
