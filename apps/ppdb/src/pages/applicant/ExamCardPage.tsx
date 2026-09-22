import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, API_BASE } from '@/api/client'
import { Loader2, Printer, MapPin, CalendarDays, Clock, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale/id'
import { Button } from '@/components/ui'

export default function ExamCardPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Ambil logo perusahaan untuk header kartu
    fetch(`${API_BASE}/companyprofile/settings/logo`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.value) setLogoUrl(data.value) })
      .catch(() => {})
  }, [])

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const selectionQuery = useQuery({
    queryKey: ['my-selection'],
    queryFn: async () => {
      const sessionRes = await apiFetch<any>('/selection/applicants/me/sessions')
      return {
        session: sessionRes.session || null,
      }
    },
  })

  const applicant = transactionQuery.data?.applicant
  const session = selectionQuery.data?.session
  const isLoading = transactionQuery.isLoading || selectionQuery.isLoading

  useEffect(() => {
    if (!isLoading && applicant && session) {
      setTimeout(() => {
        window.print()
      }, 800) // Sedikit delay agar gambar/font ter-load
    }
  }, [isLoading, applicant, session])

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500">Mempersiapkan Kartu Ujian...</p>
      </div>
    )
  }

  if (!applicant || !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-slate-50">
        <ShieldCheck className="h-12 w-12 text-slate-300" />
        <p className="text-muted-foreground">Data tidak ditemukan atau Anda belum memilih jadwal ujian.</p>
      </div>
    )
  }

  const regNumber = `REG-${applicant.id.toString().padStart(5, '0')}`

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-[800px]">
        {/* Control Bar (Hidden in Print) */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Preview Kartu Ujian</h2>
            <p className="text-sm text-slate-500">Pastikan margin diatur ke "None" atau "Minimum" saat mencetak (Kertas A4).</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak Sekarang
          </Button>
        </div>

        {/* The Card (Printable Area) */}
        <div className="relative overflow-hidden rounded-xl border-2 border-slate-800 bg-white shadow-xl print:rounded-none print:border-none print:shadow-none">
          
          {/* Header Section */}
          <div className="flex items-center gap-6 border-b-2 border-slate-800 bg-slate-50 px-8 py-6 print:bg-transparent">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
                <span className="font-bold text-slate-400">LOGO</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Kartu Peserta Ujian Seleksi</h1>
              <h2 className="text-lg font-bold text-slate-700">Penerimaan Peserta Didik Baru (PPDB)</h2>
              <p className="text-sm font-medium text-slate-500">Pesantren Tahfidz Qur'an dan Digital Ar-Rahman</p>
            </div>
            <div className="text-right">
              <div className="inline-block rounded-md border-2 border-slate-800 px-3 py-1 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Tahun Ajaran</p>
                <p className="text-lg font-black text-slate-900">2024/2025</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex gap-10">
              
              {/* Left Column (Photo & QR) */}
              <div className="w-[150px] shrink-0 space-y-6">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-sm font-medium text-slate-400">Tempel Pas Foto 3x4</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  {/* Fake QR Code using SVG patterns to look realistic */}
                  <svg className="h-24 w-24 rounded-md border border-slate-200 p-1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white"/>
                    <path d="M10 10h20v20H10zM15 15h10v10H15zM70 10h20v20H70zM75 15h10v10H75zM10 70h20v20H10zM15 75h10v10H15zM40 10h20v10H40zM45 25h10v10H45zM10 40h10v20H10zM25 45h10v10H25zM70 40h20v10H70zM60 55h30v10H60zM40 70h20v20H40zM35 80h10v10H35zM65 75h10v20H65zM85 80h5v10H85z" fill="#0f172a"/>
                    <rect x="40" y="40" width="20" height="20" fill="#0f172a" rx="2"/>
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-slate-500">{regNumber}</span>
                </div>
              </div>

              {/* Right Column (Data & Schedule) */}
              <div className="flex-1 space-y-6">
                
                {/* Data Peserta */}
                <div>
                  <h3 className="mb-4 inline-block border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-wider text-slate-800">Biodata Peserta</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 w-1/3 font-semibold text-slate-500">No. Pendaftaran</td>
                        <td className="py-2 px-2 text-slate-400">:</td>
                        <td className="py-2 font-bold text-slate-900">{regNumber}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold text-slate-500">Nama Lengkap</td>
                        <td className="py-2 px-2 text-slate-400">:</td>
                        <td className="py-2 font-bold text-slate-900 uppercase">{applicant.full_name}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold text-slate-500">NISN</td>
                        <td className="py-2 px-2 text-slate-400">:</td>
                        <td className="py-2 font-medium text-slate-800">{applicant.nisn || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold text-slate-500">Pilihan Jalur</td>
                        <td className="py-2 px-2 text-slate-400">:</td>
                        <td className="py-2 font-medium text-slate-800 capitalize">{applicant.path}</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-semibold text-slate-500">Jenjang</td>
                        <td className="py-2 px-2 text-slate-400">:</td>
                        <td className="py-2 font-bold text-slate-900 uppercase">{applicant.level}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Jadwal Seleksi */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 print:border-slate-300 print:bg-transparent">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
                    <CalendarDays className="h-4 w-4 text-blue-600 print:text-slate-800" />
                    Jadwal & Lokasi Ujian
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded bg-blue-100 p-1.5 print:bg-slate-100">
                        <Clock className="h-4 w-4 text-blue-700 print:text-slate-700" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {format(new Date(session.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                        </p>
                        <p className="text-sm text-slate-600">{session.start_time.slice(0,5)} - {session.end_time.slice(0,5)} WIB</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded bg-blue-100 p-1.5 print:bg-slate-100">
                        <MapPin className="h-4 w-4 text-blue-700 print:text-slate-700" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{session.location}</p>
                        <p className="text-sm text-slate-600">Sesi: {session.name}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Tata Tertib */}
            <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 print:bg-transparent">
              <h4 className="mb-3 font-bold text-slate-800">Tata Tertib Peserta Ujian:</h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
                <li>Kartu peserta ini wajib dicetak (berwarna atau hitam putih) dan dibawa saat pelaksanaan ujian.</li>
                <li>Peserta wajib menempelkan pas foto ukuran 3x4 berwarna terbaru pada kolom yang disediakan.</li>
                <li>Peserta wajib hadir 30 menit sebelum jadwal ujian dimulai untuk registrasi ulang.</li>
                <li>Peserta diwajibkan berpakaian muslim/muslimah rapi, sopan, dan bersepatu.</li>
                <li>Dilarang membawa alat komunikasi (HP/Smartwatch) ke dalam ruang ujian.</li>
              </ol>
            </div>
            
            {/* Tanda Tangan */}
            <div className="mt-10 flex justify-end">
              <div className="w-48 text-center text-sm">
                <p className="mb-16 text-slate-600">Panitia PPDB</p>
                <div className="mx-auto w-32 border-b border-slate-800"></div>
                <p className="mt-2 font-bold text-slate-800">Ketua Panitia</p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}

