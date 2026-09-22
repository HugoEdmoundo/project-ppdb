import { CheckCircle, X, Upload, FileSignature, Receipt, PenLine } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface ResultStepProps {
  applicant: any
  selectionResult: any
  mou: any
  stage2Bills: any[]
  onSignMou: () => void
  onUploadProof: (billId: string, e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ResultStep({ applicant, selectionResult, mou, stage2Bills, onSignMou, onUploadProof }: ResultStepProps) {
  return (
    <div className="space-y-4">
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

          {/* MOU Section */}
          {mou ? (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b flex justify-between items-center">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-primary" />
                  Memorandum of Understanding (MOU)
                </h4>
                {mou.status === 'signed' && (
                  <Badge variant="success" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> MOU Ditandatangani
                  </Badge>
                )}
              </div>
              <div className="p-4">
                {mou.status === 'draft' ? (
                  <div className="space-y-4">
                    <div
                      dangerouslySetInnerHTML={{ __html: mou.draft_content || '<p class="text-muted-foreground text-sm">Template MOU akan segera tersedia.</p>' }}
                      className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/20 max-h-64 overflow-y-auto"
                    />
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-sm text-yellow-800 font-medium">Langkah berikutnya: Tanda tangani MOU ini secara digital untuk melanjutkan ke tahap pembayaran</p>
                      <Button onClick={onSignMou} className="shrink-0 gap-2">
                        <PenLine className="w-4 h-4" />
                        Tanda Tangan MOU
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-muted-foreground">MOU telah ditandatangani pada {mou.signed_at ? new Date(mou.signed_at).toLocaleString('id-ID') : '-'}</p>
                    <p className="font-medium">Silakan lanjutkan ke pembayaran Tahap 2.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-xl bg-blue-50 border-blue-200 text-blue-800 text-sm">
              <div className="font-semibold mb-1">Langkah Selanjutnya</div>
              Menunggu MOU diterbitkan oleh panitia.
            </div>
          )}

          {/* Stage 2 Bills */}
          {mou?.status === 'signed' && stage2Bills.length > 0 && (
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Pembayaran Tahap 2
                </h4>
              </div>
              <div className="p-4 space-y-4">
                {Object.entries(stage2Bills.reduce((acc, b) => {
                  (acc[b.fee_item_id] = acc[b.fee_item_id] || []).push(b);
                  return acc;
                }, {} as Record<string, any[]>)).map(([feeId, bills]: any) => (
                  <div key={feeId} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-3 border-b">
                      <div className="font-medium text-sm">{bills[0].fee_item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Total: {formatRp(bills.reduce((sum: number, b: any) => sum + Number(b.amount), 0))}
                      </div>
                    </div>

                    {bills.length === 1 ? (
                      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                          <div className="font-semibold">{formatRp(Number(bills[0].amount))}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {bills[0].status === 'pending' ? 'Menunggu Pembayaran' :
                             bills[0].status === 'paid' ? 'Lunas' : bills[0].status}
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
                                Upload Bukti
                              </Button>
                            </div>
                          )}
                          {bills[0].status === 'paid' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/10 border-b">
                            <tr>
                              <th className="p-3 font-medium text-muted-foreground">Cicilan Ke</th>
                              <th className="p-3 font-medium text-muted-foreground">Nominal</th>
                              <th className="p-3 font-medium text-muted-foreground text-center">Status</th>
                              <th className="p-3 font-medium text-muted-foreground text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bills.sort((a: any, b: any) => a.installment_number - b.installment_number).map((b: any) => (
                              <tr key={b.id} className="border-b last:border-0">
                                <td className="p-3">Cicilan {b.installment_number} dari {bills.length}</td>
                                <td className="p-3 font-medium">{formatRp(Number(b.amount))}</td>
                                <td className="p-3 text-center">
                                  <Badge variant={b.status === 'paid' ? 'success' : b.status === 'pending' ? 'warning' : 'secondary'} className="text-[10px]">
                                    {b.status.toUpperCase()}
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
                                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 pointer-events-none">
                                        Upload
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
            </div>
          )}
        </div>
      ) : applicant?.status === 'failed' ? (
        <div className="p-6 border rounded-xl text-center bg-red-50 border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
          <p className="text-red-700 text-sm mb-4">
            Tetap semangat dan jangan menyerah. Terima kasih telah berpartisipasi dalam pendaftaran PPDB Pesantren Ar-Rahman.
          </p>

          {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left">
              {selectionResult.scores.map((sc: any, idx: number) => (
                <div key={idx} className="bg-white border rounded-md p-3 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                    <p className="text-sm font-medium">{sc.criteria_name}</p>
                  </div>
                  <div className="text-xl font-bold">{sc.score}</div>
                </div>
              ))}
            </div>
          )}
          {selectionResult?.notes && (
            <div className="text-left bg-white/50 border border-red-100 rounded-lg p-4 mt-4 inline-block w-full text-sm">
              <p className="font-semibold text-red-800 mb-1">Catatan Panitia:</p>
              <p className="text-red-700">{selectionResult.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 border rounded-lg text-center bg-muted/10">
          <p className="text-muted-foreground text-sm">Belum ada pengumuman hasil seleksi. Silakan cek kembali nanti.</p>
        </div>
      )}
    </div>
  )
}
