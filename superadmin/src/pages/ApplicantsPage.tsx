import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Eye, Search, GraduationCap } from 'lucide-react'

export default function ApplicantsPage() {
  const { toast } = useToast()
  
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)

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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-emerald-primary" />
          Akun Pendaftar (PPDB)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar akun pendaftar yang otomatis dibuat oleh sistem.
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : applicants.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada pendaftar.</TableCell></TableRow>
              ) : (
                applicants.map((a) => (
                  <TableRow key={a.id}>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedApplicant(a)} title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
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
                  <p className="text-muted-foreground text-xs">Gelombang</p>
                  <p className="font-medium">{selectedApplicant.wave_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                  <p className="font-medium">{new Date(selectedApplicant.created_at).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
