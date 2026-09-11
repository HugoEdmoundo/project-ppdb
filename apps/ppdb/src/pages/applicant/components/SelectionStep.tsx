import { CalendarDays, Clock, MapPin, Star } from 'lucide-react'
import { Badge, Button } from '@/components/ui'

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
        <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200 space-y-2">
          <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Jadwal Seleksi Anda
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="text-muted-foreground">Sesi</div>
            <div className="font-medium">{selectionSession.name}</div>
            {selectionSession.session_date && (
              <>
                <div className="text-muted-foreground">Tanggal</div>
                <div className="font-medium">
                  {new Date(selectionSession.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </>
            )}
            {(selectionSession.start_time || selectionSession.end_time) && (
              <>
                <div className="text-muted-foreground">Waktu</div>
                <div className="font-medium">
                  {selectionSession.start_time}{selectionSession.end_time ? ` – ${selectionSession.end_time}` : ''} WIB
                </div>
              </>
            )}
            {selectionSession.location && (
              <>
                <div className="text-muted-foreground">Lokasi</div>
                <div className="font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectionSession.location}
                </div>
              </>
            )}
          </div>
        </div>
      ) : applicant?.status === 'selection' && (
        <div className="p-5 border rounded-lg bg-card shadow-sm space-y-4">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Pilih Jadwal Ujian
            </h4>
            <p className="text-sm text-muted-foreground mt-1">Silakan pilih salah satu jadwal ujian yang tersedia di bawah ini.</p>
          </div>

          {availableSessions.length === 0 ? (
            <div className="p-4 bg-muted/20 text-center rounded-md">
              <p className="text-sm text-muted-foreground">Belum ada jadwal sesi yang dibuka oleh panitia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSessions.map(s => {
                const isFull = s.quota > 0 && s.booked_count >= s.quota;
                return (
                  <div key={s.id} className={`border rounded-lg p-3 ${isFull ? 'bg-muted/30 opacity-60' : 'bg-background'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-sm">{s.name}</h5>
                      {s.quota > 0 && (
                        <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px]">
                          {s.booked_count}/{s.quota} terisi
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}, {s.start_time || '-'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {s.location || '-'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      disabled={isFull || booking}
                      onClick={() => onBookSession(s.id)}
                    >
                      {isFull ? 'Penuh' : booking ? 'Wait...' : 'Pilih Jadwal'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectionResult && selectionResult.scores && selectionResult.scores.length > 0 && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-yellow-500" />
            Hasil & Nilai Seleksi
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectionResult.scores.map((sc: any, idx: number) => (
              <div key={idx} className="bg-background border rounded-md p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">{sc.category_name}</p>
                  <p className="text-sm font-medium">{sc.criteria_name}</p>
                </div>
                <div className="text-xl font-bold">{sc.score}</div>
              </div>
            ))}
          </div>
          {selectionResult.notes && (
            <div className="mt-3 p-3 bg-yellow-50/50 border border-yellow-100 rounded-md">
              <p className="text-xs font-medium text-yellow-800 mb-1">Catatan Panitia:</p>
              <p className="text-sm text-yellow-700">{selectionResult.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
