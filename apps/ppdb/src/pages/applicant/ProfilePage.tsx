import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '@/api/client'
import { useToast } from '../../components/Toast'
import { Button, Card, CardContent, Badge, SectionCard } from '@/components/ui'
import { HealthIdentificationViewer } from '@/components/shared/HealthIdentificationViewer'
import { DeviceSessionsCard, type ProfileSession } from '@repo/ui/profile'
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar } from 'lucide-react'

export default function ApplicantProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })
  const applicant = transactionQuery.data?.applicant

  async function loadSessions() {
    try {
      if (sessions.length === 0) setSessionsLoading(true)
      else setSessionsRefreshing(true)
      setSessionsError(null)
      const data = await (await import('@/services/auth.service')).authService.getSessions()
      setSessions((data as any)?.sessions ?? [])
    } catch (err: any) {
      setSessionsError(err?.message || 'Gagal memuat sesi perangkat.')
    } finally {
      setSessionsLoading(false)
      setSessionsRefreshing(false)
    }
  }

  useEffect(() => {
    void loadSessions()
    const id = window.setInterval(() => void loadSessions(), 60000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRevoke(id: string) {
    try {
      setRevokingId(id)
      const { authService } = await import('@/services/auth.service')
      await authService.revokeSession(id)
      await loadSessions()
      toast('success', 'Sesi perangkat berhasil diakhiri.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengakhiri sesi.')
    } finally {
      setRevokingId(null)
    }
  }

  const header = (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali" className="rounded-xl">
        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Profil Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">Biodata pendaftar & sesi perangkat</p>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      {header}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="px-5 pt-6 pb-5">
              <div className="text-center">
                <h2 className="truncate font-heading text-lg font-bold text-foreground">
                  {applicant?.full_name || user?.full_name || '—'}
                </h2>
                <p className="truncate text-xs text-muted-foreground">@{user?.username}</p>
                <Badge variant={applicant?.payment_status === 'paid' ? 'success' : applicant?.payment_status === 'expired' ? 'destructive' : 'warning'} className="mt-2.5">
                  {applicant?.payment_status?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>
              <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="truncate font-medium text-foreground">{applicant?.email || user?.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">No. WhatsApp</p>
                    <p className="truncate font-medium text-foreground">{applicant?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jalur Pendaftaran</p>
                    <p className="truncate font-medium text-foreground capitalize">{applicant?.registration_path || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gelombang</p>
                    <p className="truncate font-medium text-foreground">{applicant?.wave_name || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
        <div className="space-y-6">
          <SectionCard title="Biodata" description="Data identitas dan informasi pendaftaran Anda." icon={User} accent="bg-primary">
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div><p className="text-muted-foreground text-xs">Nama Lengkap</p><p className="font-medium break-words">{applicant?.full_name}</p></div>
              <div><p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p><p className="font-medium">{applicant?.birth_place || '-'}, {applicant?.birth_date || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">Jenis Kelamin</p><p className="font-medium">{applicant?.gender === 'L' ? 'Laki-laki' : applicant?.gender === 'P' ? 'Perempuan' : '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">NISN</p><p className="font-medium">{applicant?.nisn || '-'}</p></div>
              <div><p className="text-muted-foreground text-xs">NIK</p><p className="font-medium">{applicant?.nik || '-'}</p></div>
              <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2"><h4 className="font-semibold text-sm mb-2">Data Domisili</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><p className="text-muted-foreground text-xs">Provinsi</p><p className="font-medium">{applicant?.province || '-'}</p></div><div><p className="text-muted-foreground text-xs">Kota/Kabupaten</p><p className="font-medium">{applicant?.city || '-'}</p></div><div><p className="text-muted-foreground text-xs">Kecamatan</p><p className="font-medium">{applicant?.district || '-'}</p></div><div><p className="text-muted-foreground text-xs">Kelurahan/Desa</p><p className="font-medium">{applicant?.village || '-'}</p></div><div><p className="text-muted-foreground text-xs">Kode Pos</p><p className="font-medium">{applicant?.postal_code || '-'}</p></div><div className="col-span-1 sm:col-span-2"><p className="text-muted-foreground text-xs">Alamat Detail</p><p className="font-medium break-words">{applicant?.address || '-'}</p></div></div></div>
              <div className="col-span-1 sm:col-span-2"><p className="text-muted-foreground text-xs mb-2">Data Orang Tua/Wali</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100"><div><p className="text-muted-foreground text-[11px]">Nama Ayah</p><p className="text-sm font-medium break-words">{applicant?.father_name || applicant?.parent_name || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">No. WA Ayah</p><p className="text-sm font-medium break-words">{applicant?.father_phone || applicant?.parent_phone || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">Pekerjaan Ayah</p><p className="text-sm font-medium break-words">{applicant?.father_job || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">Nama Ibu</p><p className="text-sm font-medium break-words">{applicant?.mother_name || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">No. WA Ibu</p><p className="text-sm font-medium break-words">{applicant?.mother_phone || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">Pekerjaan Ibu</p><p className="text-sm font-medium break-words">{applicant?.mother_job || '-'}</p></div>{applicant?.guardian_name && (<><div><p className="text-muted-foreground text-[11px]">Nama Wali</p><p className="text-sm font-medium break-words">{applicant?.guardian_name}</p></div><div><p className="text-muted-foreground text-[11px]">Pekerjaan Wali</p><p className="text-sm font-medium break-words">{applicant?.guardian_job || '-'}</p></div></>)}<div><p className="text-muted-foreground text-[11px]">Email Orang Tua/Wali</p><p className="text-sm font-medium break-all">{applicant?.parent_email || '-'}</p></div><div><p className="text-muted-foreground text-[11px]">Penghasilan Per Bulan</p><p className="text-sm font-medium break-words">{applicant?.parent_income || '-'}</p></div></div></div>
              <div className="col-span-1 sm:col-span-2"><p className="text-muted-foreground text-xs">Asal Sekolah</p><p className="font-medium break-words">{applicant?.previous_school || '-'}</p></div>
              <div className="col-span-1 sm:col-span-2"><p className="text-muted-foreground text-xs mb-1">Riwayat Kesehatan</p><HealthIdentificationViewer data={applicant?.disease_history} /></div>
              <div><p className="text-muted-foreground text-xs">Waktu Daftar</p><p className="font-medium">{applicant?.created_at ? new Date(applicant.created_at).toLocaleString('id-ID') : '-'}</p></div>
            </div>
          </SectionCard>
          <DeviceSessionsCard
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            refreshing={sessionsRefreshing}
            onRefresh={loadSessions}
            onRevoke={handleRevoke}
            revokingId={revokingId}
          />
        </div>
      </div>
    </div>
  )
}