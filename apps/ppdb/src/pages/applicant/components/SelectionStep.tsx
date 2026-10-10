import { useState } from 'react'
import { CalendarDays, Clock, MapPin, Star, XCircle, Download, ExternalLink, ShieldCheck, HelpCircle, Lock, CheckCircle, User, Video, CalendarPlus, Tag } from 'lucide-react'
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui'
import { useToast } from '@/components/Toast'

interface SelectionStepProps {
  applicant: any
  sessionData: any
  selectionResult: any
  booking: boolean
  onBookSession: (sessionId: string) => void
}

const getGoogleCalendarUrl = (session: any, titlePrefix: string) => {
  if (!session || !session.session_date) return '#'
  const dateStr = session.session_date.split('T')[0].replace(/-/g, '')
  const startTime = session.start_time || '08:00'
  const startTimeStr = startTime.replace(':', '')
  const startHour = parseInt(startTime.split(':')[0] || '8', 10)
  const endHour = String(startHour + 1).padStart(2, '0')
  const startMinute = startTime.split(':')[1] || '00'
  const endTimeStr = `${endHour}${startMinute}`

  const dates = `${dateStr}T${startTimeStr}00/${dateStr}T${endTimeStr}00`
  const text = encodeURIComponent(`${titlePrefix} - PPDB Pesantren Tahfidz Ar-Rahman`)
  const loc = encodeURIComponent(
    session.mode === 'online'
      ? session.meeting_url || 'Online Meeting'
      : session.location || 'Pesantren Tahfidz Ar-Rahman'
  )
  const details = encodeURIComponent(
    `Jadwal ${titlePrefix} PPDB Pesantren Tahfidz Ar-Rahman.\nPenguji: ${session.officer_name || '-'}\nMode: ${session.mode === 'online' ? 'Online' : 'Offline'}\n${session.mode === 'online' ? `Link: ${session.meeting_url || '-'}` : `Lokasi: ${session.location || '-'}`}`
  )
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`
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
  const hasInterviewScore = sessionData?.has_interview_score || false;

  // Cek apakah sesi yang sudah diambil telah lewat lebih dari 1 hari (H+1)
  const [now] = useState(() => Date.now())
  const isSessionExpiredForApplicant = (sessionDateStr: string | null) => {
    if (!sessionDateStr) return false
    const sessionDate = new Date(sessionDateStr)
    const expireThreshold = new Date(sessionDate)
    expireThreshold.setDate(expireThreshold.getDate() + 1)
    expireThreshold.setHours(23, 59, 59, 999)
    return now > expireThreshold.getTime()
  }

  const isTahfidzPastGrace = isSessionExpiredForApplicant(tahfidzSession?.session_date)
  const isInterviewPastGrace = isSessionExpiredForApplicant(interviewSession?.session_date)

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
      {tahfidzSession && isTahfidzPastGrace ? (
        !hasTahfidzScore ? (
          <Card className="border-slate-200 bg-slate-50/70 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Sesi Seleksi Tahfidz Telah Dilaksanakan</p>
                <p className="text-[11px] text-muted-foreground">Jadwal seleksi telah terlewat. Saat ini sedang menunggu penginputan hasil evaluasi nilai dari penguji.</p>
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : tahfidzSession ? (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Jadwal Seleksi Tahfidz (Session 1:1)
              </h4>
              {applicant?.wave_name && (
                <Badge variant="outline" className="text-[10px] bg-white text-blue-800 border-blue-200 inline-flex items-center gap-1 font-medium">
                  <Tag className="h-2.5 w-2.5 shrink-0" />
                  <span>{applicant.wave_name}</span>
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/60 p-4 rounded-lg border border-blue-100">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Nama Session</div>
                <div className="font-medium text-slate-900">{tahfidzSession.name}</div>
              </div>
              {tahfidzSession.session_date && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Tanggal</div>
                  <div className="font-medium text-slate-900">
                    {new Date(tahfidzSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              {tahfidzSession.start_time && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Waktu Pelaksanaan</div>
                  <div className="font-medium text-slate-900">
                    {tahfidzSession.start_time} – Selesai WIB
                  </div>
                </div>
              )}
              {tahfidzSession.officer_name && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Penguji Tahfidz</div>
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span>{tahfidzSession.officer_name}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Mode Pelaksanaan</div>
                <div className="font-medium flex items-center gap-1.5">
                  {tahfidzSession.mode === 'online' ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-xs">
                      <Video className="h-3.5 w-3.5" /> Online (Tatap Maya)
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-xs">
                      <MapPin className="h-3.5 w-3.5" /> Offline (Tatap Muka)
                    </Badge>
                  )}
                </div>
              </div>
              {tahfidzSession.mode === 'online' && tahfidzSession.meeting_url && (
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Tautan / Link Zoom / Meet</div>
                  <a
                    href={tahfidzSession.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-md border border-blue-200 break-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {tahfidzSession.meeting_url}
                  </a>
                </div>
              )}
              {tahfidzSession.mode !== 'online' && tahfidzSession.location && (
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Lokasi Ruangan / Gedung</div>
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
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
                onClick={() => {
                  const url = getGoogleCalendarUrl(tahfidzSession, 'Seleksi Tahfidz')
                  window.open(url, '_blank')
                }}
              >
                <CalendarPlus className="h-4 w-4" />
                Tambah ke Google Calendar
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
                Session Ujian Tahfidz (Terkunci)
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pendaftar jalur Tes/TIU wajib menyelesaikan ujian TIU terlebih dahulu. Setelah nilai TIU disinkronkan ke dalam sistem, jadwal session Tahfidz akan otomatis terbuka.
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
                Pilih Jadwal Ujian Tahfidz (Session 1:1)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Silakan pilih salah satu jadwal session 1:1 Tahfidz yang tersedia di bawah ini.</p>
            </div>

            {availableTahfidz.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-slate-100 text-center rounded-lg">
                <p className="text-sm text-muted-foreground">Belum ada jadwal session Tahfidz yang dibuka oleh panitia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableTahfidz.map((s: any) => {
                  const isFull = s.quota > 0 && s.booked_count >= s.quota;
                  return (
                    <div key={s.id} className={`border rounded-xl p-4 transition-all ${isFull ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white hover:border-emerald-300 hover:shadow-md'}`}>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-sm text-slate-900 truncate">{s.name}</h5>
                          {s.wave_name && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 font-medium mt-0.5 inline-flex items-center gap-1">
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                              <span>{s.wave_name}</span>
                            </Badge>
                          )}
                        </div>
                        <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px] shrink-0 font-medium">
                          {isFull ? 'Sudah Diambil' : 'Slot 1:1 Tersedia'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1.5 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'} – Selesai WIB</span>
                        </div>
                        {s.officer_name && (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">Penguji: {s.officer_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {s.mode === 'online' ? (
                            <>
                              <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="text-blue-700 font-medium">Online (Tatap Maya)</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{s.location || 'Offline (Tatap Muka)'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isFull ? "secondary" : "default"}
                        disabled={isFull || booking}
                        onClick={() => onBookSession(s.id)}
                      >
                        {isFull ? 'Slot Sudah Terisi' : 'Pilih Session Ini (1:1)'}
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
      {interviewSession && isInterviewPastGrace ? (
        !hasInterviewScore ? (
          <Card className="border-slate-200 bg-slate-50/70 shadow-sm mt-4">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Sesi Wawancara Telah Dilaksanakan</p>
                <p className="text-[11px] text-muted-foreground">Jadwal seleksi telah terlewat. Saat ini sedang menunggu penginputan nilai dan rekapitulasi keputusan panitia.</p>
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : interviewSession ? (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm mt-4">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Jadwal Seleksi Wawancara (Session 1:1)
              </h4>
              {applicant?.wave_name && (
                <Badge variant="outline" className="text-[10px] bg-white text-blue-800 border-blue-200 inline-flex items-center gap-1 font-medium">
                  <Tag className="h-2.5 w-2.5 shrink-0" />
                  <span>{applicant.wave_name}</span>
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/60 p-4 rounded-lg border border-blue-100">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Nama Session</div>
                <div className="font-medium text-slate-900">{interviewSession.name}</div>
              </div>
              {interviewSession.session_date && (
                <div>
                   <div className="text-muted-foreground text-xs mb-1">Tanggal</div>
                   <div className="font-medium text-slate-900">
                     {new Date(interviewSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                   </div>
                </div>
              )}
              {interviewSession.start_time && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Waktu Pelaksanaan</div>
                  <div className="font-medium text-slate-900">
                    {interviewSession.start_time} – Selesai WIB
                  </div>
                </div>
              )}
              {interviewSession.officer_name && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Pewawancara</div>
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span>{interviewSession.officer_name}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Mode Pelaksanaan</div>
                <div className="font-medium flex items-center gap-1.5">
                  {interviewSession.mode === 'online' ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-xs">
                      <Video className="h-3.5 w-3.5" /> Online (Tatap Maya)
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-xs">
                      <MapPin className="h-3.5 w-3.5" /> Offline (Tatap Muka)
                    </Badge>
                  )}
                </div>
              </div>
              {interviewSession.mode === 'online' && interviewSession.meeting_url && (
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Tautan / Link Zoom / Meet</div>
                  <a
                    href={interviewSession.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-md border border-blue-200 break-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {interviewSession.meeting_url}
                  </a>
                </div>
              )}
              {interviewSession.mode !== 'online' && interviewSession.location && (
                <div className="sm:col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Lokasi Ruangan / Gedung</div>
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
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
                onClick={() => {
                  const url = getGoogleCalendarUrl(interviewSession, 'Wawancara Seleksi')
                  window.open(url, '_blank')
                }}
              >
                <CalendarPlus className="h-4 w-4" />
                Tambah ke Google Calendar
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
                Pilih Jadwal Wawancara (Session 1:1)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Nilai Tahfidz Anda sudah keluar. Silakan pilih jadwal session 1:1 Wawancara.</p>
            </div>

            {availableInterview.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-slate-100 text-center rounded-lg">
                <p className="text-sm text-muted-foreground">Belum ada jadwal session Wawancara yang dibuka oleh panitia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableInterview.map((s: any) => {
                  const isFull = s.quota > 0 && s.booked_count >= s.quota;
                  return (
                    <div key={s.id} className={`border rounded-xl p-4 transition-all ${isFull ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white hover:border-emerald-300 hover:shadow-md'}`}>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-sm text-slate-900 truncate">{s.name}</h5>
                          {s.wave_name && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 font-medium mt-0.5 inline-flex items-center gap-1">
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                              <span>{s.wave_name}</span>
                            </Badge>
                          )}
                        </div>
                        <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px] shrink-0 font-medium">
                          {isFull ? 'Sudah Diambil' : 'Slot 1:1 Tersedia'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1.5 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'} – Selesai WIB</span>
                        </div>
                        {s.officer_name && (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">Pewawancara: {s.officer_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {s.mode === 'online' ? (
                            <>
                              <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="text-blue-700 font-medium">Online (Tatap Maya)</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{s.location || 'Offline (Tatap Muka)'}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isFull ? "secondary" : "default"}
                        disabled={isFull || booking}
                        onClick={() => onBookSession(s.id)}
                       >
                         {isFull ? 'Slot Sudah Terisi' : 'Pilih Session Ini (1:1)'}
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
