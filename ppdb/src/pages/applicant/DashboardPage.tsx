import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Clock, FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import * as api from '../../api/client'
import { useToast } from '@/components/Toast'

export default function ApplicantDashboardPage() {
  const { toast } = useToast()
  
  const [applicant, setApplicant] = useState<any>(null)
  const [transaction, setTransaction] = useState<any>(null)
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMyData = async () => {
      try {
        const res = await api.apiFetch<any>('/payment/my-transaction')
        setApplicant(res.applicant)
        setTransaction(res.transaction)
        
        // Auto expand step based on status
        if (res.applicant?.status === 'document_uploaded_pending') {
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

  const requiredDocs = [
    'Ijazah atau SKL',
    'Akta Kelahiran',
    'Kartu Keluarga (KK)',
    'KTP Orang Tua/Wali',
    'Buku Rapor',
    'Pas Foto',
    'Surat Pernyataan Orang Tua',
    'Medical Checkup'
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
          <p className="text-sm text-muted-foreground">
            Silakan lengkapi dokumen berikut. Format yang didukung: PDF, JPG, PNG (Maks 2MB per file).
          </p>
          <div className="grid gap-3">
            {requiredDocs.map((doc, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc}</p>
                    <p className="text-xs text-muted-foreground">Belum diunggah</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-2">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button disabled>Kirim Dokumen untuk Verifikasi</Button>
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

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
        
        {steps.map((step) => {
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active' || step.status === 'pending'
          const isLocked = step.status === 'locked'
          const isExpanded = expandedStep === step.number

          let iconBg = 'bg-muted border-muted-foreground/30 text-muted-foreground'
          if (isCompleted) iconBg = 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
          if (isActive) iconBg = 'bg-blue-500 border-blue-600 text-white shadow-sm ring-4 ring-blue-500/20'

          return (
            <div key={step.number} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 bg-background shrink-0 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-0 md:ml-auto md:mr-auto">
                <div className={`flex items-center justify-center w-full h-full rounded-full transition-colors ${iconBg}`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{step.number}</span>}
                </div>
              </div>

              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-4 md:ml-0">
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
      
    </div>
  )
}
