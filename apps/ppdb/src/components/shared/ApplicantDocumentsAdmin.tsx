import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { FileText, Download, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
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
  piagam: 'Piagam Prestasi (Opsional)'
}

export default function ApplicantDocumentsAdmin({ applicantId, currentStatus, onVerified }: ApplicantDocumentsAdminProps) {
  const queryClient = useQueryClient()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-documents', applicantId],
    queryFn: async () => {
      const res = await apiFetch<{ data: DocumentItem[] }>(`/ppdb/applicants/${applicantId}/documents`)
      return res.data
    },
    enabled: !!applicantId
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: 'document_approved' | 'document_rejected', reason?: string }) => {
      return apiFetch(`/ppdb/applicants/${applicantId}/documents/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason })
      })
    },
    onSuccess: () => {
      toast.success('Status dokumen berhasil diubah')
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      setRejectModalOpen(false)
      setRejectReason('')
      if (onVerified) onVerified()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengubah status dokumen')
    }
  })

  const handleApprove = () => {
    if (confirm('Setujui semua dokumen dan lanjutkan pendaftar ke tahap berikutnya?')) {
      verifyMutation.mutate({ status: 'document_approved' })
    }
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    verifyMutation.mutate({ status: 'document_rejected', reason: rejectReason })
  }

  const isVerified = currentStatus === 'document_approved' || currentStatus === 'document_rejected'

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Memuat dokumen...</div>
  }

  const docs = data || []

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
          Pendaftar belum mengunggah dokumen apapun.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map(doc => (
            <Card key={doc.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{DOC_LABELS[doc.doc_type] || doc.doc_type}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{doc.original_name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{doc.doc_type}</Badge>
                </div>

                {doc.mime_type.startsWith('image/') ? (
                  <div className="h-32 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <img src={doc.public_url} alt={doc.doc_type} className="object-contain w-full h-full" />
                  </div>
                ) : (
                  <div className="h-32 bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">Bukan gambar</span>
                  </div>
                )}

                <Button asChild variant="secondary" size="sm" className="w-full h-8 text-xs">
                  <a href={doc.public_url} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Lihat/Unduh
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isVerified && docs.length > 0 && (
        <div className="flex items-center gap-3 pt-4 border-t mt-6">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={verifyMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Approve Semua
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setRejectModalOpen(true)}
            disabled={verifyMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" /> Reject dengan Catatan
          </Button>
        </div>
      )}

      {isVerified && (
         <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between border">
           <span className="text-sm">Status Dokumen: <strong className={currentStatus === 'document_approved' ? 'text-green-600' : 'text-red-600'}>{currentStatus === 'document_approved' ? 'Disetujui' : 'Ditolak'}</strong></span>
         </div>
      )}

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Dokumen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Alasan Penolakan (akan dikirim via WA)</label>
            <Textarea
              placeholder="Contoh: Dokumen KK kurang jelas, mohon foto ulang..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={verifyMutation.isPending || !rejectReason.trim()}>
              Kirim Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
