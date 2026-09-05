import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { Waves, FileText, CheckCircle, FileSignature, Save } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"

export default function MouPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')

  const [activeWave, setActiveWave] = useState<any>(null)
  const [wavesLoading, setWavesLoading] = useState(false)
  const [mouTemplate, setMouTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [mouData, setMouData] = useState<any>(null)
  const [sheetLoading, setSheetLoading] = useState(false)

  const fetchActiveWave = async () => {
    setWavesLoading(true)
    try {
      const res = await apiFetch<any[]>('/ppdb/waves')
      const active = res.find(w => w.status === 'active')
      if (active) {
        setActiveWave(active)
        setMouTemplate(active.mou_template || '')
      }
    } catch {
      toast('error', 'Gagal memuat gelombang')
    } finally {
      setWavesLoading(false)
    }
  }

  const fetchApplicants = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<any>('/payment/stage2/applicants')
      const passed = (res.data || []).filter((a: any) => a.mou_status)
      setApplicants(passed)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveWave()
    fetchApplicants()
  }, [])

  const handleSaveTemplate = async () => {
    if (!activeWave) return
    setSavingTemplate(true)
    try {
      await apiFetch(`/ppdb/waves/${activeWave.id}/mou-template`, {
        method: 'PUT',
        body: JSON.stringify({ mou_template: mouTemplate })
      })
      toast('success', 'Template MOU berhasil disimpan')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan template MOU')
    } finally {
      setSavingTemplate(false)
    }
  }

  const openMouSheet = async (applicant: any) => {
    setSelectedApplicant(applicant)
    setSheetLoading(true)
    try {
      const res = await apiFetch<any>(`/ppdb/applicants/${applicant.id}/mou`)
      setMouData(res.mou)
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat MOU')
    } finally {
      setSheetLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" />
          Manajemen MOU
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola template dokumen persetujuan (MOU) dan tinjau status penandatanganan dari peserta.
        </p>
      </div>

      {!wavesLoading && !activeWave && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Waves className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu.
          </span>
        </div>
      )}

      <Tabs defaultValue="review" className="space-y-4">
        <TabsList>
          <TabsTrigger value="review">Daftar Persetujuan</TabsTrigger>
          <TabsTrigger value="template">Edit Draft Persyaratan</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Poin-Poin Kesepakatan</h3>
                  <p className="text-sm text-muted-foreground">Ketikkan poin-poin persyaratan atau tata tertib yang harus disepakati oleh pendaftar.</p>
                </div>

                <textarea
                  className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  placeholder="Contoh:&#10;1. Wajib menaati seluruh tata tertib sekolah.&#10;2. Biaya yang sudah dibayarkan tidak dapat ditarik kembali."
                  value={mouTemplate}
                  onChange={e => setMouTemplate(e.target.value)}
                  disabled={!canCrud || !activeWave || savingTemplate}
                />

                {canCrud && (
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveTemplate} disabled={!activeWave || savingTemplate} className="gap-2">
                      <Save className="h-4 w-4" />
                      Simpan Template
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead>Nama Peserta</TableHead>
                    <TableHead>Jenjang / Jalur</TableHead>
                    <TableHead>Status MOU</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeletonRows cols={4} rows={5} />
                  ) : applicants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8">
                        <EmptyState
                          icon={!activeWave ? Waves : FileText}
                          title={!activeWave ? "Tidak Ada Gelombang Aktif" : "Tidak Ada Data"}
                          description={
                            !activeWave
                              ? "Aktifkan gelombang terlebih dahulu."
                              : "Belum ada dokumen MOU yang diterbitkan."
                          }
                          className="bg-transparent border-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    applicants.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.full_name}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </TableCell>
                        <TableCell>
                          {a.registration_level} / {a.registration_path}
                        </TableCell>
                        <TableCell>
                          {a.mou_status === 'signed' ? (
                            <Badge variant="success">Ditandatangani</Badge>
                          ) : (
                            <Badge variant="info">Menunggu TTD</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openMouSheet(a)}>
                            Lihat Dokumen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={selectedApplicant !== null} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Dokumen MOU - {selectedApplicant?.full_name}</SheetTitle>
          </SheetHeader>

          {sheetLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-muted animate-pulse rounded w-1/3"></div>
              <div className="h-32 bg-muted animate-pulse rounded w-full"></div>
            </div>
          ) : !mouData ? (
            <div className="text-sm text-muted-foreground">Dokumen MOU tidak ditemukan.</div>
          ) : (
            <div className="space-y-6">
              {mouData.status === 'signed' ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="font-semibold">Sudah Ditandatangani</div>
                    <div className="text-xs opacity-80">
                      Pada: {new Date(mouData.signed_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>MOU masih menunggu persetujuan dan tanda tangan wali/peserta.</span>
                </div>
              )}

              <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mouData.draft_content }} />

                {mouData.status === 'signed' && (
                  <div className="border-t bg-slate-50 p-6 flex flex-col items-end">
                    <div className="text-sm text-muted-foreground mb-4">Tanda Tangan Digital</div>
                    <img src={mouData.signature_data} alt="Signature" className="h-24 bg-white border rounded shadow-sm" />
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
