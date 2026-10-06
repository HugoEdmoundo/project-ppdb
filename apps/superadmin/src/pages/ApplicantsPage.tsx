import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../api/client'
import type { ApplicantPeriod, ApplicantWave } from '../api/client'
import { useToast } from '../components/Toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  SelectField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundSearch,
  Waves,
} from 'lucide-react'
import PageHero from '../components/PageHero'
import { generateSecurePassword } from '../lib/password'
import ApplicantForm, {
  APPLICANT_STATUSES,
  PAYMENT_STATUSES,
} from '../components/applicants/ApplicantForm'

const ALL = '__all__'
const perPage = 20

/** Label "Periode · Gelombang" untuk distinguishes asal pendaftar. */
function scopeLabel(a: any): { text: string; muted: string } {
  const period = a.period_name || 'Tanpa Periode'
  const wave = a.wave_name || 'Tanpa Gelombang'
  return { text: period, muted: wave }
}

function statusLabel(status: string): string {
  return (
    APPLICANT_STATUSES.find((s) => s.value === status)?.label ??
    (status || '-').replace(/_/g, ' ')
  )
}

export default function ApplicantsPage() {
  const { toast } = useToast()

  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [periods, setPeriods] = useState<ApplicantPeriod[]>([])
  const [waves, setWaves] = useState<ApplicantWave[]>([])
  const [periodFilter, setPeriodFilter] = useState(ALL)
  const [waveFilter, setWaveFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [paymentFilter, setPaymentFilter] = useState(ALL)

  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<any>(null)

  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetApplicant, setResetApplicant] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<any>(null)

  // Gelombang yang tampil di dropdown mengikuti filter periode.
  const waveOptions = buildWaveOptions(waves, periodFilter)

  const fetchApplicants = useCallback(
    async (p = page) => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = {
          search,
          page: p,
          perPage,
        }
        if (periodFilter !== ALL) params.period_id = periodFilter
        if (waveFilter !== ALL) params.wave_id = waveFilter
        if (statusFilter !== ALL) params.status = statusFilter
        if (paymentFilter !== ALL) params.payment_status = paymentFilter

        const res: any = await api.getApplicants(params)
        const newestTotal = res?.total ?? 0
        const tp = Math.max(1, Math.ceil(newestTotal / perPage))
        if (p > tp) {
          // Halaman sekarang di luar jangkauan setelah filter berubah.
          setPage(tp)
          const clamped: any = await api.getApplicants({ ...params, page: tp })
          setApplicants(clamped?.data || [])
          setTotal(clamped?.total ?? newestTotal)
          return
        }
        setApplicants(res?.data || [])
        setTotal(newestTotal)
      } catch (e: any) {
        toast('error', e.message || 'Gagal memuat pendaftar')
      } finally {
        setLoading(false)
      }
    },
    [search, page, periodFilter, waveFilter, statusFilter, paymentFilter, toast]
  )

  useEffect(() => {
    // Muat pilihan filter sekali di awal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ;(async () => {
      try {
        const [p, w] = await Promise.all([api.getPeriods(), api.getWaves()])
        setPeriods(p)
        setWaves(w)
      } catch {
        // Filter bersifat opsional — abaikan kegagalan.
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplicants(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, waveFilter, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasFilter =
    periodFilter !== ALL ||
    waveFilter !== ALL ||
    statusFilter !== ALL ||
    paymentFilter !== ALL

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchApplicants(1)
  }

  function openDetail(a: any) {
    setSelected(a)
    setDetail(a)
    setDetailLoading(true)
    api
      .getApplicant(a.id)
      .then((full: any) => setDetail(full))
      .catch((e: any) => toast('error', e.message || 'Gagal memuat detail'))
      .finally(() => setDetailLoading(false))
  }

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setCreatedCreds(null)
    setFormOpen(true)
  }

  function openEdit(a: any) {
    setFormMode('edit')
    setEditing(a)
    setCreatedCreds(null)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: Record<string, string>) {
    setSaving(true)
    try {
      if (formMode === 'create') {
        const res: any = await api.createApplicant(payload)
        setCreatedCreds(res?.credentials || null)
        toast('success', 'Pendaftar berhasil dibuat')
        setFormOpen(false)
        setSelected(null)
        setDetail(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchApplicants(1)
      } else {
        await api.updateApplicant(editing.id, payload)
        toast('success', 'Data pendaftar diperbarui')
        setFormOpen(false)
        setSelected(null)
        setDetail(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchApplicants()
      }
    } catch (err: any) {
      toast('error', err.message || 'Gagal menyimpan pendaftar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteApplicant(deleteTarget.id)
      toast('success', 'Pendaftar & seluruh datanya dihapus permanen')
      setDeleteTarget(null)
      setSelected(null)
      setDetail(null)
      if (applicants.length === 1 && page > 1) setPage(page - 1)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchApplicants()
    } catch (err: any) {
      toast('error', err.message || 'Gagal menghapus pendaftar')
    } finally {
      setDeleting(false)
    }
  }

  function openReset(a: any) {
    setResetApplicant(a)
    setResetPassword('')
    setResetResult(null)
    setResetOpen(true)
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (!resetApplicant) return
    if (!resetPassword) {
      toast('warning', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }
    setResetting(true)
    try {
      const res: any = await api.resetApplicantPassword(
        resetApplicant.id,
        resetPassword
      )
      if (res?.changed) {
        setResetResult(res)
        toast('success', 'Password direset & notifikasi dikirim via WhatsApp')
      } else {
        toast('warning', res?.message || 'Password tidak diubah')
        setResetOpen(false)
      }
    } catch (err: any) {
      toast('error', err.message || 'Gagal mereset password')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="PPDB"
        title="Data Pendaftar"
        description="Seluruh pendaftar dari semua periode & gelombang. Filter bersifat opsional; tiap baris membawa label periode dan gelombang asalnya."
        loading={loading && applicants.length === 0}
        chips={[
          { icon: GraduationCap, label: `${total} Pendaftar` },
          {
            icon: Waves,
            label: hasFilter ? 'Filter aktif' : 'Semua periode & gelombang',
          },
          {
            icon: CheckCircle2,
            label: `${applicants.filter((a) => a.payment_status === 'paid').length} Lunas (halaman ini)`,
          },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Pendaftar
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / email / NISN / telepon..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SelectField
              label="Periode"
              value={periodFilter}
              onValueChange={(v) => {
                setPeriodFilter(v)
                setWaveFilter(ALL)
              }}
              options={[
                { value: ALL, label: 'Semua Periode' },
                ...periods.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <SelectField
              label="Gelombang"
              value={waveFilter}
              onValueChange={setWaveFilter}
              options={waveOptions}
            />
            <SelectField
              label="Status Pendaftaran"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: ALL, label: 'Semua Status' },
                ...APPLICANT_STATUSES,
              ]}
            />
            <SelectField
              label="Status Pembayaran"
              value={paymentFilter}
              onValueChange={setPaymentFilter}
              options={[
                { value: ALL, label: 'Semua Pembayaran' },
                ...PAYMENT_STATUSES,
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Pendaftar</TableHead>
                <TableHead>Email / No. WA</TableHead>
                <TableHead>Periode / Gelombang</TableHead>
                <TableHead>Jalur / Jenjang</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <EmptyState
                      icon={UserRoundSearch}
                      title={hasFilter ? 'Tidak Ada Pendaftar' : 'Belum Ada Pendaftar'}
                      description={
                        hasFilter
                          ? 'Tidak ada pendaftar yang cocok dengan filter atau kata kunci ini.'
                          : 'Belum ada akun pendaftar. Data muncul otomatis saat calon siswa mendaftar, atau buat sendiri lewat tombol Tambah Pendaftar.'
                      }
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a) => {
                  const scope = scopeLabel(a)
                  return (
                    <TableRow
                      key={a.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openDetail(a)}
                    >
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell className="text-sm">
                        {a.email} <br />
                        <span className="text-muted-foreground">{a.phone}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                          {scope.text}
                        </span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {scope.muted}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {a.registration_path || '-'} <br />
                        <span className="font-medium">{a.registration_level}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.payment_status === 'paid'
                              ? 'success'
                              : a.payment_status === 'expired'
                                ? 'destructive'
                                : 'warning'
                          }
                        >
                          {(a.payment_status || 'pending').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(a.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reset password"
                            onClick={() => openReset(a)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Hapus permanen"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Halaman {page} dari {totalPages} ({total} pendaftar)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setPage(page - 1)
                    fetchApplicants(page - 1)
                  }}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    setPage(page + 1)
                    fetchApplicants(page + 1)
                  }}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null)
          setDetail(null)
        }}
        title="Detail Pendaftar"
        size="xl"
        footer={
          detail ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null)
                  openEdit(detail)
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setSelected(null)
                  setDeleteTarget(detail)
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-6">
            {detailLoading && (
              <p className="text-xs text-muted-foreground">Memuat data lengkap...</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                <p className="font-medium">{detail.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                <Badge
                  className="mt-1"
                  variant={
                    detail.payment_status === 'paid'
                      ? 'success'
                      : detail.payment_status === 'expired'
                        ? 'destructive'
                        : 'warning'
                  }
                >
                  {(detail.payment_status || 'pending').toUpperCase()}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{detail.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">No. WhatsApp</p>
                <p className="font-medium">{detail.phone}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Periode</p>
                <p className="font-medium">{detail.period_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gelombang</p>
                <p className="font-medium">{detail.wave_name || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
                <p className="font-medium capitalize">
                  {detail.registration_path || '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenjang Tujuan</p>
                <p className="font-medium">{detail.registration_level || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p>
                <p className="font-medium">
                  {detail.birth_place || '-'}, {detail.birth_date || '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                <p className="font-medium">
                  {detail.gender === 'L'
                    ? 'Laki-laki'
                    : detail.gender === 'P'
                      ? 'Perempuan'
                      : '-'}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">NISN</p>
                <p className="font-medium">{detail.nisn || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">NIK</p>
                <p className="font-medium">{detail.nik || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Nama Orang Tua/Wali</p>
                <p className="font-medium">{detail.parent_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Asal Sekolah</p>
                <p className="font-medium">{detail.previous_school || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                <p className="font-medium">
                  {detail.created_at
                    ? new Date(detail.created_at).toLocaleString('id-ID')
                    : '-'}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {(
                  [
                    ['Provinsi', detail.province],
                    ['Kota/Kabupaten', detail.city],
                    ['Kecamatan', detail.district],
                    ['Kelurahan/Desa', detail.village],
                    ['Kode Pos', detail.postal_code],
                    ['Pilihan Jurusan', detail.major_choice],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-medium">{value || '-'}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Alamat Detail</p>
                  <p className="font-medium">{detail.address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">
                    Riwayat Penyakit / Alergi
                  </p>
                  <p className="font-medium whitespace-pre-line">
                    {detail.disease_history || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold text-foreground mb-3">
                Kredensial Login
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Username</p>
                  <p className="font-mono font-medium">{detail.username || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Password</p>
                  <p className="font-mono font-medium text-muted-foreground">
                    ••••••
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => openReset(detail)}
              >
                <KeyRound className="h-4 w-4 mr-1" />
                Reset Password (Generate)
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Password baru dibuat sistem lalu dikirim ke nomor WhatsApp pendaftar.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === 'create' ? 'Tambah Pendaftar' : 'Edit Pendaftar'}
        size="lg"
      >
        <ApplicantForm
          mode={formMode}
          initial={editing}
          waves={waves}
          submitting={saving}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
          submitLabel={formMode === 'create' ? 'Buat Pendaftar' : 'Simpan Perubahan'}
        />
      </Modal>

      {/* Kredensial hasil create — hanya ditampilkan sekali */}
      <Modal
        isOpen={!!createdCreds}
        onClose={() => setCreatedCreds(null)}
        title="Pendaftar Dibuat"
        size="sm"
        footer={
          <Button className="w-full" onClick={() => setCreatedCreds(null)}>
            Selesai
          </Button>
        }
      >
        {createdCreds && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-semibold text-foreground">
                Data pendaftar tersimpan
              </p>
              <p className="text-xs text-muted-foreground">
                Kredensial di bawah hanya ditampilkan sekali dan kredensial ini juga
                dikirim ke nomor WhatsApp pendaftar.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <div>
                <p className="text-muted-foreground text-xs">Username</p>
                <p className="font-mono font-medium">{createdCreds.username}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Password</p>
                <p className="font-mono font-semibold text-primary">
                  {createdCreds.password}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Username: ${createdCreds.username}\nPassword: ${createdCreds.password}`
                )
                toast('success', 'Kredensial disalin')
              }}
            >
              Salin Kredensial
            </Button>
          </div>
        )}
      </Modal>

      {/* Hapus permanen */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Pendaftar Permanen?"
        message={
          deleteTarget
            ? `Data ${deleteTarget.full_name} beserta akun, dokumen, pembayaran, nilai, dan seluruh riwayat terkait akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?`
            : ''
        }
        confirmLabel="Hapus Permanen"
        variant="destructive"
        loading={deleting}
      />

      {/* Reset Password */}
      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password Pendaftar"
        size="md"
        footer={
          resetApplicant && !resetResult ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                form="reset-password-form"
                disabled={resetting || !resetPassword}
                loading={resetting}
              >
                Reset &amp; Kirim via WhatsApp
              </Button>
            </>
          ) : resetResult ? (
            <Button
              className="w-full"
              onClick={() => {
                setResetOpen(false)
                setSelected(null)
                setDetail(null)
              }}
            >
              Selesai
            </Button>
          ) : undefined
        }
      >
        {resetApplicant && (
          <>
            {resetResult ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm font-semibold text-foreground">
                    Password berhasil direset
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notifikasi kredensial baru dikirim ke WhatsApp pendaftar.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Username</p>
                      <p className="font-mono font-medium">{resetResult.username}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Password Baru</p>
                      <p className="font-mono font-semibold text-primary">
                        {resetResult.password}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      navigator.clipboard?.writeText(resetResult.password)
                      toast('success', 'Password disalin')
                    }}
                  >
                    Salin Password
                  </Button>
                </div>
              </div>
            ) : (
              <form
                id="reset-password-form"
                onSubmit={handleReset}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Password baru untuk{' '}
                  <span className="font-semibold text-foreground">
                    {resetApplicant.full_name}
                  </span>{' '}
                  ({resetApplicant.username || 'tanpa username'}). Password dibuat
                  otomatis oleh sistem.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={resetPassword}
                    readOnly
                    placeholder="Klik Generate untuk membuat password"
                    className="font-mono bg-muted cursor-default"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetPassword(generateSecurePassword(8))
                      setResetResult(null)
                    }}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

/** Opsi gelombang, dibatasi ke periode terpilih bila ada. */
function buildWaveOptions(waves: ApplicantWave[], periodFilter: string) {
  const filtered =
    periodFilter === ALL
      ? waves
      : waves.filter((w) => w.period_id === periodFilter)
  return [
    { value: ALL, label: 'Semua Gelombang' },
    ...filtered.map((w) => ({
      value: w.id,
      label: `${w.name} — ${w.period_name}`,
    })),
  ]
}
