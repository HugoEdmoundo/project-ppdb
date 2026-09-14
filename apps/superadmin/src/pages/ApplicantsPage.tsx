import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Modal } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { Search, GraduationCap, UserRoundSearch, KeyRound, CheckCircle2, Waves } from 'lucide-react'
import PageHero from '../components/PageHero'

export default function ApplicantsPage() {
  const { toast } = useToast()

  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [activeWave, setActiveWave] = useState<any>(null)
  const perPage = 20
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetApplicant, setResetApplicant] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<any>(null)

  const fetchApplicants = async (q = search, p = page) => {
    setLoading(true)
    try {
      const res = await api.getApplicants({ search: q, page: p, per_page: perPage })
      setApplicants((res as any).data || [])
      setTotal((res as any).total ?? 0)
      setActiveWave((res as any).active_wave ?? null)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat pendaftar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplicants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchApplicants(search, 1)
  }

  const handlePage = (p: number) => {
    setPage(p)
    fetchApplicants(search, p)
  }

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pass = ''
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
    setResetPassword(pass)
    setResetResult(null)
  }

  function openReset(app: any) {
    setResetApplicant(app)
    setResetPassword('')
    setResetResult(null)
    setResetOpen(true)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetApplicant) return
    if (!resetPassword) {
      toast('warning', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }
    setResetting(true)
    try {
      const res = await api.resetApplicantPassword(resetApplicant.id, resetPassword)
      if (res && res.changed) {
        setResetResult(res)
        toast('success', 'Password berhasil direset & notifikasi dikirim (simulasi)')
      } else {
        toast('warning', res?.message || 'Password tidak diubah (field kosong)')
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
        title="Akun Pendaftar"
        description="Daftar akun pendaftar yang otomatis dibuat oleh sistem. Klik baris untuk melihat detail."
        loading={loading && applicants.length === 0}
        chips={[
          { icon: GraduationCap, label: `${total} Pendaftar` },
          { icon: Waves, label: activeWave?.name ?? 'Tanpa Gelombang Aktif' },
          { icon: CheckCircle2, label: `${applicants.filter((a) => a.payment_status === 'paid').length} Lunas (halaman ini)` },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / email..."
              className="pl-9"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Cari</Button>
        </form>
      </div>

      {!loading && activeWave === null && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tidak ada gelombang aktif. Aktifkan gelombang terlebih dahulu untuk melihat data pendaftar.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Pendaftar</TableHead>
                <TableHead>Email / No. WA</TableHead>
                <TableHead>Gelombang</TableHead>
                <TableHead>Jalur / Jenjang</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead>Status Dokumen</TableHead>
                <TableHead>Status Seleksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8">
                    <EmptyState
                      icon={UserRoundSearch}
                      title="Belum Ada Pendaftar"
                      description="Belum ada akun pendaftar PPDB yang dibuat oleh sistem. Data akan muncul otomatis saat calon siswa mendaftar."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedApplicant(a)}
                  >
                    <TableCell className="font-medium">{a.full_name}</TableCell>
                    <TableCell className="text-sm">
                      {a.email} <br/>
                      <span className="text-muted-foreground">{a.phone}</span>
                    </TableCell>
                    <TableCell>{a.wave_name || '-'}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {a.registration_path} <br/>
                      <span className="font-medium">{a.registration_level}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.payment_status === 'paid' ? 'success' : a.payment_status === 'expired' ? 'destructive' : 'warning'}>
                        {a.payment_status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {['passed', 'failed', 'selection'].includes(a.status) ? 'DOCUMENT APPROVED' : a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.status === 'passed' ? (
                        <Badge variant="success">LULUS</Badge>
                      ) : a.status === 'failed' ? (
                        <Badge variant="destructive">TIDAK LULUS</Badge>
                      ) : a.status === 'selection' ? (
                        <Badge variant="warning">SELEKSI</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Halaman {page} dari {totalPages} ({total} pendaftar)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedApplicant}
        onClose={() => setSelectedApplicant(null)}
        title="Detail Pendaftar"
        size="xl"
      >
        {selectedApplicant && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                <p className="font-medium">{selectedApplicant.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                <Badge variant={selectedApplicant.payment_status === 'paid' ? 'success' : selectedApplicant.payment_status === 'expired' ? 'destructive' : 'warning'} className="mt-1">
                  {selectedApplicant.payment_status?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{selectedApplicant.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">No. WhatsApp</p>
                <p className="font-medium">{selectedApplicant.phone}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
                <p className="font-medium capitalize">{selectedApplicant.registration_path}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenjang Tujuan</p>
                <p className="font-medium">{selectedApplicant.registration_level}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p>
                <p className="font-medium">{selectedApplicant.birth_place || '-'}, {selectedApplicant.birth_date || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                <p className="font-medium">{selectedApplicant.gender === 'L' ? 'Laki-laki' : selectedApplicant.gender === 'P' ? 'Perempuan' : '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">NISN</p>
                <p className="font-medium">{selectedApplicant.nisn || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">NIK</p>
                <p className="font-medium">{selectedApplicant.nik || '-'}</p>
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Provinsi</p>
                    <p className="font-medium">{selectedApplicant.province || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kota/Kabupaten</p>
                    <p className="font-medium">{selectedApplicant.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kecamatan</p>
                    <p className="font-medium">{selectedApplicant.district || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kelurahan/Desa</p>
                    <p className="font-medium">{selectedApplicant.village || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kode Pos</p>
                    <p className="font-medium">{selectedApplicant.postal_code || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Alamat Detail</p>
                    <p className="font-medium">{selectedApplicant.address || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Nama Orang Tua/Wali</p>
                <p className="font-medium">{selectedApplicant.parent_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Asal Sekolah</p>
                <p className="font-medium">{selectedApplicant.previous_school || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Gelombang</p>
                <p className="font-medium">{selectedApplicant.wave_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                <p className="font-medium">{new Date(selectedApplicant.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Kredensial Login</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Username</p>
                  <p className="font-mono font-medium">{selectedApplicant.username || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Password</p>
                  <p className="font-mono font-medium text-muted-foreground">••••••</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Password hanya muncul sekali saat pendaftaran (tersimpan terenkripsi, tidak bisa dilihat kembali).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => openReset(selectedApplicant)}
              >
                <KeyRound className="h-4 w-4 mr-1" />
                Reset Password (Generate)
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Password baru dibuat otomatis oleh sistem dan dikirim sebagai notifikasi ke pendaftar (simulasi).
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password Pendaftar"
        size="md"
        footer={
          resetApplicant && !resetResult ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>Batal</Button>
              <Button type="submit" form="reset-password-form" disabled={resetting || !resetPassword} loading={resetting}>
                Reset Password & Kirim Notif
              </Button>
            </>
          ) : resetResult ? (
            <Button className="w-full" onClick={() => { setResetOpen(false); setSelectedApplicant(null) }}>
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
                  <p className="text-sm font-semibold text-foreground">Password berhasil direset</p>
                  <p className="text-xs text-muted-foreground">
                    Notifikasi kredensial baru telah dikirim ke pendaftar (simulasi). Salin password di bawah untuk diberikan secara manual bila diperlukan.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Username</p>
                      <p className="font-mono font-medium">{resetResult.username || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Password Baru</p>
                      <p className="font-mono font-semibold text-primary">{resetResult.password}</p>
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
              <form id="reset-password-form" onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Password baru untuk <span className="font-semibold text-foreground">{resetApplicant.full_name}</span> ({resetApplicant.username || 'tanpa username'}). Password dibuat otomatis oleh sistem.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={resetPassword}
                      readOnly
                      placeholder="Klik Generate untuk membuat password"
                      className="font-mono bg-muted cursor-default"
                    />
                    <Button type="button" variant="outline" onClick={generatePassword}>
                      <KeyRound className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
