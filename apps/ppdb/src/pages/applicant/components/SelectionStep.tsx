import { CalendarDays, Clock, MapPin, Star, Printer, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'

interface SelectionStepProps {
  applicant: any
  selectionSession: any
  availableSessions: any[]
  selectionResult: any
  booking: boolean
  onBookSession: (sessionId: string) => void
}

export default function SelectionStep({ applicant, selectionSession, availableSessions, selectionResult, booking, onBookSession }: SelectionStepProps) {
  return (
    <div className="space-y-4">
      {selectionSession ? (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Jadwal Seleksi Anda
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/60 p-4 rounded-lg border border-blue-100">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Sesi</div>
                <div className="font-medium">{selectionSession.name}</div>
              </div>
              {selectionSession.session_date && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Tanggal</div>
                  <div className="font-medium">
                    {new Date(selectionSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              {(selectionSession.start_time || selectionSession.end_time) && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Waktu</div>
                  <div className="font-medium">
                    {selectionSession.start_time}{selectionSession.end_time ? ` – ${selectionSession.end_time}` : ''} WIB
                  </div>
                </div>
              )}
              {selectionSession.location && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Lokasi</div>
                  <div className="font-medium flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectionSession.location}</span>
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
                Cetak Kartu Ujian
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : applicant?.status === 'selection' && (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                Pilih Jadwal Ujian
              </h4>
              <p className="text-sm text-muted-foreground mt-1">Silakan pilih salah satu jadwal ujian yang tersedia di bawah ini.</p>
            </div>

            {availableSessions.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-slate-100 text-center rounded-lg">
                <p className="text-sm text-muted-foreground">Belum ada jadwal sesi yang dibuka oleh panitia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableSessions.map(s => {
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
