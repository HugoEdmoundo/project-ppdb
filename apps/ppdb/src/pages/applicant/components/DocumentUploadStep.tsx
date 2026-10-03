import { useState } from 'react'
import { CheckCircle, FileText, Upload } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { REQUIRED_DOCUMENTS } from '@/constants/documents'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'

interface DocumentUploadStepProps {
  applicant: any
  documents: any[]
  requiredDocuments?: any[]
  onDocumentsChange: (docs: any[]) => void
  onSubmitRequest: () => void
}

export default function DocumentUploadStep({ applicant, documents, requiredDocuments, onDocumentsChange, onSubmitRequest }: DocumentUploadStepProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState<string | null>(null)

  const handleUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 2MB')
      e.target.value = ''
      return
    }

    setUploading(docType)
    const formData = new FormData()
    formData.append('doc_type', docType)
    formData.append('file', file)

    try {
      await api.apiFetch<any>('/ppdb/documents/upload', {
        method: 'POST',
        body: formData
      })
      toast('success', 'Dokumen berhasil diunggah')
      const docsRes = await api.apiFetch<any>('/ppdb/documents')
      onDocumentsChange(docsRes.data || [])
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunggah dokumen')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const activeDocuments = requiredDocuments && requiredDocuments.length > 0 ? requiredDocuments : REQUIRED_DOCUMENTS

  return (
    <div className="space-y-4">
      {applicant?.status === 'document_rejected' && (
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-800">Dokumen Anda ditolak</p>
            <p className="text-sm text-red-700 mt-1">
              {applicant.rejection_reason ? (
                <>Alasan: <span className="font-medium">{applicant.rejection_reason}</span></>
              ) : (
                'Silakan periksa kembali dan unggah ulang dokumen Anda, lalu kirim ulang untuk diverifikasi.'
              )}
            </p>
          </CardContent>
        </Card>
      )}
      <p className="text-sm text-muted-foreground">
        Silakan lengkapi dokumen berikut. Format yang didukung: PDF, JPG, PNG (Maks 2MB per file).
      </p>
      <div className="grid gap-3">
        {activeDocuments.map((doc: any, idx: number) => {
          const uploaded = documents.find(d => d.entity_type === `ppdb_document:${doc.name}`)
          const isUploading = uploading === doc.name

          return (
            <Card key={idx} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {uploaded ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900">{doc.name}</p>
                      {uploaded ? (
                        <Badge variant="success" className="text-[10px] font-normal px-2 py-0 h-5">Terunggah</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 h-5 text-slate-500">Belum diunggah</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description || ''}</p>
                    {uploaded && (
                      <a href={uploaded.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1.5 inline-block font-medium">
                        Lihat dokumen
                      </a>
                    )}
                  </div>
                </div>
                <div className="shrink-0 relative">
                  <input 
                    type="file" 
                    id={`doc-upload-${idx}`} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                    accept=".jpg,.jpeg,.png,.pdf" 
                    onChange={(e) => handleUpload(doc.name, e)} 
                    disabled={isUploading || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)} 
                  />
                  <Button size="sm" variant={uploaded ? "outline" : "default"} className="w-full sm:w-auto gap-2 pointer-events-none" disabled={isUploading || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)}>
                    {isUploading ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : <Upload className="h-3.5 w-3.5" />}
                    {isUploading ? 'Uploading...' : uploaded ? 'Ganti File' : 'Upload File'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="flex justify-end pt-4">
        <Button
          disabled={documents.length < activeDocuments.length || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)}
          onClick={onSubmitRequest}
        >
          {applicant?.status === 'document_uploaded_pending' ? 'Kirim Dokumen untuk Verifikasi' :
           applicant?.status === 'document_rejected' ? 'Kirim Ulang Dokumen' :
           'Dokumen Sedang Diverifikasi'}
        </Button>
      </div>
    </div>
  )
}
