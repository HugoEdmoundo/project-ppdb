import { useState } from 'react'
import { CalendarDays, Clock, MapPin, Star, Printer, XCircle, Download, ExternalLink, ShieldCheck, HelpCircle, Lock, CheckCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui'
import { useToast } from '@/components/Toast'

interface SelectionStepProps {
  applicant: any
  sessionData: any
  selectionResult: any
  booking: boolean
  onBookSession: (sessionId: string) => void
}

export default function SelectionStep({ applicant, sessionData, selectionResult, booking, onBookSession }: SelectionStepProps) {
  const { toast } = useToast()
  const [showSebGuide, setShowSebGuide] = useState(false)
  const regPath = (applicant?.registration_path || '').toLowerCase()
  const isTiuPath = ['reguler', 'tiu', 'tes', 'reguler_tiu'].includes(regPath) || regPath.includes('tiu')

  const tahfidzSession = sessionData?.tahfidz_session || null;
  const interviewSession = sessionData?.interview_session || null;
  const availableTahfidz = sessionData?.available_tahfidz_sessions || [];
  const availableInterview = sessionData?.available_interview_sessions || [];
  const hasTahfidzScore = sessionData?.has_tahfidz_score || false;

  const tiuScore = selectionResult?.scores?.find((s: any) =>
    (s.criteria_name || '').toLowerCase().includes('tiu') ||
    (s.category_name || '').toLowerCase().includes('tiu')
  )?.score;

  const downloadSebConfig = async () => {
    try {
      const token = localStorage.getItem('access_token') || ''
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${apiUrl}/selection/applicants/me/tiu-seb`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gagal mengunduh konfigurasi SEB')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ujian_tiu.seb'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      toast('error', e.message)
    }
  }

  return (
    <div className="space-y-4">
      {isTiuPath && (
        <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-indigo-900 flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Persiapan Ujian TIU (Safe Exam Browser)
                </h4>
                <p className="text-sm text-indigo-800 mt-1">
                  Jalur pendaftaran Anda mewajibkan ujian TIU secara online. Ujian ini menggunakan aplikasi Safe Exam Browser (SEB) untuk memastikan keamanan.
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-100 hidden sm:flex shrink-0 gap-1" onClick={() => setShowSebGuide(true)}>
                <HelpCircle className="w-4 h-4" /> Bantuan & Error
              </Button>
            </div>

            {tiuScore !== undefined ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-emerald-900">Ujian TIU Selesai Dikerjakan</p>
                    <p className="text-xs text-emerald-700">Nilai telah disinkronkan otomatis dari Safe Exam Browser & Webhook.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Nilai TIU</span>
                  <Badge variant="success" className="text-base font-bold px-3 py-0.5 mt-0.5">{tiuScore}</Badge>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm text-indigo-700">
                  <p><strong>Langkah-langkah Singkat:</strong></p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Unduh dan instal aplikasi Safe Exam Browser dari <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">situs resminya <ExternalLink className="w-3 h-3"/></a> (Windows/macOS).</li>
                    <li>Unduh konfigurasi SEB khusus Anda melalui tombol di bawah ini. Pastikan Anda siap mengerjakan, <strong>waktu ujian dihitung segera setelah file diklik!</strong></li>
                    <li>Buka file <code>ujian_tiu.seb</code> yang baru saja diunduh. Aplikasi SEB akan otomatis terbuka.</li>
                    <li>Soal ujian akan otomatis tampil dengan kode identitas Anda yang sudah terisi. Silakan langsung kerjakan dan klik <strong>Submit</strong> jika sudah selesai.</li>
                  </ol>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button onClick={downloadSebConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto gap-2">
                    <Download className="w-4 h-4" />
                    Download Konfigurasi SEB (.seb)
                  </Button>
                  <Button variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 w-full sm:hidden gap-2" onClick={() => setShowSebGuide(true)}>
                    <HelpCircle className="w-4 h-4" /> Bantuan & Solusi Error
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEB Guide Modal */}
      <Dialog open={showSebGuide} onOpenChange={setShowSebGuide}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Panduan Instalasi & Solusi Error (Troubleshooting) SEB</DialogTitle>
            <DialogDescription>
              Silakan baca panduan di bawah ini jika Anda mengalami kesulitan saat instalasi maupun pelaksanaan Ujian TIU.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 text-sm text-slate-700 mt-2">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1 border-b pb-1">1. Instalasi Safe Exam Browser</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Buka situs <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">safeexambrowser.org/download_en.html</a>.</li>
                <li>Download versi terbaru sesuai dengan OS komputer Anda (Windows 10/11 atau macOS). <em>Smartphone/Tablet tidak didukung.</em></li>
                <li>Jalankan file *installer* yang telah di-download, ikuti proses (klik *Next* / *Install*) hingga selesai.</li>
                <li><strong>Catatan:</strong> Anda tidak perlu membuka aplikasinya secara manual setelah terinstal. Cukup biarkan saja.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1 border-b pb-1">2. Solusi: File .seb Terbuka di Aplikasi Lain</h4>
              <p className="mb-1"><strong>Gejala:</strong> Saat file <code>ujian_tiu.seb</code> diklik, ia malah terbuka di Notepad, Browser biasa, atau program lain.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Windows:</strong> Klik kanan pada file <code>ujian_tiu.seb</code> &rarr; pilih <strong>Open With...</strong> &rarr; <strong>Choose another app</strong>. Cari dan pilih "Safe Exam Browser", lalu centang <em>"Always use this app to open .seb files"</em>.</li>
                <li><strong>macOS:</strong> Klik kanan file <code>ujian_tiu.seb</code> &rarr; pilih <strong>Get Info</strong>. Pada bagian <em>"Open with:"</em> pilih "Safe Exam Browser", lalu klik tombol <em>Change All...</em>.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1 border-b pb-1">3. Solusi: SEB Meminta Password</h4>
              <p><strong>Gejala:</strong> Begitu file diklik, muncul kotak dialog meminta password konfigurasi atau quit password.</p>
              <p><strong>Solusi:</strong> File `.seb` Anda mungkin usang atau *corrupt*. Tutup SEB, hapus file `.seb` tersebut. Kembali ke dashboard pendaftar PPDB Anda dan klik tombol <strong>Download Konfigurasi SEB (.seb)</strong> untuk mengambil file yang baru. Segera buka kembali.</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1 border-b pb-1">4. Solusi: Komputer Hang / Koneksi Terputus</h4>
              <p className="mb-1"><strong>Gejala:</strong> Layar macet atau ada notifikasi internet mati.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Jangan panik. Matikan komputer secara paksa (tahan tombol power) jika hang, lalu nyalakan kembali.</li>
                <li>Pastikan internet menyala, lalu klik ganda kembali file <code>ujian_tiu.seb</code> yang tadi (tidak perlu download baru kecuali diminta).</li>
                <li><strong>Perhatian:</strong> Waktu ujian di server akan <strong>terus berjalan</strong> selama Anda offline. Segera lanjutkan pekerjaan Anda dan klik <strong>Submit</strong>!</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800">
              Jika masalah berlanjut dan Anda tidak bisa mengakses ujian sama sekali, segera hubungi Panitia PPDB Ar-Rahman melalui nomor kontak resmi yang tersedia.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bagian Jadwal Tahfidz */}
      {tahfidzSession ? (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Jadwal Seleksi Tahfidz
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/60 p-4 rounded-lg border border-blue-100">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Sesi</div>
                <div className="font-medium">{tahfidzSession.name}</div>
              </div>
              {tahfidzSession.session_date && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Tanggal</div>
                  <div className="font-medium">
                    {new Date(tahfidzSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              {(tahfidzSession.start_time || tahfidzSession.end_time) && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Waktu</div>
                  <div className="font-medium">
                    {tahfidzSession.start_time}{tahfidzSession.end_time ? ` – ${tahfidzSession.end_time}` : ''} WIB
                  </div>
                </div>
              )}
              {tahfidzSession.location && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Lokasi</div>
                  <div className="font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{tahfidzSession.location}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2 flex">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto gap-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                onClick={() => window.open('/applicant/kartu-ujian', '_blank')}
              >
                <Printer className="h-4 w-4" />
                Cetak Kartu Ujian Tahfidz
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : ['document_approved', 'selection'].includes(applicant?.status) && isTiuPath && tiuScore === undefined ? (
        <Card className="border-slate-200 bg-slate-50/70 shadow-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                Sesi Ujian Tahfidz (Terkunci)
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pendaftar jalur Tes/TIU wajib menyelesaikan ujian TIU terlebih dahulu. Setelah nilai TIU disinkronkan ke dalam sistem, jadwal sesi Tahfidz akan otomatis terbuka.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : ['document_approved', 'selection'].includes(applicant?.status) && (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Pilih Jadwal Ujian Tahfidz
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Silakan pilih salah satu jadwal ujian Tahfidz yang tersedia di bawah ini.</p>
            </div>

            {availableTahfidz.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-slate-100 text-center rounded-lg">
                <p className="text-sm text-muted-foreground">Belum ada jadwal sesi Tahfidz yang dibuka oleh panitia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableTahfidz.map((s: any) => {
                  const isFull = s.quota > 0 && s.booked_count >= s.quota;
                  return (
                    <div key={s.id} className={`border rounded-lg p-4 transition-colors ${isFull ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white hover:border-emerald-200 hover:shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-sm text-slate-900">{s.name}</h5>
                        {s.quota > 0 && (
                          <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px]">
                            {s.booked_count}/{s.quota} terisi
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{s.location || '-'}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isFull ? "secondary" : "default"}
                        disabled={isFull || booking}
                        onClick={() => onBookSession(s.id)}
                      >
                        {isFull ? 'Kapasitas Penuh' : 'Pilih Jadwal Ini'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bagian Jadwal Wawancara */}
      {interviewSession ? (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm mt-4">
          <CardContent className="p-5 space-y-4">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Jadwal Seleksi Wawancara
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/60 p-4 rounded-lg border border-blue-100">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Sesi</div>
                <div className="font-medium">{interviewSession.name}</div>
              </div>
              {interviewSession.session_date && (
                <div>
                   <div className="text-muted-foreground text-xs mb-1">Tanggal</div>
                   <div className="font-medium">
                     {new Date(interviewSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                   </div>
                </div>
              )}
              {(interviewSession.start_time || interviewSession.end_time) && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Waktu</div>
                  <div className="font-medium">
                    {interviewSession.start_time}{interviewSession.end_time ? ` – ${interviewSession.end_time}` : ''} WIB
                  </div>
                </div>
              )}
              {interviewSession.location && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Lokasi</div>
                  <div className="font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{interviewSession.location}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2 flex">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto gap-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                onClick={() => window.open('/applicant/kartu-ujian', '_blank')}
              >
                <Printer className="h-4 w-4" />
                Cetak Kartu Wawancara
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : ['document_approved', 'selection'].includes(applicant?.status) && hasTahfidzScore ? (
        <Card className="shadow-sm border-slate-200 mt-4">
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Pilih Jadwal Wawancara
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Nilai Tahfidz Anda sudah keluar. Silakan pilih jadwal sesi Wawancara.</p>
            </div>

            {availableInterview.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-slate-100 text-center rounded-lg">
                <p className="text-sm text-muted-foreground">Belum ada jadwal sesi Wawancara yang dibuka oleh panitia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableInterview.map((s: any) => {
                  const isFull = s.quota > 0 && s.booked_count >= s.quota;
                  return (
                    <div key={s.id} className={`border rounded-lg p-4 transition-colors ${isFull ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white hover:border-emerald-200 hover:shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-sm text-slate-900">{s.name}</h5>
                        {s.quota > 0 && (
                          <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px]">
                            {s.booked_count}/{s.quota} terisi
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{s.location || '-'}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isFull ? "secondary" : "default"}
                        disabled={isFull || booking}
                        onClick={() => onBookSession(s.id)}
                       >
                         {isFull ? 'Kapasitas Penuh' : 'Pilih Jadwal Ini'}
                       </Button>
                     </div>
                   )
                 })}
               </div>
             )}
           </CardContent>
         </Card>
       ) : ['document_approved', 'selection'].includes(applicant?.status) && !interviewSession ? (
         <Card className="border-slate-200 bg-slate-50/70 shadow-sm mt-4">
           <CardContent className="p-5 flex items-start gap-4">
             <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
               <Lock className="w-5 h-5" />
             </div>
             <div>
               <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                 Sesi Wawancara (Terkunci)
               </h4>
               <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                 Sesi Wawancara baru dapat dipilih setelah penguji selesai menguji dan menginput nilai Ujian Tahfidz Anda ke dalam sistem.
               </p>
             </div>
           </CardContent>
         </Card>
       ) : null}

      {/* Jika sudah ada penilaian tapi belum di-publish final (status masih selection) */}
      {!['passed', 'failed'].includes(applicant?.status) && selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/30 shadow-sm mt-4">
          <CardContent className="p-5">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm mb-4">
              <Star className="h-5 w-5 text-blue-600" />
              Nilai Ujian Sementara
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectionResult.scores.map((sc: any, idx: number) => (
                <div key={idx} className="bg-white border border-blue-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                    <p className="text-sm font-medium text-slate-900">{sc.criteria_name}</p>
                  </div>
                  <div className="text-lg font-bold text-blue-700">{sc.score}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic text-center sm:text-left">
              * Nilai ini bersifat sementara dan menunggu keputusan final panitia.
            </p>
          </CardContent>
        </Card>
      )}

      {applicant?.status === 'failed' && (
        <Card className="border-red-200 bg-red-50/80 shadow-sm mt-4">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-red-800 text-lg">Mohon Maaf, Anda Tidak Lulus</h4>
            <p className="text-red-700 text-sm mt-2 max-w-md mx-auto">
              Berdasarkan hasil seleksi, Anda belum memenuhi kriteria kelulusan kami saat ini. Tetap semangat dan jangan menyerah!
            </p>
            {selectionResult?.notes && (
              <div className="mt-4 p-3 bg-white/60 border border-red-100 rounded-lg inline-block text-left max-w-md w-full">
                <p className="text-xs font-medium text-red-800 mb-1">Catatan Panitia:</p>
                <p className="text-sm text-red-700">{selectionResult.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
