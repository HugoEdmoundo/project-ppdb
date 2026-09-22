import { useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Card, CardContent } from "@/components/ui"
import { Button, buttonVariants } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { ArrowRight, Activity, Users, FileText, CheckCircle, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PaymentStatusBadge from '@/components/shared/PaymentStatusBadge'
import ApplicantsTable from '@/components/shared/ApplicantsTable'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'
import { REQUIRED_DOCUMENTS } from '@/constants/documents'

export default function ApplicantsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Document verification modal state
  const [verifyApplicant, setVerifyApplicant] = useState<any>(null)
  const [applicantDocs, setApplicantDocs] = useState<any[]>([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants', search, statusFilter, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (search) qs.append('search', search)
      if (statusFilter && statusFilter !== 'all') qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())

      // Backend secara otomatis scope ke gelombang aktif.
      const res = await api.apiFetch<any>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  // Ref untuk AbortController aktif — mencegah race condition saat dua klik
  // cepat berurutan bisa menampilkan dokumen applicant yang salah.
  const fetchDocsAbortRef = useRef<AbortController | null>(null)

  const fetchApplicantDocs = async (applicant: any) => {
    // Batalkan fetch sebelumnya jika masih berjalan
    if (fetchDocsAbortRef.current) {
      fetchDocsAbortRef.current.abort()
    }
    const controller = new AbortController()
    fetchDocsAbortRef.current = controller

    setVerifyApplicant(applicant)
    setApplicantDocs([])
    setRejectionReason('')
    try {
      const res = await api.apiFetch<any>(
        `/ppdb/applicants/${applicant.id}/documents`,
        { signal: controller.signal }
      )
      // Jangan update state jika request sudah di-abort (user klik applicant lain)
      if (!controller.signal.aborted) {
        setApplicantDocs(res.data || [])
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return // diabaikan — bukan error nyata
      toast('error', 'Gagal memuat dokumen')
    }
  }

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string, status: 'document_approved' | 'document_rejected', reason: string }) => {
      if (status === 'document_rejected' && !reason.trim()) {
        throw new Error('Alasan penolakan wajib diisi')
      }
      await api.apiFetch(`/ppdb/applicants/${id}/documents/verify`, {
        method: 'PUT',
        body: JSON.stringify({ status, rejection_reason: reason })
      })
    },
    onSuccess: (_, variables) => {
      toast('success', `Dokumen berhasil ${variables.status === 'document_approved' ? 'disetujui' : 'ditolak'}`)
      setVerifyApplicant(null)
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal memverifikasi dokumen')
  })

  const handleVerify = async (status: 'document_approved' | 'document_rejected') => {
    if (status === 'document_rejected' && !rejectionReason.trim()) {
      toast('error', 'Alasan penolakan wajib diisi')
      return
    }
    setIsVerifying(true)
    try {
      await verifyMutation.mutateAsync({ id: verifyApplicant.id, status, reason: rejectionReason })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleStatusChange = (val: string) => {
    setStatusFilter(val)
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Dokumen Pendaftar"
        description="Verifikasi dokumen kelengkapan calon santri yang telah mendaftar."
        loading={loading}
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveData?.name || 'Tidak ada', active: hasActiveWave, pulse: hasActiveWave },
          { icon: Users, label: 'Total Pendaftar', value: data?.total != null ? `${data.total} terdaftar` : '—', active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data dokumen pendaftar." />
      )}

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      >
        {!loading && (
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList className="inline-flex h-10 w-max rounded-full bg-slate-100/80 p-1">
              <TabsTrigger value="all" className="rounded-full text-xs sm:text-sm">Semua</TabsTrigger>
              <TabsTrigger value="document_uploaded" className="rounded-full text-xs sm:text-sm">Menunggu Verifikasi</TabsTrigger>
              <TabsTrigger value="document_approved" className="rounded-full text-xs sm:text-sm">Disetujui</TabsTrigger>
              <TabsTrigger value="document_rejected" className="rounded-full text-xs sm:text-sm">Ditolak</TabsTrigger>
              <TabsTrigger value="expired" className="rounded-full text-xs sm:text-sm">Expired</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </ToolbarCard>

      <Card>
        <CardContent className="p-0">
          <ApplicantsTable
            applicants={applicants}
            loading={loading}
            hasActiveWave={hasActiveWave}
            onRowClick={fetchApplicantDocs}
          />
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
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
                <PaymentStatusBadge status={verifyApplicant.payment_status} />
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
                    <Button variant="destructive" onClick={() => handleVerify('document_rejected')} disabled={isVerifying || !rejectionReason.trim()}>
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
