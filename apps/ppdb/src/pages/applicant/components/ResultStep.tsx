import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import ApplicantSKDModal from '@/components/shared/ApplicantSKDModal'
import ApplicantLoAModal from '@/components/shared/ApplicantLoAModal'
import { CheckCircle, MessageCircle, X, Upload, FileSignature, Receipt, AlertTriangle, Layers } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { useToast } from '@/components/Toast'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface ResultStepProps {
  applicant: any
  selectionResult: any
  loa?: any
  stage2Bills: any[]
  onUploadProof: (billId: string, e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ResultStep({ applicant, selectionResult, loa: _loa, stage2Bills, onUploadProof }: ResultStepProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showSkdModal, setShowSkdModal] = useState(false)
  const [showLoaModal, setShowLoaModal] = useState(false)
  const [selectedRapelBills, setSelectedRapelBills] = useState<string[]>([])
  const [uploadingRapel, setUploadingRapel] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<number>(3)

  const hasPaidDP = stage2Bills?.some(b => b.status === 'paid')
  const { data: skdData } = useQuery({
    queryKey: ['applicant-skd', applicant?.id],
    queryFn: () => apiFetch<any>(`/ppdb/applicants/${applicant?.id}/skd`),
    enabled: !!applicant?.id && hasPaidDP,
  })

  const installmentMutation = useMutation({
    mutationFn: (count: number) => apiFetch('/payment/stage2/my-installment-plan', {
      method: 'POST',
      body: JSON.stringify({ installment_count: count })
    }),
    onSuccess: () => {
      toast('success', 'Skema cicilan berhasil diperbarui')
      queryClient.invalidateQueries({ queryKey: ['my-stage2-bills'] })
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal mengatur skema cicilan')
    }
  })

  const handleRapelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (selectedRapelBills.length === 0) {
      toast('error', 'Pilih minimal satu cicilan untuk dibayar rapel')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 5MB')
      e.target.value = ''
      return
    }

    setUploadingRapel(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bill_ids', selectedRapelBills.join(','))

    try {
      await apiFetch('/payment/stage2/my-bills/upload-proof-batch', {
        method: 'POST',
        body: formData
      })
      toast('success', `Bukti pembayaran untuk ${selectedRapelBills.length} tagihan berhasil diunggah! Menunggu konfirmasi admin.`)
      setSelectedRapelBills([])
      queryClient.invalidateQueries({ queryKey: ['my-stage2-bills'] })
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunggah bukti rapel')
    } finally {
      setUploadingRapel(false)
      e.target.value = ''
    }
  }

  const toggleSelectBill = (id: string) => {
    setSelectedRapelBills(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  const allPendingBills = stage2Bills.filter(b => b.status === 'pending')
  const rapelTotal = allPendingBills
    .filter(b => selectedRapelBills.includes(b.id))
    .reduce((sum, b) => sum + Number(b.amount || 0), 0)

  const canConfigureInstallments = !stage2Bills.some(b => b.status === 'paid')

  return (
    <div className="space-y-6">
      {applicant?.status === 'passed' ? (
        <div className="space-y-6">
          {/* Pass Banner */}
          <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 text-center sm:text-left">
                <div className="w-12 h-12 shrink-0 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-800">Selamat! Anda Dinyatakan Lulus</h3>
                  <p className="text-emerald-700 text-sm mt-1">Selamat, Anda telah lulus seleksi PPDB Pesantren Ar-Rahman.</p>
                </div>
              </div>

              {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {selectionResult.scores.map((sc: any, idx: number) => (
                    <div key={idx} className="bg-white border border-emerald-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                        <p className="text-sm font-medium text-emerald-900">{sc.criteria_name}</p>
                      </div>
                      <div className="text-xl font-bold text-emerald-700">{sc.score}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectionResult?.notes && (
                <div className="mt-4 p-4 bg-white/70 border border-emerald-100 rounded-lg">
                  <p className="text-xs font-semibold text-emerald-800 mb-1">Catatan Kelulusan:</p>
                  <p className="text-sm text-emerald-700 leading-relaxed">{selectionResult.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LoA Section */}
          <div className="border border-emerald-200 rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-emerald-50/70 px-5 py-4 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSignature className="w-5 h-5 text-emerald-700" />
                <div>
                  <h4 className="font-semibold text-emerald-950 text-base">Letter of Acceptance (LoA)</h4>
                  <p className="text-xs text-emerald-700">Surat Resmi Penerimaan Santri Baru Pesantren Ar-Rahman</p>
                </div>
              </div>
              <Button onClick={() => setShowLoaModal(true)} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
                <FileSignature className="w-4 h-4" />
                Lihat & Cetak Dokumen LoA
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Klausul Resmi PPDB:</p>
                  <p className="mt-0.5 font-medium text-amber-800">
                    "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Klausul ini berlaku mengikat pada seluruh komponen pembayaran formulir, uang muka (DP), dan cicilan biaya pendidikan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal LoA Lengkap */}
          <ApplicantLoAModal open={showLoaModal} onOpenChange={setShowLoaModal} applicantId={applicant?.id} />

          {/* Pembayaran Tahap 2 */}
          <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-base">Pembayaran Tahap 2</h4>
                  <p className="text-xs text-muted-foreground">Pelunasan DP dan pengaturan cicilan sisa biaya pendidikan</p>
                </div>
              </div>
              {hasPaidDP ? (
                <Badge variant="success" className="gap-1.5 px-3 py-1">
                  <CheckCircle className="w-3.5 h-3.5" /> DP Terbayar
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> Menunggu Pembayaran DP
                </Badge>
              )}
            </div>

            <div className="p-5 space-y-6">
              {/* Syarat Utama DP Info */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-sm flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Ketentuan Pembayaran Tahap 2:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-blue-800">
                    <li><strong>Pembayaran Uang Muka (DP)</strong> adalah syarat utama calon santri dinyatakan resmi diterima.</li>
                    <li>Sisa tagihan di luar DP dapat diatur skema cicilannya sesuai kebutuhan Anda.</li>
                    <li>Tersedia fitur <strong>bayar rapel cicilan sekaligus</strong> apabila ingin membayar beberapa cicilan sekaligus.</li>
                  </ul>
                </div>
              </div>

              {/* Setting Skema Cicilan Pendaftar */}
              {canConfigureInstallments && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-semibold text-sm text-slate-900">Atur Skema Cicilan Sisa Tagihan</h5>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pilih jumlah termin pembagian cicilan tagihan Anda (sebelum ada tagihan yang dibayar):
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {[1, 2, 3, 6, 10].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedPlan(count)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          selectedPlan === count
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        {count === 1 ? '1x (Lunas Sekaligus)' : `${count}x Cicilan`}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      onClick={() => installmentMutation.mutate(selectedPlan)}
                      disabled={installmentMutation.isPending}
                      className="bg-emerald-primary hover:bg-emerald-dark text-white ml-auto"
                    >
                      {installmentMutation.isPending ? 'Menyimpan...' : 'Terapkan Skema'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Fitur Bayar Rapel Sekaligus Action Bar */}
              {allPendingBills.length > 1 && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-semibold text-sm text-indigo-950 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Fitur Bayar Rapel Cicilan Sekaligus
                    </h5>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Centang beberapa tagihan cicilan di bawah ini untuk membayar dan mengunggah bukti sekaligus.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {selectedRapelBills.length > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-indigo-700 block">{selectedRapelBills.length} tagihan dipilih</span>
                        <span className="font-bold text-sm text-indigo-950">{formatRp(rapelTotal)}</span>
                      </div>
                    )}
                    <div className="relative inline-block">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        accept=".jpg,.jpeg,.png,.pdf"
                        disabled={selectedRapelBills.length === 0 || uploadingRapel}
                        onChange={handleRapelUpload}
                      />
                      <Button
                        size="sm"
                        disabled={selectedRapelBills.length === 0 || uploadingRapel}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white pointer-events-none"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingRapel ? 'Mengunggah...' : `Upload Bukti Rapel (${selectedRapelBills.length})`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* List Bills by Fee Item */}
              {stage2Bills.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border rounded-xl">
                  <p className="text-sm text-muted-foreground">Menyiapkan rincian tagihan Tahap 2 Anda...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stage2Bills.reduce((acc, b) => {
                    (acc[b.fee_item_id] = acc[b.fee_item_id] || []).push(b);
                    return acc;
                  }, {} as Record<string, any[]>)).map(([feeId, bills]: any) => (
                    <div key={feeId} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50/80 p-3.5 border-b border-slate-200 flex justify-between items-center">
                        <div className="font-medium text-sm text-slate-900">{bills[0].fee_item_name}</div>
                        <div className="text-xs font-semibold text-slate-700">
                          Total: {formatRp(bills.reduce((sum: number, b: any) => sum + Number(b.amount), 0))}
                        </div>
                      </div>

                      {bills.length === 1 ? (
                        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-3">
                            {bills[0].status === 'pending' && allPendingBills.length > 1 && (
                              <input
                                type="checkbox"
                                checked={selectedRapelBills.includes(bills[0].id)}
                                onChange={() => toggleSelectBill(bills[0].id)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-slate-900">{formatRp(Number(bills[0].amount))}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {bills[0].status === 'pending' ? (bills[0].proof_url ? 'Bukti terunggah (Menunggu konfirmasi admin)' : 'Menunggu Pembayaran') :
                                 bills[0].status === 'paid' ? 'Lunas ✓' : bills[0].status}
                              </div>
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
                                  onChange={(e) => onUploadProof(bills[0].id, e)}
                                />
                                <Button size="sm" variant="outline" className="gap-2 pointer-events-none">
                                  <Upload className="w-4 h-4" />
                                  {bills[0].proof_url ? 'Ganti Bukti' : 'Upload Bukti'}
                                </Button>
                              </div>
                            )}
                            {bills[0].status === 'paid' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                              <tr>
                                {allPendingBills.length > 1 && <th className="p-3 w-8"></th>}
                                <th className="p-3 font-medium text-muted-foreground text-xs uppercase">Cicilan</th>
                                <th className="p-3 font-medium text-muted-foreground text-xs uppercase">Nominal</th>
                                <th className="p-3 font-medium text-muted-foreground text-center text-xs uppercase">Status</th>
                                <th className="p-3 font-medium text-muted-foreground text-right text-xs uppercase">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bills.sort((a: any, b: any) => a.installment_number - b.installment_number).map((b: any) => (
                                <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                  {allPendingBills.length > 1 && (
                                    <td className="p-3">
                                      {b.status === 'pending' && (
                                        <input
                                          type="checkbox"
                                          checked={selectedRapelBills.includes(b.id)}
                                          onChange={() => toggleSelectBill(b.id)}
                                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer"
                                        />
                                      )}
                                    </td>
                                  )}
                                  <td className="p-3 font-medium text-slate-800">
                                    Cicilan ke-{b.installment_number} <span className="text-xs text-muted-foreground font-normal">dari {bills.length}</span>
                                  </td>
                                  <td className="p-3 font-semibold text-slate-900">{formatRp(Number(b.amount))}</td>
                                  <td className="p-3 text-center">
                                    <Badge variant={b.status === 'paid' ? 'success' : b.status === 'pending' ? 'warning' : 'secondary'} className="text-[10px]">
                                      {b.status === 'pending' && b.proof_url ? 'MENUNGGU KONFIRMASI' : b.status.toUpperCase()}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right">
                                    {b.status === 'pending' && (
                                      <div className="relative inline-block">
                                        <input
                                          type="file"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                          accept=".jpg,.jpeg,.png,.pdf"
                                          onChange={(e) => onUploadProof(b.id, e)}
                                        />
                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 pointer-events-none">
                                          {b.proof_url ? 'Ganti Bukti' : 'Upload Bukti'}
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
              )}
            </div>
          </div>

          {/* SKD dan WA Group Link (Muncul setelah DP Terbayar) */}
          {hasPaidDP && (
            <div className="border rounded-2xl bg-card overflow-hidden mt-6 border-emerald-200 shadow-sm">
              <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-200">
                <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Penyelesaian Akhir Pendaftaran
                </h4>
              </div>
              <div className="p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="space-y-1">
                  <h5 className="font-semibold text-slate-800">Dokumen SKD Resmi</h5>
                  <p className="text-sm text-muted-foreground">Surat Keterangan Diterima resmi dengan nomor registrasi santri.</p>
                </div>
                <Button onClick={() => setShowSkdModal(true)} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
                  <FileSignature className="w-4 h-4" />
                  Lihat / Unduh SKD
                </Button>
              </div>
              {skdData?.whatsapp_group_link && (
                <div className="p-5 border-t border-emerald-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-emerald-50/50">
                  <div className="space-y-1">
                    <h5 className="font-semibold text-slate-800">Grup WhatsApp Pendaftar Lulus</h5>
                    <p className="text-sm text-muted-foreground">Silakan bergabung dengan grup komunikasi resmi santri baru.</p>
                  </div>
                  <Button variant="outline" className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-100 shrink-0" asChild>
                    <a href={skdData.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" />
                      Gabung Grup WhatsApp
                    </a>
                  </Button>
                </div>
              )}

              <ApplicantSKDModal open={showSkdModal} onOpenChange={setShowSkdModal} applicantId={applicant?.id} />
            </div>
          )}
        </div>
      ) : applicant?.status === 'failed' ? (
        <div className="p-8 border rounded-2xl text-center bg-red-50/70 border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
          <p className="text-red-700 text-sm mb-4 max-w-md mx-auto">
            Tetap semangat dan jangan menyerah. Terima kasih telah berpartisipasi dalam pendaftaran PPDB Pesantren Ar-Rahman.
          </p>

          {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left max-w-lg mx-auto">
              {selectionResult.scores.map((sc: any, idx: number) => (
                <div key={idx} className="bg-white border border-red-100 rounded-lg p-3 flex justify-between items-center shadow-xs">
                  <div>
                    <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                    <p className="text-sm font-medium text-slate-900">{sc.criteria_name}</p>
                  </div>
                  <div className="text-lg font-bold text-red-700">{sc.score}</div>
                </div>
              ))}
            </div>
          )}
          {selectionResult?.notes && (
            <div className="text-left bg-white/70 border border-red-100 rounded-lg p-4 mt-4 inline-block w-full max-w-lg text-sm">
              <p className="font-semibold text-red-800 mb-1">Catatan Panitia:</p>
              <p className="text-red-700">{selectionResult.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 border rounded-2xl text-center bg-muted/10">
          <p className="text-muted-foreground text-sm">Belum ada pengumuman hasil seleksi. Silakan cek kembali nanti.</p>
        </div>
      )}
    </div>
  )
}
