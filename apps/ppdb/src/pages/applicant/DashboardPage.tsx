import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import {
  CheckCircle, ChevronDown, ChevronUp, Lock, Wallet, FileUp, ClipboardCheck, Trophy,
  type LucideIcon,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'
import TopBar from '@/components/shared/TopBar'
import ApplicantProfileModal from '@/components/shared/ApplicantProfileModal'
import SignaturePad from './components/SignaturePad'
import SupportFab from './components/SupportFab'
import PaymentStep from './components/PaymentStep'
import DocumentUploadStep from './components/DocumentUploadStep'
import SelectionStep from './components/SelectionStep'
import ResultStep from './components/ResultStep'
import { cn } from '@/lib/utils'

const STEP_ICONS: LucideIcon[] = [Wallet, FileUp, ClipboardCheck, Trophy]

const STATUS_LABEL: Record<string, string> = {
  registration: 'Terdaftar',
  document_uploaded: 'Dokumen Menunggu Review',
  document_uploaded_pending: 'Dokumen Menunggu Review',
  document_rejected: 'Dokumen Ditolak',
  document_approved: 'Dokumen Disetujui',
  selection: 'Tahap Seleksi',
  passed: 'LULUS ✓',
  failed: 'Tidak Lulus',
  expired: 'Kedaluwarsa',
}

const autoStepFor = (status: string | undefined) => {
  if (status === 'document_uploaded_pending' || status === 'document_rejected' || status === 'document_uploaded') return 2
  if (status === 'document_approved' || status === 'selection') return 3
  if (status === 'passed' || status === 'failed') return 4
  return 1
}

export default function ApplicantDashboardPage() {
  const { toast } = useToast()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [prevStatus, setPrevStatus] = useState<string | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const documentsQuery = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => apiFetch<any>('/ppdb/documents'),
  })

  const applicant = transactionQuery.data?.applicant
  const transaction = transactionQuery.data?.transaction
  const documents = documentsQuery.data?.data || []
  const status = applicant?.status
  const loading = transactionQuery.isLoading || documentsQuery.isLoading

  const inSelection = ['selection', 'passed', 'failed'].includes(status)
  const inResult = ['passed', 'failed'].includes(status)

  const selectionQuery = useQuery({
    queryKey: ['my-selection'],
    queryFn: async () => {
      const [resultRes, sessionRes] = await Promise.all([
        apiFetch<any>('/selection/applicants/me/results'),
        apiFetch<any>('/selection/applicants/me/sessions'),
      ])
      return {
        result: resultRes || null,
        session: sessionRes.session || null,
        availableSessions: sessionRes.available_sessions || [],
      }
    },
    enabled: inSelection,
  })

  const mouQuery = useQuery({
    queryKey: ['my-mou'],
    queryFn: async () => {
      const res = await apiFetch<any>('/ppdb/applicants/me/mou').catch(() => ({ mou: null }))
      return res?.mou || null
    },
    enabled: inResult,
  })

  const stage2Query = useQuery({
    queryKey: ['my-stage2-bills'],
    queryFn: async () => {
      const res = await apiFetch<any>('/payment/stage2/my-bills').catch(() => ({ bills: [], mou_signed: false }))
      return res?.bills || []
    },
    enabled: inResult,
  })

  const contactQuery = useQuery({
    queryKey: ['contact-info'],
    queryFn: () => apiFetch<any>('/companyprofile/contact-info'),
  })

  const contactInfo = contactQuery.data ?? null

  // Auto-expand step sesuai status terbaru (derived state, bukan effect).
  if (status && status !== prevStatus) {
    setPrevStatus(status)
    setExpandedStep(autoStepFor(status))
  }

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
    queryClient.invalidateQueries({ queryKey: ['my-documents'] })
    queryClient.invalidateQueries({ queryKey: ['my-selection'] })
    queryClient.invalidateQueries({ queryKey: ['my-mou'] })
    queryClient.invalidateQueries({ queryKey: ['my-stage2-bills'] })
  }

  const bookMutation = useMutation({
    mutationFn: (sessionId: string) => apiFetch('/selection/applicants/me/book', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
    onSuccess: () => {
      toast('success', 'Berhasil memilih jadwal ujian')
      refreshAll()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal memilih jadwal'),
  })

  const submitDocsMutation = useMutation({
    mutationFn: () => apiFetch('/ppdb/documents/submit', { method: 'POST' }),
    onSuccess: () => {
      toast('success', 'Dokumen berhasil dikirim untuk verifikasi')
      refreshAll()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal mengirim dokumen'),
    onSettled: () => setShowSubmitConfirm(false),
  })

  const signMouMutation = useMutation({
    mutationFn: (signatureData: string) => apiFetch('/ppdb/applicants/me/mou/sign', {
      method: 'POST',
      body: JSON.stringify({ signature_data: signatureData }),
    }),
    onSuccess: () => {
      toast('success', 'MOU berhasil ditandatangani!')
      setShowSignModal(false)
      refreshAll()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menandatangani MOU'),
  })

  const uploadProofMutation = useMutation({
    mutationFn: ({ billId, file }: { billId: string, file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch(`/payment/stage2/bills/${billId}/upload-proof`, { method: 'POST', body: formData })
    },
    onSuccess: () => {
      toast('success', 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.')
      refreshAll()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal upload bukti'),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login')
  }

  const handleSubmitDocs = () => {
    setShowSubmitConfirm(false)
    submitDocsMutation.mutate()
  }

  const handleSignMou = (signatureData: string) => signMouMutation.mutate(signatureData)

  const handleBookSession = (sessionId: string) => {
    if (!window.confirm('Anda yakin ingin memilih jadwal ini?')) return
    bookMutation.mutate(sessionId)
  }

  const handleUploadProof = (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 5MB')
      e.target.value = ''
      return
    }
    uploadProofMutation.mutate({ billId, file })
    e.target.value = ''
  }

  const toggleStep = (step: number) => {
    setExpandedStep(prev => prev === step ? 0 : step)
  }

  const steps = [
    {
      number: 1,
      title: 'Pembayaran Formulir',
      description: 'Menyelesaikan pembayaran pendaftaran PPDB.',
      status: applicant?.payment_status === 'paid' ? 'completed' : 'pending',
      content: <PaymentStep transaction={transaction} />
    },
    {
      number: 2,
      title: 'Upload Dokumen Persyaratan',
      description: 'Mengunggah berkas-berkas yang dibutuhkan untuk verifikasi.',
      status: ['document_approved', 'selection', 'passed', 'failed'].includes(applicant?.status) ? 'completed' :
              applicant?.payment_status === 'paid' ? 'active' : 'locked',
      content: (
        <DocumentUploadStep
          applicant={applicant}
          documents={documents}
          onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ['my-documents'] })}
          onSubmitRequest={() => setShowSubmitConfirm(true)}
        />
      )
    },
    {
      number: 3,
      title: 'Seleksi & Ujian',
      description: 'Mengikuti tahapan tes tertulis atau wawancara.',
      status: ['passed', 'failed'].includes(applicant?.status) ? 'completed' :
              applicant?.status === 'selection' ? 'active' : 'locked',
      content: (
        <SelectionStep
          applicant={applicant}
          selectionSession={selectionQuery.data?.session ?? null}
          availableSessions={selectionQuery.data?.availableSessions ?? []}
          selectionResult={selectionQuery.data?.result ?? null}
          booking={bookMutation.isPending}
          onBookSession={handleBookSession}
        />
      )
    },
    {
      number: 4,
      title: 'Pengumuman Hasil Akhir',
      description: 'Hasil kelulusan PPDB.',
      status: ['passed', 'failed'].includes(applicant?.status) ? 'completed' : 'locked',
      content: (
        <ResultStep
          applicant={applicant}
          selectionResult={selectionQuery.data?.result ?? null}
          mou={mouQuery.data}
          stage2Bills={stage2Query.data || []}
          onSignMou={() => setShowSignModal(true)}
          onUploadProof={handleUploadProof}
        />
      )
    }
  ]

  const firstName = (applicant?.full_name || user?.full_name || '').trim().split(' ')[0] || 'Calon Murid'
  const initial = (applicant?.full_name || user?.full_name || 'C')[0]?.toUpperCase()
  const paymentLabel = applicant?.payment_status === 'paid'
    ? 'Tahap 1 Lunas'
    : applicant?.payment_status === 'expired'
      ? 'Kedaluwarsa'
      : 'Menunggu Pembayaran'
  const statusLabel = STATUS_LABEL[status] ?? status ?? 'Terdaftar'
  const doneSteps = steps.filter(s => s.status === 'completed').length

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar
          title="PPDB"
          containerClassName="px-4 md:px-6 h-14 max-w-6xl mx-auto"
          user={user}
          subtitle={user?.role_name || 'Calon Murid'}
          profileLabel="Profil Saya"
          onProfile={() => setShowProfile(true)}
          onLogout={handleLogout}
        />
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="mt-1 h-11 w-11 shrink-0 rounded-full" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        title="PPDB"
        containerClassName="px-4 md:px-6 h-14 max-w-6xl mx-auto"
        user={user}
        subtitle={user?.role_name || 'Calon Murid'}
        profileLabel="Profil Saya"
        onProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Greeting Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-dark via-emerald-primary to-emerald-bright p-6 text-white shadow-lg shadow-emerald-primary/20 md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-gold-accent/25" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/25 backdrop-blur-sm">
              <span className="font-heading text-2xl font-bold text-white">{initial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-100">Assalamu'alaikum,</p>
              <h1 className="mt-0.5 truncate font-heading text-2xl font-bold md:text-3xl">{firstName}</h1>
              <p className="mt-1 text-sm text-emerald-50/90">
                Pantau progres pendaftaran Anda dan selesaikan setiap tahapan yang masih aktif.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-accent/25 px-3 py-1 text-xs font-semibold text-gold-light ring-1 ring-gold-accent/40">
                  {paymentLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-medium text-emerald-100">Progres Pendaftaran</p>
              <p className="mt-0.5 font-heading text-xl font-bold">{doneSteps}<span className="text-emerald-100/70">/{steps.length}</span></p>
              <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-gold-accent transition-all" style={{ width: `${(doneSteps / steps.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Step Timeline */}
        <div className="relative space-y-6 pb-2">
          <div className="absolute bottom-8 left-[1.375rem] top-8 w-0.5 -translate-x-px bg-slate-200" />
          {steps.map((step) => {
            const isCompleted = step.status === 'completed'
            const isActive = step.status === 'active'
            const isPending = step.status === 'pending'
            const isLocked = step.status === 'locked'
            const isExpanded = expandedStep === step.number
            const StepIcon = STEP_ICONS[step.number - 1]

            const circleCls = isCompleted
              ? 'bg-emerald-primary text-white ring-4 ring-emerald-primary/15'
              : isActive
                ? 'bg-white text-emerald-primary border-emerald-primary ring-4 ring-emerald-primary/10'
                : isPending
                  ? 'bg-gold-accent text-white ring-4 ring-gold-accent/15'
                  : 'bg-slate-100 text-slate-400 border-slate-200'

            const stepBadge = isCompleted
              ? <Badge variant="success">Selesai</Badge>
              : isActive
                ? <Badge variant="info">Sedang Berjalan</Badge>
                : isPending
                  ? <Badge variant="warning">Menunggu Bayar</Badge>
                  : <Badge variant="outline" className="text-slate-400"><Lock className="mr-1 h-3 w-3" />Terkunci</Badge>

            return (
              <div key={step.number} className="group relative flex items-start">
                <div className="z-10 mr-5 mt-1 flex h-11 w-11 shrink-0 items-center justify-center">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleCls}`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                </div>

                <Card
                  className={cn(
                    'w-[calc(100%-4rem)] border-slate-200 shadow-sm transition-all duration-300',
                    isActive && 'border-emerald-primary/25 shadow-md ring-1 ring-emerald-primary/10',
                    isLocked && 'bg-slate-50/50 opacity-60'
                  )}
                >
                  <CardHeader
                    className={cn('p-5', isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50')}
                    onClick={() => !isLocked && toggleStep(step.number)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className={cn(
                            'text-lg',
                            isActive && 'text-emerald-primary',
                            isCompleted && 'text-emerald-primary',
                            isPending && 'text-gold-dark',
                            isLocked && 'text-slate-700'
                          )}>
                            {step.title}
                          </CardTitle>
                          <div className="hidden sm:block">{stepBadge}</div>
                        </div>
                        <CardDescription className="mt-1 text-xs">{step.description}</CardDescription>
                        <div className="mt-2 sm:hidden">{stepBadge}</div>
                      </div>
                      {!isLocked && (
                        <div className="shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {isExpanded && !isLocked && (
                    <CardContent className="border-t border-dashed px-4 pb-4 pt-0 mt-4">
                      <div className="animate-in slide-in-from-top-2 fade-in duration-200 pt-4">
                        {step.content}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )
          })}
        </div>

        <ConfirmDialog
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          onConfirm={handleSubmitDocs}
          loading={submitDocsMutation.isPending}
          title="Kirim Dokumen"
          message="Apakah Anda yakin semua dokumen sudah benar? Dokumen yang sudah dikirim tidak bisa diubah kembali."
          confirmLabel="Ya, Kirim"
        />

        {/* MOU Sign Modal */}
        <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tanda Tangan Digital MOU</DialogTitle>
            </DialogHeader>
            <SignaturePad onSign={handleSignMou} signing={signMouMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Profile Modal */}
      <ApplicantProfileModal
        open={showProfile}
        onOpenChange={setShowProfile}
        applicant={applicant ? { ...applicant, full_name: applicant.full_name || user?.full_name, email: applicant.email || user?.email } : null}
        title="Profil Saya"
        showPasswordHint
      />

      {/* Floating Support FAB */}
      {contactInfo && (
        <SupportFab
          phone={contactInfo.phone_primary}
          whatsapp={contactInfo.whatsapp}
          email={contactInfo.email_primary}
        />
      )}
    </div>
  )
}
