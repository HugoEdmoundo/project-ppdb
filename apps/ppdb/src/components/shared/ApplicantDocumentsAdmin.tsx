import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Checkbox } from '@/components/ui'
import { FileText, Download, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui'
import { Textarea } from '@/components/ui'

interface DocumentItem {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  public_url: string
  doc_type: string
  created_at: string
}

interface ApplicantDocumentsAdminProps {
  applicantId: string
  currentStatus: string
  onVerified?: () => void
}

const DOC_LABELS: Record<string, string> = {
  kk: 'Kartu Keluarga',
  akta: 'Akta Kelahiran',
  foto: 'Pas Foto',
  ijazah: 'Ijazah / SKL',
  kip: 'KIP / KKS (Opsional)',
  piagam: 'Piagam Prestasi (Opsional)',
}

export default function ApplicantDocumentsAdmin({
  applicantId,
  currentStatus,
  onVerified,
}: ApplicantDocumentsAdminProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([])
  const [singleDocReject, setSingleDocReject] = useState<{ id: string; label: string; doc_type: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-documents', applicantId],
    queryFn: async () => {
      const res = await apiFetch<{ data: DocumentItem[] }>(`/ppdb/applicants/${applicantId}/documents`)
      return res.data
    },
    enabled: !!applicantId,
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: 'document_approved' | 'document_rejected'; reason?: string }) => {
      return apiFetch(`/ppdb/applicants/${applicantId}/documents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason }),
      })
    },
    onSuccess: () => {
      toast('success', 'Status verifikasi dokumen berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      queryClient.invalidateQueries({ queryKey: ['applicant-documents', applicantId] })
      setRejectModalOpen(false)
      setRejectReason('')
      setSelectedDocTypes([])
      setSingleDocReject(null)
      if (onVerified) onVerified()
    },
    onError: (err: any) => {
      toast('error', err?.message || 'Gagal mengubah status dokumen')
    },
  })

  const handleApproveAll = () => {
    if (confirm('Setujui SEMUA dokumen persyaratan pendaftar ini dan izinkan lanjut ke tahap seleksi ujian?')) {
      verifyMutation.mutate({ status: 'document_approved' })
    }
  }

  const openSingleReject = (doc: DocumentItem) => {
    const label = DOC_LABELS[doc.doc_type] || doc.doc_type
    setSingleDocReject({ id: doc.id, label, doc_type: doc.doc_type })
    setSelectedDocTypes([doc.doc_type])
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const openBulkReject = () => {
    setSingleDocReject(null)
    setSelectedDocTypes([])
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleToggleDocType = (docType: string) => {
    setSelectedDocTypes((prev) =>
      prev.includes(docType) ? prev.filter((t) => t !== docType) : [...prev, docType]
    )
  }

  const handleConfirmReject = () => {
    if (selectedDocTypes.length === 0) {
      toast('error', 'Pilih minimal satu dokumen spesifik yang ditolak.')
      return
    }

    if (!rejectReason.trim()) {
      toast('error', 'Tuliskan alasan penolakan/catatan revisi.')
      return
    }

    const docLabels = selectedDocTypes.map((dt) => DOC_LABELS[dt] || dt).join(', ')
    const formattedReason = `Dokumen yang perlu direvisi: ${docLabels}. Catatan: ${rejectReason.trim()}`

    verifyMutation.mutate({
      status: 'document_rejected',
      reason: formattedReason,
    })
  }

  const isVerified = currentStatus === 'document_approved' || currentStatus === 'document_rejected'
  const docs = data || []

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Memuat dokumen pendaftar...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>
            Verifikasi berkas wajib & tambahan calon santri. Dokumen yang ditolak akan otomatis memicu WhatsApp instruksi revisi.
          </span>
        </div>
        <Badge
          variant={
            currentStatus === 'document_approved'
              ? 'success'
              : currentStatus === 'document_rejected'
              ? 'destructive'
              : 'warning'
          }
          className="text-[10px] uppercase font-semibold"
        >
          {currentStatus === 'document_approved'
            ? 'Disetujui'
            : currentStatus === 'document_rejected'
            ? 'Ditolak (Perlu Revisi)'
            : 'Menunggu Verifikasi'}
        </Badge>
      </div>

      {/* Grid Dokumen 1 Modul */}
      {docs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
          Pendaftar belum mengunggah dokumen persyaratan apapun.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((doc) => {
            const isImage = doc.mime_type.startsWith('image/')
            const label = DOC_LABELS[doc.doc_type] || doc.doc_type

            return (
              <Card key={doc.id} className="overflow-hidden flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{doc.original_name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                      {doc.doc_type}
                    </Badge>
                  </div>

                  {/* Preview Foto / Berkas */}
                  {isImage ? (
                    <div className="h-36 bg-muted/60 rounded-md overflow-hidden flex items-center justify-center border">
                      <img src={doc.public_url} alt={label} className="object-contain w-full h-full" />
                    </div>
                  ) : (
                    <div className="h-36 bg-muted/40 rounded-md flex flex-col items-center justify-center text-muted-foreground border">
                      <FileText className="h-9 w-9 mb-1.5 opacity-50" />
                      <span className="text-xs">Format Dokumen / PDF</span>
                    </div>
                  )}

                  {/* Aksi Per Dokumen */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button asChild variant="secondary" size="sm" className="flex-1 h-8 text-xs">
                      <a href={doc.public_url} target="_blank" rel="noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                      </a>
                    </Button>
                    {!isVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        onClick={() => openSingleReject(doc)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak Ini
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Action Footer: Approve Semua atau Reject Dokumen Spesifik */}
      {!isVerified && docs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t mt-4">
          <Button
            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={handleApproveAll}
            disabled={verifyMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Approve Semua Dokumen
          </Button>

          <Button
            variant="destructive"
            className="w-full sm:flex-1"
            onClick={openBulkReject}
            disabled={verifyMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" /> Reject Dokumen Spesifik
          </Button>
        </div>
      )}

      {/* Dialog Reject Dokumen Spesifik */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              <span>
                {singleDocReject ? `Tolak ${singleDocReject.label}` : 'Pilih Dokumen yang Ditolak'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pendaftar akan menerima notifikasi WhatsApp resmi yang merinci dokumen mana yang harus diunggah ulang beserta alasan penolakan ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Checklist Dokumen Spesifik */}
            {!singleDocReject && docs.length > 0 && (
              <div>
                <label className="text-xs font-semibold block mb-2 text-foreground">
                  Pilih Dokumen yang Tidak Sesuai / Perlu Revisi:
                </label>
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  {docs.map((doc) => {
                    const label = DOC_LABELS[doc.doc_type] || doc.doc_type
                    const isChecked = selectedDocTypes.includes(doc.doc_type)

                    return (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2.5 text-xs cursor-pointer hover:text-foreground text-muted-foreground select-none"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleDocType(doc.doc_type)}
                        />
                        <span className={isChecked ? 'font-medium text-foreground' : ''}>
                          {label} ({doc.original_name})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Input Catatan / Alasan Penolakan */}
            <div>
              <label className="text-xs font-semibold block mb-1 text-foreground">
                Alasan Penolakan / Catatan Perbaikan:
              </label>
              <Textarea
                placeholder="Contoh: Foto dokumen buram, terpotong, atau tidak terbaca jelas. Mohon unggah ulang dokumen asli."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={verifyMutation.isPending || selectedDocTypes.length === 0 || !rejectReason.trim()}
              className="gap-1.5"
            >
              {verifyMutation.isPending ? 'Mengirim...' : 'Kirim Penolakan & Notif WA'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
