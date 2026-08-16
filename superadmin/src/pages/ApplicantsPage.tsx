import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Search, GraduationCap, UserRoundSearch, KeyRound, CheckCircle2 } from 'lucide-react'

export default function ApplicantsPage() {
  const { toast } = useToast()
  
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetApplicant, setResetApplicant] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<any>(null)

  const fetchApplicants = async (q = search) => {
    setLoading(true)
    try {
      const res = await api.getApplicants({ search: q })
      setApplicants((res as any).data || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat pendaftar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplicants()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchApplicants()
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-emerald-primary" />
          Akun Pendaftar (PPDB)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar akun pendaftar yang otomatis dibuat oleh sistem. Klik baris untuk melihat detail.
        </p>
      </div>

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Pendaftar</TableHead>
                <TableHead>Email / No. WA</TableHead>
                <TableHead>Gelombang</TableHead>
                <TableHead>Jalur / Jenjang</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
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
                    className="cursor-pointer"
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
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedApplicant} onOpenChange={(v: boolean) => !v && setSelectedApplicant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pendaftar</DialogTitle>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                  <p className="font-medium">{selectedApplicant.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant="secondary" className="uppercase text-[10px] mt-1">{selectedApplicant.status.replace('_', ' ')}</Badge>
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
                  <p className="text-muted-foreground text-xs">NISN</p>
                  <p className="font-medium">{selectedApplicant.nisn || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">NIK</p>
                  <p className="font-medium">{selectedApplicant.nik || '-'}</p>
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
                  <p className="text-muted-foreground text-xs">Pilihan Jurusan</p>
                  <p className="font-medium">{selectedApplicant.major_choice || '-'}</p>
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
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={(v: boolean) => !v && setResetOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password Pendaftar</DialogTitle>
          </DialogHeader>
          {resetApplicant && (
            <>
              {resetResult ? (
                <div className="space-y-4 pt-4">
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
                  <DialogFooter>
                    <Button className="w-full" onClick={() => { setResetOpen(false); setSelectedApplicant(null) }}>
                      Selesai
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Password baru untuk <span className="font-semibold text-foreground">{resetApplicant.full_name}</span> ({resetApplicant.username || 'tanpa username'}). Password dibuat otomatis oleh sistem.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={resetPassword}
                        placeholder="Klik Generate untuk membuat password"
                        readOnly
                        className="font-mono select-none"
                        onKeyDown={(e) => e.preventDefault()}
                      />
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        <KeyRound className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={resetting || !resetPassword}>
                      {resetting ? 'Memproses...' : 'Reset Password & Kirim Notif'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
