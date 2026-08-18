import { useState, useEffect } from 'react'
import * as api from '../../../api/client'
import { useToast } from '@/components/Toast'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eye, Search, GraduationCap, UserRoundSearch, FileCheck2, FileText, CheckCircle, XCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { Can } from '@/components/Permission'
import { TableSkeletonRows } from '@/components/ui/Skeleton'

export default function ApplicantsPage() {
  const { toast } = useToast()
  
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  
  // Document verification modal state
  const [verifyApplicant, setVerifyApplicant] = useState<any>(null)
  const [applicantDocs, setApplicantDocs] = useState<any[]>([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const fetchApplicants = async (q = search, status = statusFilter) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (q) qs.append('search', q)
      if (status && status !== 'all') qs.append('status', status)
      
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
    fetchApplicants(search, statusFilter)
  }

  const handleStatusChange = (val: string) => {
    setStatusFilter(val)
    fetchApplicants(search, val)
  }

  const openVerifyModal = async (applicant: any) => {
    setVerifyApplicant(applicant)
    setApplicantDocs([])
    setRejectionReason('')
    try {
      const res = await api.apiFetch<any>(`/ppdb/applicants/${applicant.id}/documents`)
      setApplicantDocs(res.data || [])
    } catch {
      toast('error', 'Gagal memuat dokumen')
    }
  }

  const handleVerify = async (status: 'document_approved' | 'document_rejected') => {
    if (status === 'document_rejected' && !rejectionReason.trim()) {
      toast('error', 'Alasan penolakan wajib diisi')
      return
    }
    
    setIsVerifying(true)
    try {
      await api.apiFetch(`/ppdb/applicants/${verifyApplicant.id}/documents/verify`, {
        method: 'PUT',
        body: JSON.stringify({ status, rejection_reason: rejectionReason })
      })
      toast('success', `Dokumen berhasil ${status === 'document_approved' ? 'disetujui' : 'ditolak'}`)
      setVerifyApplicant(null)
      fetchApplicants()
    } catch (e: any) {
      toast('error', e.message || 'Gagal memverifikasi dokumen')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-emerald-600" />
          Dokumen Pendaftar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifikasi dokumen kelengkapan calon santri yang telah mendaftar.
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
                <TableSkeletonRows cols={7} rows={6} />
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

                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Alamat</p>
                  <p className="font-medium">{selectedApplicant.address || '-'}</p>
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
      <Dialog open={!!verifyApplicant} onOpenChange={(v) => !v && setVerifyApplicant(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen Pendaftar</DialogTitle>
          </DialogHeader>
          
          {verifyApplicant && (
            <div className="space-y-6 pt-4">
              <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between border">
                <div>
                  <h4 className="font-medium">{verifyApplicant.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{verifyApplicant.registration_path} - {verifyApplicant.registration_level}</p>
                </div>
                <Badge variant="secondary">
                  {applicantDocs.length} Dokumen Terunggah
                </Badge>
              </div>

              <div className="grid gap-3">
                {applicantDocs.length === 0 ? (
                  <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
                    Belum ada dokumen yang diunggah
                  </div>
                ) : (
                  applicantDocs.map((doc, idx) => {
                    const docName = doc.entity_type.replace('ppdb_document:', '')
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{docName}</p>
                            <p className="text-xs text-muted-foreground">{(doc.size_bytes / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a href={doc.public_url} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                          Buka File
                        </a>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="pt-4 border-t space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alasan Penolakan (Wajib jika menolak)</label>
                  <Textarea 
                    placeholder="Contoh: KTP kurang jelas, mohon foto ulang dengan pencahayaan yang terang..."
                    value={rejectionReason}
                    onChange={(e: any) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="danger" onClick={() => handleVerify('document_rejected')} disabled={isVerifying || !rejectionReason.trim()}>
                    <XCircle className="h-4 w-4 mr-2" /> Tolak Dokumen
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleVerify('document_approved')} disabled={isVerifying}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Setujui Dokumen
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
