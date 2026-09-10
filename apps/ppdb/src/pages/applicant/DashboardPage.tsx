import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui"
import { CheckCircle, Clock, FileText, Upload, ChevronDown, ChevronUp, MapPin, Star, CalendarDays, LogOut, User as UserIcon, Phone, MessageCircle, Mail, X, ShieldCheck, PenLine, FileSignature, Receipt } from 'lucide-react'
import * as api from '../../api/client'
import { useToast } from '@/components/Toast'
import { REQUIRED_DOCUMENTS } from '@/constants/documents'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export default function ApplicantDashboardPage() {
  const { toast } = useToast()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [applicant, setApplicant] = useState<any>(null)
  const [transaction, setTransaction] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [expandedStep, setExpandedStep] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectionResult, setSelectionResult] = useState<any>(null)
  const [selectionSession, setSelectionSession] = useState<any>(null)
  const [availableSessions, setAvailableSessions] = useState<any[]>([])
  const [booking, setBooking] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [mou, setMou] = useState<any>(null)
  const [stage2Bills, setStage2Bills] = useState<any[]>([])
  const [signing, setSigning] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)

  const fetchMyData = useCallback(async () => {
    try {
      const [res, docsRes] = await Promise.all([
        api.apiFetch<any>('/payment/my-transaction'),
        api.apiFetch<any>('/ppdb/documents')
      ])
      setApplicant(res.applicant)
      setTransaction(res.transaction)
      setDocuments(docsRes.data || [])

      const status = res.applicant?.status
      if (['document_uploaded_pending', 'document_rejected'].includes(status)) {
        setExpandedStep(2)
      } else if (status === 'selection') {
        setExpandedStep(3)
      } else if (['passed', 'failed'].includes(status)) {
        setExpandedStep(4)
      }

      if (['selection', 'passed', 'failed'].includes(status)) {
        try {
          const [resultRes, sessionRes] = await Promise.all([
            api.apiFetch<any>('/selection/applicants/me/results'),
            api.apiFetch<any>('/selection/applicants/me/sessions'),
          ])
          setSelectionResult(resultRes || null) // { notes, scores: [] }
          setSelectionSession(sessionRes.session || null)
          setAvailableSessions(sessionRes.available_sessions || [])
        } catch (innerErr) {
          console.error(innerErr)
        }
      }

      if (['passed', 'failed'].includes(status)) {
        try {
          const [mouRes, billsRes] = await Promise.all([
            api.apiFetch<any>('/ppdb/applicants/me/mou').catch(() => ({ mou: null })),
            api.apiFetch<any>('/payment/stage2/my-bills').catch(() => ({ bills: [], mou_signed: false }))
          ])
          setMou(mouRes?.mou || null)
          setStage2Bills(billsRes?.bills || [])
        } catch (innerErr) {
          console.error(innerErr)
        }
      }
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMyData()
    api.apiFetch<any>('/companyprofile/contact-info').then(setContactInfo).catch(() => {})
  }, [fetchMyData])

  const handleBookSession = async (sessionId: string) => {
    if(!confirm('Anda yakin ingin memilih jadwal ini?')) return
    setBooking(true)
    try {
      await api.apiFetch('/selection/applicants/me/book', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId })
      })
      toast('success', 'Berhasil memilih jadwal ujian')
      await fetchMyData()
    } catch(e: any) {
      toast('error', e.message || 'Gagal memilih jadwal')
    } finally {
      setBooking(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login')
  }

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

  const handleSignMou = async (signatureData: string) => {
    setSigning(true)
    try {
      await api.apiFetch('/ppdb/applicants/me/mou/sign', {
        method: 'POST',
        body: JSON.stringify({ signature_data: signatureData })
      })
      toast('success', 'MOU berhasil ditandatangani!')
      setShowSignModal(false)
      await fetchMyData()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menandatangani MOU')
    } finally {
      setSigning(false)
    }
  }

  const handleUploadProof = async (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 5MB')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.apiFetch(`/payment/stage2/bills/${billId}/upload-proof`, { method: 'POST', body: formData })
      toast('success', 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.')
      await fetchMyData()
    } catch (e: any) {
      toast('error', e.message || 'Gagal upload bukti')
    } finally {
      e.target.value = ''
    }
  }

  const requiredDocs = REQUIRED_DOCUMENTS

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
        <div className="space-y-4">
          {/* Jadwal Seleksi */}
          {selectionSession ? (
            <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200 space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Jadwal Seleksi Anda
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="text-muted-foreground">Sesi</div>
                <div className="font-medium">{selectionSession.name}</div>
                {selectionSession.session_date && (
                  <>
                    <div className="text-muted-foreground">Tanggal</div>
                    <div className="font-medium">
                      {new Date(selectionSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </>
                )}
                {(selectionSession.start_time || selectionSession.end_time) && (
                  <>
                    <div className="text-muted-foreground">Waktu</div>
                    <div className="font-medium">
                      {selectionSession.start_time}{selectionSession.end_time ? ` – ${selectionSession.end_time}` : ''} WIB
                    </div>
                  </>
                )}
                {selectionSession.location && (
                  <>
                    <div className="text-muted-foreground">Lokasi</div>
                    <div className="font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {selectionSession.location}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : applicant?.status === 'selection' && (
            <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Pilih Jadwal Ujian
                </h4>
                <p className="text-sm text-muted-foreground mt-1">Silakan pilih salah satu jadwal ujian yang tersedia di bawah ini.</p>
              </div>

              {availableSessions.length === 0 ? (
                <div className="p-4 bg-muted/20 text-center rounded-md">
                  <p className="text-sm text-muted-foreground">Belum ada jadwal sesi yang dibuka oleh panitia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSessions.map(s => {
                    const isFull = s.quota > 0 && s.booked_count >= s.quota;
                    return (
                      <div key={s.id} className={`border rounded-lg p-3 ${isFull ? 'bg-muted/30 opacity-60' : 'bg-background'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm">{s.name}</h5>
                          {s.quota > 0 && (
                            <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px]">
                              {s.booked_count}/{s.quota} terisi
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {s.location || '-'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={isFull || booking}
                          onClick={() => handleBookSession(s.id)}
                        >
                          {isFull ? 'Penuh' : booking ? 'Wait...' : 'Pilih Jadwal'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Nilai Seleksi Dinamis */}
          {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-yellow-500" />
                Hasil & Nilai Seleksi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectionResult.scores.map((sc: any, idx: number) => (
                  <div key={idx} className="bg-background border rounded-md p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                      <p className="text-sm font-medium">{sc.criteria_name}</p>
                    </div>
                    <div className="text-xl font-bold">{sc.score}</div>
                  </div>
                ))}
              </div>
              {selectionResult.notes && (
                <div className="mt-3 p-3 bg-yellow-50/50 border border-yellow-100 rounded-md">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Catatan Panitia:</p>
                  <p className="text-sm text-yellow-700">{selectionResult.notes}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )
    },
    {
      number: 4,
      title: 'Pengumuman Hasil Akhir',
      description: 'Hasil kelulusan PPDB.',
      status: ['passed', 'failed'].includes(applicant?.status) ? 'completed' : 'locked',
      content: (
        <div className="space-y-4">
          {applicant?.status === 'passed' ? (
            <div className="space-y-6">
              {/* Hasil Seleksi */}
              <div className="p-6 border rounded-xl bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-800">Selamat! Anda Dinyatakan Lulus</h3>
                    <p className="text-emerald-700 text-sm">Selamat, Anda telah lulus seleksi PPDB Pesantren Ar-Rahman.</p>
                  </div>
                </div>

                {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {selectionResult.scores.map((sc: any, idx: number) => (
                      <div key={idx} className="bg-white border rounded-md p-3 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                          <p className="text-sm font-medium">{sc.criteria_name}</p>
                        </div>
                        <div className="text-xl font-bold">{sc.score}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectionResult?.notes && (
                  <div className="mt-4 p-3 bg-white/60 border border-emerald-100 rounded-md">
                    <p className="text-xs font-medium text-emerald-800 mb-1">Catatan Kelulusan:</p>
                    <p className="text-sm text-emerald-700">{selectionResult.notes}</p>
                  </div>
                )}
              </div>

              {/* Draft MOU */}
              {mou ? (
                <div className="border rounded-xl bg-card overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <FileSignature className="w-5 h-5 text-primary" />
                      Memorandum of Understanding (MOU)
                    </h4>
                    {mou.status === 'signed' && (
                      <Badge variant="success" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> MOU Ditandatangani
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    {mou.status === 'draft' ? (
                      <div className="space-y-4">
                        <div
                          dangerouslySetInnerHTML={{ __html: mou.draft_content || '<p class="text-muted-foreground text-sm">Template MOU akan segera tersedia.</p>' }}
                          className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/20 max-h-64 overflow-y-auto"
                        />
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                          <p className="text-sm text-yellow-800 font-medium">Langkah berikutnya: Tanda tangani MOU ini secara digital untuk melanjutkan ke tahap pembayaran</p>
                          <Button onClick={() => setShowSignModal(true)} className="shrink-0 gap-2">
                            <PenLine className="w-4 h-4" />
                            Tanda Tangan MOU
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 space-y-2">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-muted-foreground">MOU telah ditandatangani pada {mou.signed_at ? new Date(mou.signed_at).toLocaleString('id-ID') : '-'}</p>
                        <p className="font-medium">Silakan lanjutkan ke pembayaran Tahap 2.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-xl bg-blue-50 border-blue-200 text-blue-800 text-sm">
                  <div className="font-semibold mb-1">Langkah Selanjutnya</div>
                  Menunggu MOU diterbitkan oleh panitia.
                </div>
              )}

              {/* Pembayaran Tahap 2 */}
              {mou?.status === 'signed' && stage2Bills.length > 0 && (
                <div className="border rounded-xl bg-card overflow-hidden">
                  <div className="bg-muted px-4 py-3 border-b">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-primary" />
                      Pembayaran Tahap 2
                    </h4>
                  </div>
                  <div className="p-4 space-y-4">
                    {Object.entries(stage2Bills.reduce((acc, b) => {
                      (acc[b.fee_item_id] = acc[b.fee_item_id] || []).push(b);
                      return acc;
                    }, {} as Record<string, any[]>)).map(([feeId, bills]: any) => (
                      <div key={feeId} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 p-3 border-b">
                          <div className="font-medium text-sm">{bills[0].fee_item_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Total: {formatRp(bills.reduce((sum: number, b: any) => sum + Number(b.amount), 0))}
                          </div>
                        </div>

                        {bills.length === 1 ? (
                          <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <div className="font-semibold">{formatRp(Number(bills[0].amount))}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {bills[0].status === 'pending' ? 'Menunggu Pembayaran' :
                                 bills[0].status === 'paid' ? 'Lunas' : bills[0].status}
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <Badge variant={bills[0].status === 'paid' ? 'success' : bills[0].status === 'pending' ? 'warning' : 'secondary'}>
                                {bills[0].status.toUpperCase()}
                              </Badge>
                              {bills[0].status === 'pending' && (
                                <div className="relative inline-block">
                                  <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => handleUploadProof(bills[0].id, e)}
                                  />
                                  <Button size="sm" variant="outline" className="gap-2 pointer-events-none">
                                    <Upload className="w-4 h-4" />
                                    Upload Bukti
                                  </Button>
                                </div>
                              )}
                              {bills[0].status === 'paid' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-muted/10 border-b">
                                <tr>
                                  <th className="p-3 font-medium text-muted-foreground">Cicilan Ke</th>
                                  <th className="p-3 font-medium text-muted-foreground">Nominal</th>
                                  <th className="p-3 font-medium text-muted-foreground text-center">Status</th>
                                  <th className="p-3 font-medium text-muted-foreground text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bills.sort((a: any, b: any) => a.installment_sequence - b.installment_sequence).map((b: any) => (
                                  <tr key={b.id} className="border-b last:border-0">
                                    <td className="p-3">Cicilan {b.installment_sequence} dari {bills.length}</td>
                                    <td className="p-3 font-medium">{formatRp(Number(b.amount))}</td>
                                    <td className="p-3 text-center">
                                      <Badge variant={b.status === 'paid' ? 'success' : b.status === 'pending' ? 'warning' : 'secondary'} className="text-[10px]">
                                        {b.status.toUpperCase()}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-right">
                                      {b.status === 'pending' && (
                                        <div className="relative inline-block">
                                          <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={(e) => handleUploadProof(b.id, e)}
                                          />
                                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 pointer-events-none">
                                            Upload
                                          </Button>
                                        </div>
                                      )}
                                      {b.status === 'paid' && <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : applicant?.status === 'failed' ? (
            <div className="p-6 border rounded-xl text-center bg-red-50 border-red-200">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
              <p className="text-red-700 text-sm mb-4">
                Tetap semangat dan jangan menyerah. Terima kasih telah berpartisipasi dalam pendaftaran PPDB Pesantren Ar-Rahman.
              </p>

              {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left">
                  {selectionResult.scores.map((sc: any, idx: number) => (
                    <div key={idx} className="bg-white border rounded-md p-3 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                        <p className="text-sm font-medium">{sc.criteria_name}</p>
                      </div>
                      <div className="text-xl font-bold">{sc.score}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectionResult?.notes && (
                <div className="text-left bg-white/50 border border-red-100 rounded-lg p-4 mt-4 inline-block w-full text-sm">
                  <p className="font-semibold text-red-800 mb-1">Catatan Panitia:</p>
                  <p className="text-red-700">{selectionResult.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 border rounded-lg text-center bg-muted/10">
              <p className="text-muted-foreground text-sm">Belum ada pengumuman hasil seleksi. Silakan cek kembali nanti.</p>
            </div>
          )}
        </div>
      )
    }
  ]

  if (loading) return <div className="p-8 text-center">Memuat dashboard...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-14 max-w-6xl mx-auto">
          <h1 className="font-heading text-base font-bold text-foreground">PPDB</h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="gap-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {user?.full_name?.[0] || user?.username?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-foreground leading-tight">{user?.full_name || user?.username}</div>
                  <div className="text-[11px] text-muted-foreground">{user?.role_name || 'Pendaftar'}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{user?.full_name || user?.username}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onSelect={() => setShowProfile(true)}>
                <UserIcon className="h-4 w-4" />
                Profil Saya
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-rose-danger focus:text-rose-danger focus:bg-rose-light/60" onSelect={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Dashboard Pendaftar</h2>
          <p className="text-muted-foreground">
            Pantau progres pendaftaran Anda di bawah ini. Pastikan Anda menyelesaikan setiap tahapan yang masih aktif.
          </p>
        </div>

        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.375rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">

          {steps.map((step) => {
            const isCompleted = step.status === 'completed'
            const isActive = step.status === 'active' || step.status === 'pending'
            const isLocked = step.status === 'locked'
            const isExpanded = expandedStep === step.number

            let iconBg = 'bg-slate-100 border-slate-200 text-slate-400'
            if (isCompleted) iconBg = 'bg-emerald-500 border-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
            if (isActive) iconBg = 'bg-blue-600 border-blue-700 text-white shadow-md ring-4 ring-blue-50'

            return (
              <div key={step.number} className="relative flex items-start group">

                <div className="flex items-center justify-center w-11 h-11 rounded-full border-2 bg-white shrink-0 z-10 mr-5 mt-1">
                  <div className={`flex items-center justify-center w-full h-full rounded-full transition-all duration-300 ${iconBg}`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{step.number}</span>}
                  </div>
                </div>

                <div className="w-[calc(100%-4rem)]">
                  <Card
                    className={`transition-all duration-300 border-slate-200 shadow-sm ${isActive ? 'border-blue-200 shadow-md ring-1 ring-blue-100 bg-white' : isLocked ? 'opacity-60 bg-slate-50/50' : 'bg-white'}`}
                  >
                    <CardHeader
                      className={`cursor-pointer p-5 ${isLocked ? 'cursor-not-allowed' : 'hover:bg-slate-50'}`}
                      onClick={() => !isLocked && toggleStep(step.number)}
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <CardTitle className={`text-lg ${isActive ? 'text-blue-700 font-bold' : isCompleted ? 'text-emerald-700 font-bold' : 'text-slate-800'}`}>
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

      {/* MOU Sign Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tanda Tangan Digital MOU</DialogTitle>
          </DialogHeader>
          <SignaturePad onSign={handleSignMou} signing={signing} />
        </DialogContent>
      </Dialog>
      </div>

      {/* ── Profile Modal (Read-only, same layout as admin DataPendaftarPage) ── */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil Saya</DialogTitle>
          </DialogHeader>
          {user && applicant && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                  <p className="font-medium">{applicant.full_name || user.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                  <Badge variant={applicant.payment_status === 'paid' ? 'success' : applicant.payment_status === 'expired' ? 'destructive' : 'warning'} className="mt-1">
                    {applicant.payment_status?.toUpperCase() || 'PENDING'}
                  </Badge>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{applicant.email || user.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">No. WhatsApp</p>
                  <p className="font-medium">{applicant.phone || '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Username</p>
                  <p className="font-medium font-mono">{user.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
                  <p className="font-medium capitalize">{applicant.registration_path || '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Jenjang Tujuan</p>
                  <p className="font-medium">{applicant.registration_level || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                  <p className="font-medium">{applicant.gender === 'L' ? 'Laki-laki' : applicant.gender === 'P' ? 'Perempuan' : '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p>
                  <p className="font-medium">{applicant.birth_place || '-'}, {applicant.birth_date || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NISN</p>
                  <p className="font-medium">{applicant.nisn || '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">NIK</p>
                  <p className="font-medium">{applicant.nik || '-'}</p>
                </div>

                <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Provinsi</p>
                      <p className="font-medium">{applicant.province || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kota/Kabupaten</p>
                      <p className="font-medium">{applicant.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kecamatan</p>
                      <p className="font-medium">{applicant.district || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kelurahan/Desa</p>
                      <p className="font-medium">{applicant.village || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Kode Pos</p>
                      <p className="font-medium">{applicant.postal_code || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Alamat Detail</p>
                      <p className="font-medium">{applicant.address || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Nama Orang Tua/Wali</p>
                  <p className="font-medium">{applicant.parent_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Asal Sekolah</p>
                  <p className="font-medium">{applicant.previous_school || '-'}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Gelombang</p>
                  <p className="font-medium">{applicant.wave_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                  <p className="font-medium">{applicant.created_at ? new Date(applicant.created_at).toLocaleString('id-ID') : '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Lupa password? Hubungi admin untuk mereset password Anda.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Floating Support FAB ── */}
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

function SignaturePad({ onSign, signing }: { onSign: (sig: string) => void, signing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDraw = () => setIsDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const submit = () => {
    if (!hasSignature) return
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onSign(dataUrl)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tanda tangani di area bawah ini menggunakan mouse atau jari (layar sentuh):</p>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={440}
          height={200}
          className="w-full touch-none bg-white cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={clear} disabled={signing}>Hapus</Button>
        <Button type="button" onClick={submit} disabled={!hasSignature || signing}>
          {signing ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
        </Button>
      </div>
    </div>
  )
}

/* ── Floating Support FAB (adapted from companyprofile) ── */
function SupportFab({ phone, whatsapp, email }: { phone?: string; whatsapp?: string; email?: string }) {
  const [fabOpen, setFabOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [fabOpen])

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFabOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fabOpen])

  const telHref = `tel:${(phone || '').replace(/[^0-9+]/g, '')}`
  const waHref = `https://wa.me/${(whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Assalamualaikum! Saya ingin bertanya tentang PPDB Pesantren Ar-Rahman.')}`
  const mailHref = `mailto:${email || ''}`

  const options = [
    { icon: Phone, title: 'Call Support', subtitle: phone || '-', href: telHref },
    { icon: MessageCircle, title: 'WhatsApp', subtitle: `+${(whatsapp || '').replace(/[^0-9]/g, '')}`, href: waHref, external: true },
    { icon: Mail, title: 'Email Support', subtitle: email || '-', href: mailHref },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div ref={containerRef} className="relative">
        {/* Panel */}
        <div
          role="dialog"
          aria-label="Butuh Bantuan?"
          aria-hidden={!fabOpen}
          className={[
            'absolute bottom-full right-0 mb-4 w-[300px] max-w-[calc(100vw-2.5rem)]',
            'origin-bottom-right overflow-hidden rounded-2xl border border-border',
            'bg-card shadow-xl',
            'transition-all duration-300 ease-out',
            fabOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-3 scale-95 pointer-events-none',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Butuh Bantuan?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pilih cara menghubungi kami</p>
            </div>
            <button
              onClick={() => setFabOpen(false)}
              className="p-1.5 -m-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Tutup menu bantuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t py-2">
            {options.map((opt) => (
              <a
                key={opt.title}
                href={opt.href}
                {...(opt.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <opt.icon className="w-5 h-5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{opt.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{opt.subtitle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* FAB Button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          aria-label={fabOpen ? 'Tutup menu bantuan' : 'Butuh Bantuan?'}
          aria-expanded={fabOpen}
          aria-haspopup="dialog"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-lg"
        >
          <span
            className="relative flex items-center justify-center"
            style={{
              transform: fabOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <MessageCircle
              className="w-6 h-6"
              aria-hidden="true"
              style={{
                opacity: fabOpen ? 0 : 1,
                transform: fabOpen ? 'scale(0.4) rotate(-90deg)' : 'scale(1)',
                transition: 'opacity 0.15s ease, transform 0.25s ease',
              }}
            />
            <X
              className="absolute w-6 h-6"
              aria-hidden="true"
              style={{
                opacity: fabOpen ? 1 : 0,
                transform: fabOpen ? 'scale(1)' : 'scale(0.4) rotate(90deg)',
                transition: 'opacity 0.15s ease 0.05s, transform 0.25s ease 0.05s',
              }}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
