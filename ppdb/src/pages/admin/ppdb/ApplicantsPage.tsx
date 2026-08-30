import { useState, useEffect } from 'react'
import * as api from '../../../api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, GraduationCap, UserRoundSearch, FileText, CheckCircle, XCircle, Waves } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { TableSkeletonRows } from '@/components/ui/Skeleton'
import { REQUIRED_DOCUMENTS } from '@/constants/documents'

export default function ApplicantsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hasActiveWave, setHasActiveWave] = useState<boolean | null>(null)
  
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
      
      // Backend secara otomatis scope ke gelombang aktif.
      const res = await api.apiFetch<any>(`/ppdb/applicants?${qs.toString()}`)
      setApplicants(res.data || [])
      setHasActiveWave(res.active_wave !== null && res.active_wave !== undefined)
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

      {/* Banner tidak ada gelombang aktif */}
      {!loading && hasActiveWave === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Waves className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data dokumen pendaftar.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows cols={6} rows={6} />
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
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
                applicants.map((a) => (
                  <TableRow 
                    key={a.id} 
                    onClick={() => openVerifyModal(a)}
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
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


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
                {REQUIRED_DOCUMENTS.map((reqDoc, idx) => {
                  const uploaded = applicantDocs.find(d => d.entity_type === `ppdb_document:${reqDoc.name}`)
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg shadow-sm ${uploaded ? 'bg-white' : 'bg-muted/30 border-dashed'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${uploaded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${uploaded ? '' : 'text-muted-foreground'}`}>{reqDoc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {uploaded ? `${(uploaded.size_bytes / 1024).toFixed(1)} KB` : 'Belum diunggah'}
                          </p>
                        </div>
                      </div>
                      {uploaded ? (
                        <a href={uploaded.public_url} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                          Buka File
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">Kosong</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="pt-4 border-t space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alasan Penolakan (Wajib jika menolak)</label>
                  <Textarea 
                    placeholder="Contoh: KTP kurang jelas, mohon foto ulang dengan pencahayaan yang terang..."
                    value={rejectionReason}
                    onChange={(e: any) => setRejectionReason(e.target.value)}
                    rows={3}
                    disabled={!canCrud}
                  />
                </div>

                {canCrud && (
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="danger" onClick={() => handleVerify('document_rejected')} disabled={isVerifying || !rejectionReason.trim()}>
                      <XCircle className="h-4 w-4 mr-2" /> Tolak Dokumen
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleVerify('document_approved')} disabled={isVerifying}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Setujui Dokumen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
