import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Button } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Waves, FileText, CheckCircle, Save, ArrowRight, Activity, Users } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { TabsTrigger } from "@/components/ui"
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import TabsBarCard from '@/components/shared/TabsBarCard'

export default function MouPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()

  const [mouTemplate, setMouTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [mouData, setMouData] = useState<any>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [tab, setTab] = useState<'review' | 'template'>('review')

  const activeWaveQuery = useQuery({
    queryKey: ['waves'],
    queryFn: async () => {
      const res = await apiFetch<any[]>('/ppdb/waves')
      const active = res.find(w => w.status === 'active')
      return active || null
    }
  })

  const activeWave = activeWaveQuery.data ?? null
  const wavesLoading = activeWaveQuery.isLoading

  const applicantsQuery = useQuery({
    queryKey: ['mou-applicants'],
    queryFn: async () => {
      const res = await apiFetch<any>('/payment/stage2/applicants')
      return (res.data || []) as any[]
    }
  })

  const applicants = applicantsQuery.data || []
  const loading = applicantsQuery.isLoading

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!activeWave) return
      await apiFetch(`/ppdb/waves/${activeWave.id}/mou-template`, {
        method: 'PUT',
        body: JSON.stringify({ mou_template: mouTemplate })
      })
    },
    onSuccess: () => {
      toast('success', 'Template MOU berhasil disimpan')
      queryClient.invalidateQueries({ queryKey: ['waves'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan template MOU')
  })

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

  const oldMouTemplate = useRef('')
  useEffect(() => {
    if (activeWave && activeWave.mou_template !== oldMouTemplate.current) {
      oldMouTemplate.current = activeWave.mou_template || ''
      setMouTemplate(oldMouTemplate.current)
    }
  }, [activeWave])

  const handleSaveTemplate = async () => {
    setSavingTemplate(true)
    try {
      await saveTemplateMutation.mutateAsync()
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Review MOU"
        description="Tinjau template draft dan status penandatanganan persetujuan peserta."
        loading={wavesLoading}
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWave?.name || 'Tidak ada', active: !!activeWave, pulse: !!activeWave },
          { icon: Users, label: 'Persetujuan', value: loading ? '…' : `${applicants.length} dokumen`, active: true },
        ]}
      />

      {!wavesLoading && !activeWave && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu." />
      )}

      <TabsBarCard defaultValue="review" onValueChange={(v) => setTab(v as any)} className="max-w-md">
        <TabsTrigger value="review" className="flex-1 rounded-full text-xs sm:text-sm">Daftar Persetujuan</TabsTrigger>
        <TabsTrigger value="template" className="flex-1 rounded-full text-xs sm:text-sm">Edit Draft Persyaratan</TabsTrigger>
      </TabsBarCard>

      {tab === 'template' && (
        <div className="space-y-4">
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
        </div>
      )}

      {tab === 'review' && (
        <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-emerald-primary/5">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Peserta</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jalur Pendaftaran</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status MOU</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Aksi</TableHead>
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
                              : "Belum ada peserta lulus. MOU terbit otomatis setelah diskon Tahap 2 disimpan."
                          }
                          className="bg-transparent border-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    applicants.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-primary to-emerald-dark text-xs font-bold text-white">
                              {(a.full_name || 'A').split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{a.full_name}</div>
                              <div className="text-xs text-muted-foreground">{a.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize text-slate-600">
                          {a.registration_path || '-'}
                        </TableCell>
                        <TableCell>
                          {a.mou_status === 'signed' ? (
                            <Badge variant="success">Ditandatangani</Badge>
                          ) : a.mou_status ? (
                            <Badge variant="info">Menunggu TTD</Badge>
                          ) : (
                            <Badge variant="secondary">Belum Terbit</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => openMouSheet(a)} disabled={!a.mou_status}>
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
      )}

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
