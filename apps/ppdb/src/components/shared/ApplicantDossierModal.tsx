import { HealthIdentificationViewer } from './HealthIdentificationViewer'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, apiFetchBlob } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui'
import {
  Archive,
  Download,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  User,
  CreditCard,
  Award,
  Calendar,
  Phone,
  Mail,
  Home,
  Loader2,
  Brain,
  Printer,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import ApplicantTranscriptModal from './ApplicantTranscriptModal'
import ApplicantLoAModal from './ApplicantLoAModal'
import ApplicantSKDModal from './ApplicantSKDModal'

interface ApplicantDossierModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
}

function formatDate(iso?: string | null) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatRupiah(amount?: number | null) {
  if (amount == null) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function DocStatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Disetujui
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ring-red-200">
        <XCircle className="h-3 w-3" /> Ditolak
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ring-amber-200">
      <Clock className="h-3 w-3" /> Menunggu
    </span>
  )
}

export default function ApplicantDossierModal({
  open,
  onOpenChange,
  applicantId,
}: ApplicantDossierModalProps) {
  const { toast } = useToast()
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [loaOpen, setLoaOpen] = useState(false)
  const [skdOpen, setSkdOpen] = useState(false)

  const { data: dossier, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['applicant-dossier', applicantId],
    queryFn: async () => {
      return await apiFetch<any>(`/ppdb/archive/applicants/${applicantId}/dossier`)
    },
    enabled: open && !!applicantId,
  })

  const applicant = dossier?.applicant
  const documents = dossier?.documents || []
  const transcript = dossier?.transcript
  const loa = dossier?.loa
  const skd = dossier?.skd
  const payments = dossier?.payments

  const handleDownloadZip = async () => {
    if (!applicantId || !applicant) return
    setDownloadingZip(true)
    try {
      const blob = await apiFetchBlob(`/ppdb/archive/applicants/${applicantId}/dossier/zip`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (applicant.full_name || 'pendaftar').replace(/[^a-zA-Z0-9_-]/g, '_')
      a.download = `dossier_${safeName}_${applicantId.slice(0, 8)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast('success', 'ZIP Dossier lengkap berhasil diunduh.')
    } catch (err: any) {
      toast('error', `Gagal mengunduh ZIP: ${err.message || 'Terjadi kesalahan'}`)
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-slate-50 border-b p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <Archive className="h-4 w-4" />
                  </span>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    Dossier Pendaftar
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs text-slate-500">
                    ID: {applicantId.slice(0, 8)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  Pencarian Lintas Periode & Gelombang Â· Tercatat di Audit Log
                </p>
              </div>

              {applicant && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    onClick={handleDownloadZip}
                    disabled={downloadingZip}
                  >
                    {downloadingZip ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Mengemas ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Unduh ZIP Dossier
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Status Bar */}
            {applicant && (
              <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Nama Lengkap</span>
                  <span className="font-bold text-slate-800 text-sm">{applicant.full_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Periode / Gelombang</span>
                  <span className="font-medium text-slate-700">
                    {applicant.period_name || 'Periode Aktif'} Â· {applicant.wave_name || 'Gelombang'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Jalur Pendaftaran</span>
                  <span className="font-medium text-slate-700 capitalize">
                    {applicant.registration_path || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status Seleksi</span>
                  <Badge
                    variant={
                      applicant.status === 'passed'
                        ? 'success'
                        : applicant.status === 'failed'
                        ? 'destructive'
                        : applicant.status === 'selection'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="uppercase font-semibold mt-0.5"
                  >
                    {applicant.status === 'passed'
                      ? 'Lulus'
                      : applicant.status === 'failed'
                      ? 'Tidak Lulus'
                      : applicant.status === 'selection'
                      ? 'Dalam Seleksi'
                      : applicant.status || 'Baru'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                <p className="text-sm font-medium">Memuat dossier lengkap pendaftar...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-red-600 font-semibold mb-2">Gagal memuat berkas dossier</p>
                <p className="text-xs text-muted-foreground mb-4">{(error as any)?.message}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Coba Lagi
                </Button>
              </div>
            ) : !applicant ? null : (
              <Tabs defaultValue="biodata" className="w-full">
                <TabsList className="grid grid-cols-5 w-full bg-slate-100 p-1 mb-6">
                  <TabsTrigger value="biodata" className="text-xs gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Biodata
                  </TabsTrigger>
                  <TabsTrigger value="dokumen" className="text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Dokumen ({documents.length})
                  </TabsTrigger>
                  <TabsTrigger value="seleksi" className="text-xs gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    Seleksi & Nilai
                  </TabsTrigger>
                  <TabsTrigger value="pembayaran" className="text-xs gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Keuangan
                  </TabsTrigger>
                  <TabsTrigger value="loa" className="text-xs gap-1.5">
                    <Award className="h-3.5 w-3.5" />
                    LoA & SKD</TabsTrigger>
                </TabsList>

                {/* TAB 1: BIODATA */}
                <TabsContent value="biodata" className="space-y-6">
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                      <User className="h-4 w-4 text-emerald-600" /> Data Pribadi Calon Santri
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Nama Lengkap</span>
                        <span className="font-medium text-slate-800">{applicant.full_name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">NISN</span>
                        <span className="font-mono text-slate-800">{applicant.nisn || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">NIK</span>
                        <span className="font-mono text-slate-800">{applicant.nik || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Jenis Kelamin</span>
                        <span className="font-medium text-slate-800">
                          {applicant.gender === 'L' ? 'Laki-laki' : applicant.gender === 'P' ? 'Perempuan' : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Tempat, Tanggal Lahir</span>
                        <span className="font-medium text-slate-800">
                          {applicant.birth_place || '-'}, {applicant.birth_date || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Agama</span>
                        <span className="font-medium text-slate-800">{applicant.religion || 'Islam'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Email</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" /> {applicant.email || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">No. WhatsApp Calon Santri</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {applicant.phone || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Asal Sekolah</span>
                        <span className="font-medium text-slate-800">{applicant.previous_school || '-'}</span>
                      </div>
                      <div className="sm:col-span-2 md:col-span-3">
                        <span className="text-xs text-muted-foreground block mb-1">Riwayat Kesehatan</span>
                        <HealthIdentificationViewer data={applicant.disease_history} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                      <Home className="h-4 w-4 text-emerald-600" /> Alamat & Domisili
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="sm:col-span-2 md:col-span-4">
                        <span className="text-xs text-muted-foreground block">Alamat Lengkap</span>
                        <span className="font-medium text-slate-800">{applicant.address || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Provinsi</span>
                        <span className="font-medium text-slate-800">{applicant.province || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Kabupaten/Kota</span>
                        <span className="font-medium text-slate-800">{applicant.city || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Kecamatan</span>
                        <span className="font-medium text-slate-800">{applicant.district || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Kelurahan/Desa</span>
                        <span className="font-medium text-slate-800">{applicant.village || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                      <Phone className="h-4 w-4 text-emerald-600" /> Data Orang Tua / Wali
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Nama Ayah</span>
                        <span className="font-medium text-slate-800">{applicant.father_name || applicant.parent_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">No. WhatsApp Ayah</span>
                        <span className="font-medium text-slate-800">{applicant.father_phone || applicant.parent_phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Pekerjaan Ayah</span>
                        <span className="font-medium text-slate-800">{applicant.father_job || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Nama Ibu</span>
                        <span className="font-medium text-slate-800">{applicant.mother_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">No. WhatsApp Ibu</span>
                        <span className="font-medium text-slate-800">{applicant.mother_phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Pekerjaan Ibu</span>
                        <span className="font-medium text-slate-800">{applicant.mother_job || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Nama Wali</span>
                        <span className="font-medium text-slate-800">{applicant.guardian_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Pekerjaan Wali</span>
                        <span className="font-medium text-slate-800">{applicant.guardian_job || '-'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Penghasilan Per Bulan</span>
                        <span className="font-medium text-slate-800">{applicant.parent_income || '-'}</span>
                      </div>
                      <div className="sm:col-span-2 md:col-span-3">
                        <span className="text-xs text-muted-foreground block">Email Orang Tua/Wali</span>
                        <span className="font-medium text-slate-800">{applicant.parent_email || '-'}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: DOKUMEN PERSYARATAN */}
                <TabsContent value="dokumen" className="space-y-4">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-800">Berkas Dokumen Asli</h3>
                        <p className="text-xs text-muted-foreground">
                          Daftar berkas yang diunggah oleh pendaftar beserta status verifikasi.
                        </p>
                      </div>
                    </div>
                    {documents.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        Belum ada dokumen yang diunggah oleh pendaftar.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="text-xs font-semibold">Nama Dokumen</TableHead>
                            <TableHead className="text-xs font-semibold">Nama Berkas</TableHead>
                            <TableHead className="text-xs font-semibold">Ukuran</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-xs font-semibold">Catatan / Verifikasi</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc: any) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium text-sm text-slate-800">
                                {doc.doc_type}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 font-mono">
                                {doc.original_name || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '-'}
                              </TableCell>
                              <TableCell>
                                <DocStatusBadge status={doc.status} />
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                {doc.notes ? (
                                  <span className="text-red-600 font-medium">{doc.notes}</span>
                                ) : doc.verified_at ? (
                                  <span className="text-muted-foreground">
                                    Diverifikasi {formatDate(doc.verified_at)}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {doc.public_url ? (
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                  >
                                    <a
                                      href={doc.public_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Lihat <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">Tidak ada link</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 3: SELEKSI & NILAI */}
                <TabsContent value="seleksi" className="space-y-6">
                  {/* TIU Result Card */}
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Hasil Ujian TIU (Safe Exam Browser)
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        Webhook Otomatis
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 flex flex-col justify-center items-center">
                        <span className="text-xs text-emerald-800 font-medium">Skor TIU</span>
                        <span className="text-3xl font-extrabold text-emerald-700 mt-1">
                          {transcript?.tiu_score != null ? transcript.tiu_score : 'â€”'}
                        </span>
                        <span className="text-[10px] text-emerald-600 mt-1">Skala 0 - 100</span>
                      </div>
                      <div className="sm:col-span-2 space-y-2 text-xs text-slate-600 justify-center flex flex-col">
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Status Pengerjaan</span>
                          <span className="font-medium text-slate-800">
                            {transcript?.tiu_score != null ? 'Selesai Dikerjakan' : 'Belum Selesai / Belum Ikut'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Waktu Penyelesaian</span>
                          <span className="font-medium text-slate-800">
                            {formatDate(transcript?.tiu_completed_at)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mode Ujian</span>
                          <span className="font-medium text-slate-800">
                            Safe Exam Browser (SEB Desktop Desktop/Laptop)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rubric Breakdown */}
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Penilaian Rubrik (Tahfidz & Wawancara)
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setTranscriptOpen(true)}
                      >
                        <Printer className="h-3 w-3" />
                        Buka Transkrip Resmi
                      </Button>
                    </div>

                    {transcript?.evaluations?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="text-xs font-semibold">Tipe Evaluasi</TableHead>
                            <TableHead className="text-xs font-semibold">Kriteria Penilaian</TableHead>
                            <TableHead className="text-xs font-semibold">Bobot</TableHead>
                            <TableHead className="text-xs font-semibold">Nilai</TableHead>
                            <TableHead className="text-xs font-semibold">Penguji / Catatan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transcript.evaluations.map((ev: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-xs capitalize">
                                {ev.type}
                              </TableCell>
                              <TableCell className="text-xs">{ev.criteria}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {ev.weight}%
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-800">
                                {ev.score}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {ev.evaluator_name || '-'} {ev.notes ? `(${ev.notes})` : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Belum ada data input rubrik penilaian tahfidz/wawancara.
                      </p>
                    )}

                    {transcript?.evaluator_notes && (
                      <div className="bg-slate-50 p-3 rounded-lg border text-xs">
                        <span className="font-semibold text-slate-700 block mb-1">
                          Catatan Dewan Penguji / Evaluator:
                        </span>
                        <p className="text-slate-600 whitespace-pre-wrap">{transcript.evaluator_notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 4: KEUANGAN & PEMBAYARAN */}
                <TabsContent value="pembayaran" className="space-y-6">
                  {/* Form Payment */}
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Pembayaran Biaya Formulir (Tahap 1)
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        Webhook Otomatis
                      </Badge>
                    </div>

                    {payments?.form_payments?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="text-xs font-semibold">Nomor Invoice</TableHead>
                            <TableHead className="text-xs font-semibold">Nominal</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-xs font-semibold">Metode</TableHead>
                            <TableHead className="text-xs font-semibold">Waktu Pembayaran</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.form_payments.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs text-slate-800 font-semibold">
                                {p.invoice_number || '-'}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-emerald-700">
                                {formatRupiah(p.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    p.status === 'paid' || p.status === 'success'
                                      ? 'success'
                                      : p.status === 'expired' || p.status === 'cancelled' || p.status === 'failed'
                                      ? 'destructive'
                                      : p.status === 'exception'
                                      ? 'warning'
                                      : 'outline'
                                  }
                                  className="text-[10px] uppercase font-bold"
                                  title={p.notes || undefined}
                                >
                                  {p.status === 'exception' ? 'Pengecualian' : p.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs uppercase text-slate-600">
                                {p.payment_method || 'PG Gateway'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(p.paid_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Tidak ada riwayat transaksi pembayaran formulir.
                      </p>
                    )}
                  </div>

                  {/* Stage 2 / Installments */}
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Tagihan Biaya Masuk & Cicilan (Tahap 2)
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        Webhook Otomatis
                      </Badge>
                    </div>

                    {payments?.stage2_bills?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="text-xs font-semibold">Termin Cicilan</TableHead>
                            <TableHead className="text-xs font-semibold">Nominal Tagihan</TableHead>
                            <TableHead className="text-xs font-semibold">Jatuh Tempo</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-xs font-semibold">Konfirmasi Gateway</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.stage2_bills.map((b: any) => (
                            <TableRow key={b.id}>
                              <TableCell className="text-xs font-medium">
                                Cicilan Ke-{b.installment_number}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-emerald-700">
                                {formatRupiah(b.amount)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(b.due_date)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    b.status === 'paid'
                                      ? 'success'
                                      : b.status === 'overdue'
                                      ? 'destructive'
                                      : 'warning'
                                  }
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {b.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(b.confirmed_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        Belum ada data tagihan biaya masuk / cicilan tahap 2.
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 5: SURAT LoA */}
                <TabsContent value="loa" className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Surat Penerimaan Resmi (Letter of Acceptance)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Nomor: {loa?.letter_number || '-'} Â· Diterbitkan: {formatDate(loa?.issued_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setLoaOpen(true)}
                      >
                        <Printer className="h-3 w-3" />
                        Cetak Surat LoA
                      </Button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border text-xs space-y-3 font-serif">
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                        {loa?.content || 'Belum ada konten LoA.'}
                      </p>
                      {loa?.fixed_clause && (
                        <div className="p-3 bg-red-50/60 border border-red-200/60 rounded text-[11px] text-red-800 font-sans mt-3">
                          <span className="font-semibold block mb-0.5">Klausul Baku Tidak Dapat Dikembalikan:</span>
                          {loa.fixed_clause}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">
                          Surat Keterangan Diterima (SKD)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Nomor: {skd?.letter_number || "-"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => setSkdOpen(true)}
                      >
                        <Printer className="h-3 w-3" />
                        Cetak SKD
                      </Button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border text-xs space-y-3 font-mono">
                      <p className="text-slate-600">Background URL: {skd?.background_url || "Belum ada"}</p>
                      <p className="text-slate-600">Grup WA: {skd?.whatsapp_group_link || "Belum ada"}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Modals */}
      <ApplicantTranscriptModal
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        applicantId={applicantId}
      />
      <ApplicantLoAModal
        open={loaOpen}
        onOpenChange={setLoaOpen}
        applicantId={applicantId}
      />
      <ApplicantSKDModal
        open={skdOpen}
        onOpenChange={setSkdOpen}
        applicantId={applicantId}
      />
    </>
  )
}
