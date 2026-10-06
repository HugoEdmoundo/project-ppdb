import { useState, useMemo } from 'react'
import { CheckCircle, FileText, Upload, AlertCircle, Info, Award, BookOpen, GraduationCap } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { getDocumentsForPath, type DocumentSpec } from '@/constants/documents'
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

  const regPath = (applicant?.registration_path || '').toLowerCase()
  const fallbackDocs = useMemo(() => getDocumentsForPath(regPath), [regPath])
  const activeDocuments: (DocumentSpec | any)[] = (requiredDocuments && requiredDocuments.length > 0)
    ? requiredDocuments
    : fallbackDocs

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
      toast('success', `Dokumen "${docType}" berhasil diunggah`)
      const docsRes = await api.apiFetch<any>('/ppdb/documents')
      onDocumentsChange(docsRes.data || [])
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunggah dokumen')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  // Identifikasi dokumen yang sudah diunggah
  const uploadedDocMap = useMemo(() => {
    const map = new Map<string, any>()
    documents.forEach((d) => {
      const type = d.doc_type || d.entity_type?.replace('ppdb_document:', '')
      if (type) map.set(type, d)
    })
    return map
  }, [documents])

  // Dokumen yang wajib untuk jalur ini
  const mandatoryDocs = useMemo(() => {
    return activeDocuments.filter((d: any) => d.required !== false)
  }, [activeDocuments])

  // Dokumen wajib yang masih kurang
  const missingMandatory = useMemo(() => {
    return mandatoryDocs.filter((d: any) => !uploadedDocMap.has(d.name))
  }, [mandatoryDocs, uploadedDocMap])

  const isPendingOrRejected = ['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)
  const canSubmit = missingMandatory.length === 0 && isPendingOrRejected

  // Header banner info khusus jalur
  const pathBanner = useMemo(() => {
    if (regPath.includes('prestasi')) {
      return {
        icon: Award,
        title: 'Jalur Prestasi (Non-TIU)',
        desc: 'Wajib mengunggah 4 dokumen utama + minimal 3 sertifikat prestasi kejuaraan/akademik (maksimal 10). Sertifikat ke-4 dan seterusnya bersifat opsional sebagai nilai tambah.',
        bg: 'bg-blue-50 border-blue-200 text-blue-900',
        iconColor: 'text-blue-600'
      }
    }
    if (regPath.includes('rapot') || regPath.includes('rapor') || regPath.includes('pindahan')) {
      return {
        icon: GraduationCap,
        title: 'Jalur Rapot (Non-TIU)',
        desc: 'Wajib mengunggah 4 dokumen utama + 4 rapor semester terakhir calon siswa.',
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        iconColor: 'text-amber-600'
      }
    }
    if (regPath.includes('tahfidz')) {
      return {
        icon: BookOpen,
        title: 'Jalur Tahfidz (Non-TIU)',
        desc: 'Wajib mengunggah 4 dokumen utama + minimal 1 surat keterangan/pengakuan hafalan (maksimal 3). Utamakan surat pernyataan/keterangan pengakuan hafalan resmi, bukan file rekaman video.',
        bg: 'bg-teal-50 border-teal-200 text-teal-900',
        iconColor: 'text-teal-600'
      }
    }
    return {
      icon: Info,
      title: 'Jalur Reguler (Tes TIU)',
      desc: 'Hanya perlu mengunggah 4 dokumen wajib utama. Seleksi kemampuan akademik akan dilakukan melalui Ujian TIU (Safe Exam Browser).',
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      iconColor: 'text-emerald-600'
    }
  }, [regPath])

  return (
    <div className="space-y-4">
      {/* Kartu Alasan Ditolak jika Status document_rejected */}
      {applicant?.status === 'document_rejected' && (
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" /> Dokumen Anda Ditolak / Perlu Revisi
            </p>
            <p className="text-sm text-red-700 mt-1">
              {applicant.rejection_reason ? (
                <>Alasan: <span className="font-medium">{applicant.rejection_reason}</span></>
              ) : (
                'Silakan periksa kembali dan unggah ulang dokumen yang diminta, lalu kirim ulang untuk diverifikasi.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Path Requirement Banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${pathBanner.bg}`}>
        <pathBanner.icon className={`w-5 h-5 shrink-0 mt-0.5 ${pathBanner.iconColor}`} />
        <div className="text-sm">
          <p className="font-semibold">{pathBanner.title}</p>
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{pathBanner.desc}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Format yang didukung: <strong>PDF, JPG, JPEG, PNG</strong> (Maksimal 2MB per file).
      </p>

      {/* Grid Dokumen Sesuai Jalur */}
      <div className="grid gap-3">
        {activeDocuments.map((doc: any, idx: number) => {
          const uploaded = uploadedDocMap.get(doc.name)
          const isUploading = uploading === doc.name
          const isMandatory = doc.required !== false

          return (
            <Card key={idx} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${uploaded ? 'bg-emerald-100 text-emerald-600' : isMandatory ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'}`}>
                    {uploaded ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-slate-900">{doc.name}</p>
                      {isMandatory ? (
                        <Badge variant="destructive" className="text-[10px] font-medium px-2 py-0 h-5">Wajib</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0 h-5 text-slate-600 bg-slate-100">Opsional</Badge>
                      )}
                      {uploaded ? (
                        <Badge variant="success" className="text-[10px] font-normal px-2 py-0 h-5">Terunggah</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 h-5 text-slate-500">Belum diunggah</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description || ''}</p>
                    {uploaded && (
                      <a href={uploaded.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1.5 inline-block font-medium">
                        Lihat dokumen terunggah
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
                    disabled={isUploading || !isPendingOrRejected}
                  />
                  <Button size="sm" variant={uploaded ? "outline" : "default"} className="w-full sm:w-auto gap-2 pointer-events-none" disabled={isUploading || !isPendingOrRejected}>
                    {isUploading ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : <Upload className="h-3.5 w-3.5" />}
                    {isUploading ? 'Mengunggah...' : uploaded ? 'Ganti File' : 'Upload File'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info Validasi Kelengkapan Dokumen */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
        <div className="text-xs">
          {missingMandatory.length > 0 ? (
            <span className="text-amber-700 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              Masih ada {missingMandatory.length} dokumen wajib yang belum diunggah: <strong>{missingMandatory.map(d => d.name).join(', ')}</strong>
            </span>
          ) : (
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              Seluruh dokumen wajib telah lengkap diunggah!
            </span>
          )}
        </div>

        <Button
          disabled={!canSubmit}
          onClick={onSubmitRequest}
          className="w-full sm:w-auto"
        >
          {applicant?.status === 'document_uploaded_pending' ? 'Kirim Dokumen untuk Verifikasi' :
           applicant?.status === 'document_rejected' ? 'Kirim Ulang Dokumen' :
           'Dokumen Sedang Diverifikasi'}
        </Button>
      </div>
    </div>
  )
}
