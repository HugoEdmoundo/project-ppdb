import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useActiveWave } from '@/hooks/useActiveWave'
import { cn } from '@/lib/utils'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Alert, ConfirmDialog,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea
} from '@/components/ui'
import { SuccessState } from "@/components/ui"
import { CredentialsCard } from '@/components/CredentialsCard'
import { ArrowLeft, ArrowRight, LogIn, BookOpen, GraduationCap, Check } from 'lucide-react'

// Batas maksimal tanggal lahir = hari ini (tidak boleh lahir di masa depan)
const todayStr = new Date().toISOString().split('T')[0]

const WILAYAH_SOURCES = [
  'https://www.emsifa.com/api-wilayah-indonesia/api',
  'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/public/api',
]

async function fetchWilayah(rel: string): Promise<any[]> {
  for (const base of WILAYAH_SOURCES) {
    try {
      const res = await fetch(`${base}/${rel}`)
      if (!res.ok) continue
      return await res.json()
    } catch {
      /* coba sumber fallback */
    }
  }
  return []
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    registration_path: '',
    registration_level: '',
    full_name: '',
    birth_place: '',
    birth_date: '',
    gender: '',
    nisn: '',
    nik: '',
    email: '',
    phone: '',
    parent_name: '',
    previous_school: '',
    major_choice: '',
    address: '',
    disease_history: '',
    province: '',
    city: '',
    district: '',
    village: '',
    postal_code: ''
  })

  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successData, setSuccessData] = useState<{username: string, password: string} | null>(null)

  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [villages, setVillages] = useState<any[]>([])

  // Scope gelombang aktif: null = belum diketahui/biarkan semua terbuka,
  // array kosong = gelombang tidak aktif (semua jalur/jenjang ditutup).
  const { isActive: waveIsActive, allowedPaths, allowedLevels, isFetching: scopeLoading, isError } = useActiveWave()

  const waveScope = useMemo(() => ({
    paths: scopeLoading || isError ? null : (waveIsActive ? allowedPaths : []),
    levels: scopeLoading || isError ? null : (waveIsActive ? allowedLevels : []),
  }), [scopeLoading, isError, waveIsActive, allowedPaths, allowedLevels])
  const scopeLoaded = !scopeLoading

  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')

  useEffect(() => {
    fetchWilayah('provinces.json').then(setProvinces)
  }, [])

  const handleProvinceChange = (id: string) => {
    setSelectedProvinceId(id)
    const name = provinces.find(p => p.id === id)?.name || ''
    setFormData({...formData, province: name, city: '', district: '', village: ''})

    setSelectedCityId('')
    setSelectedDistrictId('')
    setCities([])
    setDistricts([])
    setVillages([])

    fetchWilayah(`regencies/${id}.json`).then(setCities)
  }

  const handleCityChange = (id: string) => {
    setSelectedCityId(id)
    const name = cities.find(c => c.id === id)?.name || ''
    setFormData({...formData, city: name, district: '', village: ''})

    setSelectedDistrictId('')
    setDistricts([])
    setVillages([])

    fetchWilayah(`districts/${id}.json`).then(setDistricts)
  }

  const handleDistrictChange = (id: string) => {
    setSelectedDistrictId(id)
    const name = districts.find(d => d.id === id)?.name || ''
    setFormData({...formData, district: name, village: ''})

    setVillages([])

    fetchWilayah(`villages/${id}.json`).then(setVillages)
  }

  const handleVillageChange = (id: string) => {
    const name = villages.find(v => v.id === id)?.name || ''
    setFormData({...formData, village: name})
  }

  const levelOptions = useMemo(() => {
    if (formData.registration_path === 'reguler') {
      return ['SMP', 'SMK']
    }
    if (formData.registration_path === 'pindahan') {
      return ['SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9', 'SMK Kelas 10', 'SMK Kelas 11']
    }
    return []
  }, [formData.registration_path])

  // Saring opsi jenjang sesuai scope gelombang aktif (jenjang yang ditutup disembunyikan)
  const availableLevels = useMemo(() => {
    if (!waveScope.levels) return levelOptions
    return levelOptions.filter(lvl => waveScope.levels!.includes(lvl.split(' ')[0]))
  }, [levelOptions, waveScope])

  const isPathOpen = (path: string) => !waveScope.paths || waveScope.paths.includes(path)

  const noActiveWave = scopeLoaded && waveScope.paths !== null && waveScope.paths.length === 0

  // Pilihan jenjang efektif: otomatis tidak berlaku jika ditutup oleh gelombang aktif
  const effectiveRegistrationLevel = useMemo(() => {
    if (!formData.registration_level) return ''
    return availableLevels.includes(formData.registration_level) ? formData.registration_level : ''
  }, [availableLevels, formData.registration_level])

  const showMajor = useMemo(() => {
    return effectiveRegistrationLevel.startsWith('SMK')
  }, [effectiveRegistrationLevel])

  const handleNext = () => {
    if (step === 1 && !formData.registration_path) {
      toast('error', 'Pilih jalur pendaftaran terlebih dahulu')
      return
    }
    if (step === 2 && !effectiveRegistrationLevel) {
      toast('error', 'Pilih jenjang tujuan terlebih dahulu')
      return
    }
    setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step === 1) navigate('/')
    else setStep(s => s - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (formData.email && formData.phone) {
      setConfirmOpen(true)
      return
    }
    doSubmit()
  }

  const doSubmit = async () => {
    setConfirmOpen(false)
    setLoading(true)
    try {
      const res = await ppdbService.registerApplicant({ ...formData, gender: formData.gender || null })
      setSuccessData(res.credentials)
      toast('success', 'Pendaftaran berhasil!')
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mendaftar')
      toast('error', err.message || 'Gagal mendaftar')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    navigate('/auth/login')
  }

  if (successData) {
    return (
      <SuccessState
        badge="Pendaftaran Sedang Diproses"
        title="Pendaftaran Berhasil!"
        titleEn="Registration Successful"
        description="Terima kasih! Data pendaftaran Anda telah kami terima. Simpan akun di bawah ini untuk login, lalu tunggu pesan dari kami melalui email atau WhatsApp untuk langkah selanjutnya."
        actions={
          <Button onClick={handleFinish} size="lg" className="w-full sm:w-auto bg-emerald-primary hover:bg-emerald-dark">
            <LogIn className="h-4 w-4 mr-2" />
            Login ke Dashboard Sekarang
          </Button>
        }
      >
        <CredentialsCard username={successData.username} password={successData.password} />
      </SuccessState>
    )
  }

  return (
    <div className="relative min-h-screen bg-background font-sans flex flex-col items-center pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Decorative Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(26,107,71,0.08),transparent_60%)] pointer-events-none" />
      <div
        className="fixed inset-0 opacity-[0.35] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(26,107,71,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      {/* Arabic watermark */}
      <div className="pointer-events-none fixed -left-20 top-20 select-none font-heading text-[15rem] font-bold leading-none text-emerald-primary/[0.03] md:text-[25rem]">
        ار
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark mb-2">Penerimaan Peserta Didik Baru</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Pendaftaran <span className="bg-gradient-to-r from-emerald-dark to-emerald-primary bg-clip-text text-transparent">Online</span>
          </h1>
        </div>

        {/* Stepper */}
        {!successData && (
          <div className="mb-10 px-4 md:px-12">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-200 -z-10" />
              {[
                { title: 'Jalur', desc: 'Pilihan Jalur' },
                { title: 'Jenjang', desc: 'Pilihan Jenjang' },
                { title: 'Biodata', desc: 'Lengkapi Data' }
              ].map((s, i) => {
                const isActive = step === i + 1
                const isPassed = step > i + 1
                return (
                  <div key={s.title} className="flex flex-col items-center bg-background px-2">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isActive ? "border-emerald-primary bg-emerald-light/30 text-emerald-primary shadow-md shadow-emerald-primary/20 scale-110" :
                        isPassed ? "border-emerald-primary bg-emerald-primary text-white" :
                          "border-slate-200 bg-white text-slate-400"
                    )}>
                      {isPassed ? <Check className="h-5 w-5" /> : <span className="font-bold">{i + 1}</span>}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={cn("text-sm font-bold", isActive ? "text-slate-900" : isPassed ? "text-emerald-primary" : "text-slate-400")}>{s.title}</p>
                      <p className="hidden md:block text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Button variant="ghost" onClick={handleBack} className="mb-4 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> {step === 1 ? 'Ke Beranda' : 'Kembali'}
        </Button>

        {step === 1 && (
          <Card className="glass-card shadow-2xl border-white/50 bg-white/80 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-primary to-gold-accent" />
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl font-bold font-heading">Pilih Jalur Pendaftaran</CardTitle>
              <CardDescription className="text-base">Tentukan jalur pendaftaran yang sesuai dengan riwayat pendidikan calon siswa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noActiveWave && (
                <Alert type="warning" title="Pendaftaran Sedang Ditutup">
                  Saat ini tidak ada gelombang pendaftaran yang aktif. Silakan cek kembali nanti atau hubungi panitia.
                </Alert>
              )}
              {[
                { value: 'reguler', icon: BookOpen, title: 'Reguler (Peserta Didik Baru)', desc: "Untuk lulusan jenjang sebelumnya yang ingin masuk pada tahun ajaran baru.", bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20' },
                { value: 'pindahan', icon: ArrowRight, title: 'Pindahan (Mutasi Masuk)', desc: 'Untuk siswa yang pindah sekolah di pertengahan tahun ajaran atau naik kelas.', bg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20' },
              ].map(opt => {
                const open = isPathOpen(opt.value)
                const active = formData.registration_path === opt.value
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      "group relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                      open ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50" : "opacity-50 cursor-not-allowed",
                      active && open ? "border-emerald-primary bg-emerald-50/50 ring-4 ring-emerald-primary/10" : "border-slate-100 bg-white hover:border-emerald-primary/30"
                    )}
                    onClick={() => { if (!open) return; setFormData({...formData, registration_path: opt.value, registration_level: ''}) }}
                  >
                    {active && <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-emerald-primary animate-pulse" />}
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3.5 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110", opt.bg)}>
                        <opt.icon className="h-6 w-6" />
                      </div>
                      <div className="pt-1">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                          {opt.title}
                          {!open && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 border border-rose-200 bg-rose-50 rounded-full px-2.5 py-0.5">Ditutup</span>}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed pr-6">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-6">
                <Button
                  onClick={handleNext}
                  disabled={!formData.registration_path}
                  className="rounded-full bg-emerald-primary px-8 h-12 text-base font-bold shadow-lg shadow-emerald-primary/25 transition-all hover:bg-emerald-dark hover:shadow-emerald-primary/40"
                >
                  Lanjut <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass-card shadow-2xl border-white/50 bg-white/80 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-primary to-gold-accent" />
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl font-bold font-heading">Jenjang Pendidikan</CardTitle>
              <CardDescription className="text-base">Pilih jenjang dan tingkat tujuan pendaftaran calon siswa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {availableLevels.length === 0 ? (
                <Alert type="warning" title="Jenjang Tidak Tersedia">
                  Gelombang yang aktif saat ini tidak membuka jenjang untuk jalur {formData.registration_path === 'pindahan' ? 'pindahan' : 'reguler'}. Silakan pilih jalur lain atau hubungi panitia.
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableLevels.map(lvl => (
                    <div
                      key={lvl}
                      className={cn(
                        "group p-6 border-2 rounded-2xl cursor-pointer text-center transition-all duration-300",
                        effectiveRegistrationLevel === lvl
                          ? "border-emerald-primary bg-emerald-50/50 ring-4 ring-emerald-primary/10 shadow-lg shadow-emerald-primary/10"
                          : "border-slate-100 bg-white hover:border-emerald-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
                      )}
                      onClick={() => setFormData({...formData, registration_level: lvl})}
                    >
                      <div className={cn(
                        "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110",
                        effectiveRegistrationLevel === lvl ? "bg-emerald-primary text-white shadow-md shadow-emerald-primary/30" : "bg-slate-100 text-slate-400"
                      )}>
                        <GraduationCap className="h-7 w-7" />
                      </div>
                      <h3 className={cn("font-bold text-lg", effectiveRegistrationLevel === lvl ? "text-emerald-900" : "text-slate-700")}>{lvl}</h3>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  onClick={handleNext}
                  disabled={!effectiveRegistrationLevel}
                  className="rounded-full bg-emerald-primary px-8 h-12 text-base font-bold shadow-lg shadow-emerald-primary/25 transition-all hover:bg-emerald-dark hover:shadow-emerald-primary/40"
                >
                  Lanjut ke Biodata <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="glass-card shadow-2xl border-white/50 bg-white/80 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-primary to-gold-accent" />
            <CardHeader className="text-center pt-8 border-b border-slate-100/50 bg-white/50 pb-6 mb-6">
              <CardTitle className="text-2xl font-bold font-heading">Formulir Biodata</CardTitle>
              <CardDescription className="text-base">
                Lengkapi data calon siswa dengan benar sesuai dokumen resmi.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 md:px-10 pb-10">
              <form onSubmit={handleSubmit} className="space-y-8">

                {/* Section: Data Diri */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                    <h3 className="text-lg font-bold text-slate-800">Identitas Calon Siswa</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="full_name">Nama Lengkap (Sesuai Ijazah/Akta) *</Label>
                    <Input
                      id="full_name" required maxLength={100}
                      value={formData.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Jenis Kelamin</Label>
                    <Select value={formData.gender} onValueChange={(v: string) => setFormData({...formData, gender: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nisn">NISN *</Label>
                    <Input
                      id="nisn" required inputMode="numeric" minLength={10} maxLength={10}
                      placeholder="10 digit"
                      value={formData.nisn}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nisn: e.target.value.replace(/\D/g, '')})}
                    />
                    <p className="text-xs text-muted-foreground">Nomor Induk Siswa Nasional (10 digit angka).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nik">NIK *</Label>
                    <Input
                      id="nik" required inputMode="numeric" minLength={16} maxLength={16}
                      placeholder="16 digit"
                      value={formData.nik}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nik: e.target.value.replace(/\D/g, '')})}
                    />
                    <p className="text-xs text-muted-foreground">NIK sesuai Kartu Keluarga / KTP (16 digit angka).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_place" className="font-semibold text-slate-700">Tempat Lahir *</Label>
                    <Input
                      id="birth_place" required maxLength={100}
                      value={formData.birth_place}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, birth_place: e.target.value})}
                      className="transition-shadow focus-visible:ring-emerald-primary/30 focus-visible:border-emerald-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="font-semibold text-slate-700">Tanggal Lahir *</Label>
                    <Input
                      id="birth_date" type="date" required max={todayStr}
                      value={formData.birth_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, birth_date: e.target.value})}
                      className="transition-shadow focus-visible:ring-emerald-primary/30 focus-visible:border-emerald-primary"
                    />
                  </div>
                  </div>
                </div>

                {/* Section: Kontak & Asal */}
                <div className="space-y-5 pt-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                    <h3 className="text-lg font-bold text-slate-800">Kontak & Asal Sekolah</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Aktif *</Label>
                    <Input
                      id="email" type="email" required maxLength={100}
                      placeholder="nama@email.com"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor HP/WhatsApp *</Label>
                    <Input
                      id="phone" type="tel" required inputMode="numeric" minLength={9} maxLength={16}
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                    />
                    <p className="text-xs text-muted-foreground">Hanya angka, awali dengan 08 (9–16 digit).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Nama Orang Tua / Wali *</Label>
                    <Input
                      id="parent_name" required maxLength={150}
                      value={formData.parent_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, parent_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="previous_school" className="font-semibold text-slate-700">Asal Sekolah (TK/SD/SMP) *</Label>
                    <Input
                      id="previous_school" required maxLength={150}
                      value={formData.previous_school}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, previous_school: e.target.value})}
                      className="transition-shadow focus-visible:ring-emerald-primary/30 focus-visible:border-emerald-primary"
                    />
                  </div>
                  </div>
                </div>

                {/* Section: Domisili */}
                <div className="space-y-5 pt-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                    <h3 className="text-lg font-bold text-slate-800">Data Domisili</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div className="space-y-2">
                    <Label htmlFor="province">Provinsi *</Label>
                    <Select required value={selectedProvinceId} onValueChange={handleProvinceChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih Provinsi..." /></SelectTrigger>
                      <SelectContent>
                        {provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Kota/Kabupaten *</Label>
                    <Select required disabled={!selectedProvinceId} value={selectedCityId} onValueChange={handleCityChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kota/Kabupaten..." /></SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Kecamatan *</Label>
                    <Select required disabled={!selectedCityId} value={selectedDistrictId} onValueChange={handleDistrictChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kecamatan..." /></SelectTrigger>
                      <SelectContent>
                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="village">Kelurahan/Desa *</Label>
                    <Select required disabled={!selectedDistrictId} value={villages.find(v => v.name === formData.village)?.id || ''} onValueChange={handleVillageChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kelurahan/Desa..." /></SelectTrigger>
                      <SelectContent>
                        {villages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Kode Pos</Label>
                    <Input id="postal_code" inputMode="numeric" maxLength={5} placeholder="5 digit"
                      value={formData.postal_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, postal_code: e.target.value.replace(/\D/g, '')})} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="font-semibold text-slate-700">Alamat Detail *</Label>
                    <Textarea
                      id="address" required maxLength={500}
                      placeholder="Contoh: Jl. Ahmad Yani No. 12 RT 01/RW 03, Perumahan ABC Blok C5"
                      value={formData.address}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, address: e.target.value})}
                      className="min-h-[100px] transition-shadow focus-visible:ring-emerald-primary/30 focus-visible:border-emerald-primary resize-y"
                    />
                  </div>
                  </div>
                </div>

                {/* Section: Riwayat Kesehatan */}
                <div className="space-y-5 pt-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                    <h3 className="text-lg font-bold text-slate-800">Riwayat Kesehatan</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disease_history" className="font-semibold text-slate-700">Riwayat Penyakit (Pengganti Medcheck)</Label>
                    <Textarea
                      id="disease_history" maxLength={500}
                      placeholder="Sebutkan jika ada riwayat penyakit bawaan, kronis, atau alergi (Tulis '-' jika tidak ada)"
                      value={formData.disease_history}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, disease_history: e.target.value})}
                      className="min-h-[100px] transition-shadow focus-visible:ring-emerald-primary/30 focus-visible:border-emerald-primary resize-y"
                    />
                  </div>
                </div>

                {showMajor && (
                  <div className="space-y-5 pt-4">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                      <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                      <h3 className="text-lg font-bold text-slate-800">Pilihan Keahlian</h3>
                    </div>
                    <div className="space-y-2">
                      <Select required value={formData.major_choice} onValueChange={(v: string) => setFormData({...formData, major_choice: v})}>
                        <SelectTrigger><SelectValue placeholder="Pilih kompetensi keahlian..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Teknik Komputer & Jaringan (TKJ)">Teknik Komputer &amp; Jaringan (TKJ)</SelectItem>
                          <SelectItem value="Rekayasa Perangkat Lunak (RPL)">Rekayasa Perangkat Lunak (RPL)</SelectItem>
                          <SelectItem value="Desain Komunikasi Visual (DKV)">Desain Komunikasi Visual (DKV)</SelectItem>
                          <SelectItem value="Bisnis Digital">Bisnis Digital</SelectItem>
                          <SelectItem value="Akuntansi dan Keuangan Lembaga (AKL)">Akuntansi dan Keuangan Lembaga (AKL)</SelectItem>
                          <SelectItem value="Otomatisasi Tata Kelola Perkantoran (OTKP)">Otomatisasi Tata Kelola Perkantoran (OTKP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Alert type="warning" title="Periksa Email & No. WhatsApp Anda" className="border-amber-200 bg-amber-50">
                    <span className="text-amber-800">Pastikan email dan nomor WhatsApp yang Anda isi sudah benar, karena sistem akan mengirim kredensial login (username & password) ke alamat email dan nomor WhatsApp tersebut.</span>
                  </Alert>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-8 border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto rounded-full bg-emerald-primary px-8 h-12 text-base font-bold shadow-lg shadow-emerald-primary/25 transition-all hover:bg-emerald-dark hover:shadow-emerald-primary/40 disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">Memproses... <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /></span>
                    ) : (
                      <span className="flex items-center gap-2">Selesaikan Pendaftaran <Check className="h-5 w-5" /></span>
                    )}
                  </Button>
                </div>

                {submitError && (
                  <Alert type="error" title="Pendaftaran gagal" className="mt-4">
                    {submitError}
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={doSubmit}
          loading={loading}
          title="Periksa Email & No. WhatsApp"
          message={`Email: ${formData.email}\nNo. WhatsApp: ${formData.phone}\n\nPastikan keduanya sudah benar, karena sistem akan mengirim kredensial login (username & password) ke email dan nomor WhatsApp tersebut.`}
          confirmLabel="Sudah Benar, Daftar"
        />
      </div>
    </div>
  )
}
