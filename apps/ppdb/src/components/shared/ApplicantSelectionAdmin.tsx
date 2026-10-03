import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Textarea } from '@/components/ui'
import { Award, Brain, MessageSquare, Save, AlertCircle, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { useToast } from '@/components/Toast'
import ApplicantTranscriptModal from './ApplicantTranscriptModal'
import ApplicantLoAModal from './ApplicantLoAModal'

interface Criteria {
  id: string
  name: string
  weight: number
}

interface Category {
  id: string
  name: string
  criteria?: Criteria[]
}

interface SelectionResultResponse {
  result_id: string | null
  applicant_id: string
  session_id: string | null
  notes: string | null
  scores: Array<{ criteria_id: string; score: number }>
  tiu_score: number | null
  tiu_completed_at: string | null
}

interface ApplicantSelectionAdminProps {
  applicantId: string
  registrationPath?: string
  applicantStatus?: string
  onSaved?: () => void
}

export default function ApplicantSelectionAdmin({
  applicantId,
  registrationPath = '',
  applicantStatus = '',
  onSaved,
}: ApplicantSelectionAdminProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<string>('')
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [loaOpen, setLoaOpen] = useState(false)

  const statusMutation = useMutation({
    mutationFn: async (newStatus: 'passed' | 'failed') => {
      return await apiFetch(`/selection/applicants/${applicantId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: notes.trim() || null,
        }),
      })
    },
    onSuccess: (_, newStatus) => {
      toast(
        'success',
        newStatus === 'passed'
          ? 'Pendaftar berhasil dinyatakan LULUS! Notifikasi WA otomatis dikirim.'
          : 'Pendaftar dinyatakan TIDAK LULUS. Notifikasi WA otomatis dikirim.'
      )
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      queryClient.invalidateQueries({ queryKey: ['selection-result', applicantId] })
      if (onSaved) onSaved()
    },
    onError: (err: any) => {
      toast('error', err?.message || 'Gagal memperbarui status kelulusan')
    },
  })

  // 1. Fetch categories & criteria
  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['selection-categories'],
    queryFn: async () => {
      const res = await apiFetch<{ data: Category[] }>('/selection/categories')
      return res.data || []
    },
  })

  // 2. Fetch applicant's current scores & result
  const { data: resultData, isLoading: loadingResult } = useQuery({
    queryKey: ['selection-result', applicantId],
    queryFn: async () => {
      return await apiFetch<SelectionResultResponse>(`/selection/results/${applicantId}`)
    },
    enabled: !!applicantId,
  })

  // Sync state when resultData is loaded
  useEffect(() => {
    if (resultData) {
      const initialScores: Record<string, number> = {}
      if (resultData.scores && Array.isArray(resultData.scores)) {
        resultData.scores.forEach((s) => {
          initialScores[s.criteria_id] = s.score
        })
      }
      setScores(initialScores)
      setNotes(resultData.notes || '')
    }
  }, [resultData])

  // Mutation to save scores
  const saveMutation = useMutation({
    mutationFn: async () => {
      const scoreList = Object.entries(scores)
        .filter(([_, score]) => typeof score === 'number' && !isNaN(score))
        .map(([criteria_id, score]) => ({
          criteria_id,
          score: Number(score),
        }))

      return await apiFetch('/selection/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_id: applicantId,
          scores: scoreList,
          notes: notes.trim() || null,
        }),
      })
    },
    onSuccess: () => {
      toast('success', 'Nilai dan catatan seleksi berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['selection-result', applicantId] })
      queryClient.invalidateQueries({ queryKey: ['selection-results'] })
      if (onSaved) onSaved()
    },
    onError: (err: any) => {
      toast('error', err?.message || 'Gagal menyimpan nilai seleksi')
    },
  })

  const handleScoreChange = (criteriaId: string, value: string) => {
    const num = parseFloat(value)
    setScores((prev) => ({
      ...prev,
      [criteriaId]: isNaN(num) ? 0 : Math.max(0, Math.min(100, num)),
    }))
  }

  const isLoading = loadingCategories || loadingResult

  if (isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Memuat data seleksi dan penilaian...
      </div>
    )
  }

  const categories = categoriesData || []
  const tiuScore = resultData?.tiu_score
  const tiuCompletedAt = resultData?.tiu_completed_at

  return (
    <div className="space-y-6">
      {/* 1. SEKSI HASIL UJIAN TIU (OTOMATIS) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Hasil Ujian TIU (Tes Inteligensi Umum)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs bg-background">
              Otomatis Webhook
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiuScore != null ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-background rounded-lg border">
              <div>
                <p className="text-xs text-muted-foreground">Nilai TIU Terverifikasi</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold text-primary">{tiuScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              {tiuCompletedAt && (
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p>Diselesaikan pada:</p>
                  <p className="font-medium text-foreground">
                    {new Date(tiuCompletedAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-background rounded-lg border flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">
                  Belum ada nilai TIU tersimpan
                </p>
                <p>
                  Soal disinkronkan dari Google Form dan nilai masuk secara *real-time* via webhook Apps Script setelah pendaftar mengerjakan ujian di SEB.
                </p>
                {registrationPath && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    Jalur: {registrationPath.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SEKSI PENILAIAN PENGUJI (TAHFIDZ & WAWANCARA) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-sm">
            Rubrik Penilaian Penguji & Pewawancara
          </h3>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
            Belum ada struktur rubrik penilaian yang dibuat di backoffice.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-muted/40 py-2.5 px-4 border-b">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{category.name}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Rubrik Dinamis
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {(!category.criteria || category.criteria.length === 0) ? (
                    <p className="text-xs text-muted-foreground italic">
                      Tidak ada kriteria penilaian dalam kategori ini.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {category.criteria.map((cr) => (
                        <div
                          key={cr.id}
                          className="flex flex-col justify-between p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
                        >
                          <div className="mb-2">
                            <p className="font-medium text-xs text-foreground">
                              {cr.name}
                            </p>
                            {cr.weight > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                Bobot: {cr.weight}%
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              placeholder="0 - 100"
                              value={scores[cr.id] !== undefined ? scores[cr.id] : ''}
                              onChange={(e) => handleScoreChange(cr.id, e.target.value)}
                              className="h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 3. SEKSI CATATAN EVALUATOR */}
      <Card>
        <CardHeader className="py-2.5 px-4 border-b bg-muted/40">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Catatan Evaluator / Penguji</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Textarea
            placeholder="Tuliskan catatan khusus penguji mengenai hasil Tahfidz, sikap wawancara, atau rekomendasi..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-xs"
          />
        </CardContent>
      </Card>

      {/* 4. SEKSI KEPUTUSAN FINAL (LULUS / TIDAK LULUS) */}
      <Card className="border-t-2 border-t-primary">
        <CardHeader className="py-2.5 px-4 border-b bg-muted/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span>Keputusan Seleksi Final</span>
            </CardTitle>
            <Badge
              variant={
                applicantStatus === 'passed'
                  ? 'success'
                  : applicantStatus === 'failed'
                  ? 'destructive'
                  : 'outline'
              }
              className="text-xs uppercase"
            >
              {applicantStatus === 'passed'
                ? 'Lulus Seleksi'
                : applicantStatus === 'failed'
                ? 'Tidak Lulus'
                : 'Menunggu Keputusan'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {applicantStatus === 'passed'
              ? 'Pendaftar telah dinyatakan LULUS. Dokumen LoA dan tagihan DP tahap 2 aktif untuk pendaftar ini.'
              : applicantStatus === 'failed'
              ? 'Pendaftar telah dinyatakan TIDAK LULUS seleksi.'
              : 'Setelah nilai Tahfidz dan Wawancara lengkap tersimpan, tetapkan keputusan akhir seleksi santri.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
              size="sm"
              disabled={statusMutation.isPending || applicantStatus === 'passed'}
              onClick={() => {
                if (
                  confirm(
                    'Tetapkan santri ini LULUS seleksi? Sistem akan otomatis mengirimkan notifikasi WhatsApp hasil kelulusan.'
                  )
                ) {
                  statusMutation.mutate('passed')
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {applicantStatus === 'passed' ? 'Sudah Ditetapkan Lulus' : 'Tetapkan Lulus'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              disabled={statusMutation.isPending || applicantStatus === 'failed'}
              onClick={() => {
                if (
                  confirm(
                    'Tetapkan santri ini TIDAK LULUS? Sistem akan mengirimkan pesan notifikasi hasil seleksi.'
                  )
                ) {
                  statusMutation.mutate('failed')
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              {applicantStatus === 'failed' ? 'Sudah Dinyatakan Tidak Lulus' : 'Tetapkan Tidak Lulus'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. SEKSI DOKUMEN RESMI HASIL SELEKSI (TRANSKRIP & LoA) */}
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Dokumen Resmi Hasil Seleksi Santri</p>
            <p>Cetak lembar Transkrip Nilai lengkap dan Surat Penerimaan (LoA) resmi berkop lembaga.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial h-8 text-xs gap-1.5"
              onClick={() => setTranscriptOpen(true)}
            >
              <FileText className="h-3.5 w-3.5 text-primary" /> Transkrip Nilai
            </Button>
            <Button
              variant={applicantStatus === 'passed' ? 'default' : 'secondary'}
              size="sm"
              className="flex-1 sm:flex-initial h-8 text-xs gap-1.5"
              onClick={() => setLoaOpen(true)}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" /> Dokumen LoA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6. ACTIONS: SIMPAN SKOR */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            'Menyimpan...'
          ) : (
            <>
              <Save className="h-4 w-4" /> Simpan Nilai Seleksi
            </>
          )}
        </Button>
      </div>

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
    </div>
  )
}
