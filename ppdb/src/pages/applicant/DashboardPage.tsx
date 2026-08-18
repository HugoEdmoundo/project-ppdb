import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CheckCircle, Clock, FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import * as api from '../../api/client'
import { useToast } from '@/components/Toast'

export default function ApplicantDashboardPage() {
  const { toast } = useToast()
  
  const [applicant, setApplicant] = useState<any>(null)
  const [transaction, setTransaction] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchMyData = async () => {
      try {
        const [res, docsRes] = await Promise.all([
          api.apiFetch<any>('/payment/my-transaction'),
          api.apiFetch<any>('/ppdb/documents')
        ])
        setApplicant(res.applicant)
        setTransaction(res.transaction)
        setDocuments(docsRes.data || [])
        
        // Auto expand step based on status
        if (['document_uploaded_pending', 'document_rejected'].includes(res.applicant?.status)) {
          setExpandedStep(2)
        } else if (res.applicant?.status === 'selection') {
          setExpandedStep(3)
        }
      } catch (e: any) {
        toast('error', e.message || 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    fetchMyData()
  }, [])

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
      setDocuments(docsRes.data || [])
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunggah dokumen')
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleSubmitDocs = async () => {
    setShowSubmitConfirm(false)
    try {
      setSubmitting(true)
      await api.apiFetch('/ppdb/documents/submit', { method: 'POST' })
      toast('success', 'Dokumen berhasil dikirim untuk verifikasi')
      window.location.reload()
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengirim dokumen')
      setSubmitting(false)
    }
  }

  const requiredDocs = [
    { name: 'Ijazah atau SKL', description: 'Bukti kelulusan dari sekolah sebelumnya.' },
    { name: 'Akta Kelahiran', description: 'Bukti tanggal dan tempat lahir anak.' },
    { name: 'Kartu Keluarga (KK)', description: 'Bukti alamat tempat tinggal dan susunan keluarga.' },
    { name: 'KTP Orang Tua/Wali', description: 'Bukti identitas ayah, ibu, atau wali.' },
    { name: 'Buku Rapor', description: 'Nilai rapor dari semester awal sampai akhir.' },
    { name: 'Pas Foto', description: 'Foto terbaru calon siswa sesuai ukuran permintaan sekolah.' },
    { name: 'Surat Pernyataan Orang Tua', description: 'Surat tanda keabsahan data bermeterai.' },
    { name: 'Medical Checkup', description: 'Surat keterangan sehat atau hasil pemeriksaan medis dari Kemenkes atau klinik resmi.' }
  ]

  const toggleStep = (step: number) => {
    setExpandedStep(prev => prev === step ? 0 : step)
  }

  const steps = [
    {
      number: 1,
      title: 'Pembayaran Formulir',
      description: 'Menyelesaikan pembayaran pendaftaran PPDB.',
      status: applicant?.payment_status === 'paid' ? 'completed' : 'pending',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Pembayaran Berhasil
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">Metode Pembayaran</p>
                <p className="font-medium uppercase">{transaction?.method || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nominal</p>
                <p className="font-medium">Rp {transaction?.amount?.toLocaleString('id-ID') || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tanggal Pembayaran</p>
                <p className="font-medium">
                  {transaction?.updated_at ? new Date(transaction.updated_at).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">ID Transaksi</p>
                <p className="font-medium text-xs font-mono break-all">{transaction?.id || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      number: 2,
      title: 'Upload Dokumen Persyaratan',
      description: 'Mengunggah berkas-berkas yang dibutuhkan untuk verifikasi.',
      status: ['document_approved', 'selection', 'passed', 'failed'].includes(applicant?.status) ? 'completed' : 
              applicant?.payment_status === 'paid' ? 'active' : 'locked',
      content: (
        <div className="space-y-4">
          {applicant?.status === 'document_rejected' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Dokumen Anda ditolak</p>
              <p className="text-sm text-red-700 mt-1">
                {applicant.rejection_reason ? (
                  <>Alasan: {applicant.rejection_reason}</>
                ) : (
                  'Silakan periksa kembali dan unggah ulang dokumen Anda, lalu kirim ulang untuk diverifikasi.'
                )}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Silakan lengkapi dokumen berikut. Format yang didukung: PDF, JPG, PNG (Maks 2MB per file).
          </p>
          <div className="grid gap-3">
            {requiredDocs.map((doc, idx) => {
              const uploaded = documents.find(d => d.entity_type === `ppdb_document:${doc.name}`)
              const isUploading = uploading === doc.name
              
              return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                    {uploaded ? <CheckCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{doc.name}</p>
                      {uploaded ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] font-normal px-1.5 py-0 h-4 border-emerald-200">Terunggah</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-4">Belum diunggah</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                    {uploaded && <a href={uploaded.public_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">Lihat dokumen</a>}
                  </div>
                </div>
                <div className="shrink-0 relative">
                  <input type="file" id={`doc-upload-${idx}`} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleUpload(doc.name, e)} disabled={isUploading || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)} />
                  <Button size="sm" variant={uploaded ? "outline" : "default"} className="gap-2 pointer-events-none" disabled={isUploading || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)}>
                    {isUploading ? <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : <Upload className="h-3.5 w-3.5" />} 
                    {isUploading ? 'Uploading...' : uploaded ? 'Ganti File' : 'Upload'}
                  </Button>
                </div>
              </div>
              )
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button 
              disabled={documents.length < requiredDocs.length || !['document_uploaded_pending', 'document_rejected'].includes(applicant?.status)} 
              onClick={() => setShowSubmitConfirm(true)}
            >
              {applicant?.status === 'document_uploaded_pending' ? 'Kirim Dokumen untuk Verifikasi' : 
               applicant?.status === 'document_rejected' ? 'Kirim Ulang Dokumen' : 
               'Dokumen Sedang Diverifikasi'}
            </Button>
          </div>
        </div>
      )
    },
    {
      number: 3,
      title: 'Seleksi & Ujian',
      description: 'Mengikuti tahapan tes tertulis atau wawancara.',
      status: ['passed', 'failed'].includes(applicant?.status) ? 'completed' : 
              applicant?.status === 'selection' ? 'active' : 'locked',
      content: (
        <div className="p-6 border rounded-lg text-center bg-muted/10 space-y-3">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
          <h4 className="font-semibold text-foreground">Menunggu Jadwal Seleksi</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Jadwal seleksi belum tersedia. Kami akan memberitahu Anda melalui Email dan WhatsApp setelah panitia memverifikasi dokumen Anda.
          </p>
        </div>
      )
    },
    {
      number: 4,
      title: 'Pengumuman Hasil Akhir',
      description: 'Hasil kelulusan PPDB.',
      status: applicant?.status === 'passed' ? 'completed' : 
              applicant?.status === 'failed' ? 'completed' : 'locked',
      content: (
        <div className="p-6 border rounded-lg text-center bg-muted/10">
          <p className="text-muted-foreground text-sm">Belum ada pengumuman.</p>
        </div>
      )
    }
  ]

  if (loading) return <div className="p-8 text-center">Memuat dashboard...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Dashboard Pendaftar</h1>
        <p className="text-muted-foreground">
          Pantau progres pendaftaran Anda di bawah ini. Pastikan Anda menyelesaikan setiap tahapan yang masih aktif.
        </p>
      </div>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
        
        {steps.map((step) => {
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active' || step.status === 'pending'
          const isLocked = step.status === 'locked'
          const isExpanded = expandedStep === step.number

          let iconBg = 'bg-muted border-muted-foreground/30 text-muted-foreground'
          if (isCompleted) iconBg = 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
          if (isActive) iconBg = 'bg-blue-500 border-blue-600 text-white shadow-sm ring-4 ring-blue-500/20'

          return (
            <div key={step.number} className="relative flex items-center group is-active">
              
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 bg-background shrink-0 z-10 mr-4">
                <div className={`flex items-center justify-center w-full h-full rounded-full transition-colors ${iconBg}`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{step.number}</span>}
                </div>
              </div>

              <div className="w-[calc(100%-4rem)]">
                <Card 
                  className={`transition-all duration-200 ${isActive ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : isLocked ? 'opacity-70 grayscale-[50%]' : ''}`}
                >
                  <CardHeader 
                    className={`cursor-pointer p-4 ${isLocked ? 'cursor-not-allowed' : 'hover:bg-muted/50'}`}
                    onClick={() => !isLocked && toggleStep(step.number)}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <CardTitle className={`text-base ${isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : ''}`}>
                          {step.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {step.description}
                        </CardDescription>
                      </div>
                      {!isLocked && (
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  {isExpanded && !isLocked && (
                    <CardContent className="px-4 pb-4 pt-0 border-t mt-4 border-dashed">
                      <div className="pt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        {step.content}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          )
        })}

      </div>

      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmitDocs}
        loading={submitting}
        title="Kirim Dokumen"
        message="Apakah Anda yakin semua dokumen sudah benar? Dokumen yang sudah dikirim tidak bisa diubah kembali."
        confirmLabel="Ya, Kirim"
      />
    </div>
  )
}
