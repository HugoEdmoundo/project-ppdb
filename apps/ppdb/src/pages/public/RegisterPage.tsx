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
  Textarea, Checkbox
} from '@/components/ui'
import { SuccessState } from "@/components/ui"
import { CredentialsCard } from '@/components/CredentialsCard'
import {
  ArrowLeft, ArrowRight, LogIn, BookOpen, GraduationCap, Check, Trophy, Award,
  Phone
} from 'lucide-react'

// Batas maksimal tanggal lahir = hari ini (tidak boleh lahir di masa depan)
const todayStr = new Date().toISOString().split('T')[0]

const DIAGNOSED_CONDITIONS_OPTIONS = [
  'Asma',
  'Diabetes',
  'Epilepsi',
  'Penyakit jantung',
  'Hipertensi',
  'TBC',
  'Lainnya',
]

const ALLERGY_OPTIONS = [
  'Makanan',
  'Obat-obatan',
  'Debu',
  'Lainnya',
]

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
    address: '',
    province: '',
    city: '',
    district: '',
    village: '',
    postal_code: ''
  })

  // Formulir Identifikasi Kesehatan (pengganti Medcheck sesuai docs/REQUIREMENTS.md)
  const [healthForm, setHealthForm] = useState({
    chronic_disease: false,
    chronic_disease_description: '',

    diagnosed_conditions: [] as string[],
    diagnosed_conditions_other: '',
    diagnosed_conditions_description: '',

    allergies: false,
    allergy_types: [] as string[],
    allergy_other: '',
    allergy_description: '',

    regular_medication: false,
    regular_medication_description: '',

    physical_limitation: false,
    physical_limitation_description: '',

    hospitalization_history: false,
    hospitalization_history_description: '',

    special_needs: false,
    special_needs_description: '',

    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',

    health_declaration_confirmed: false,
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
  // array kosong = gelombang tidak aktif (semua jalur ditutup).
  const { isActive: waveIsActive, allowedPaths, isFetching: scopeLoading, isError } = useActiveWave()

  const waveScope = useMemo(() => ({
    paths: scopeLoading || isError ? null : (waveIsActive ? allowedPaths : []),
  }), [scopeLoading, isError, waveIsActive, allowedPaths])
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

  const isPathOpen = (path: string) => !waveScope.paths || waveScope.paths.includes(path)

  const noActiveWave = scopeLoaded && waveScope.paths !== null && waveScope.paths.length === 0

  const handleNext = () => {
    if (step === 1 && !formData.registration_path) {
      toast('error', 'Pilih jalur pendaftaran terlebih dahulu')
      return
    }
    setStep(2)
  }

  const handleBack = () => {
    if (step === 1) navigate('/')
    else setStep(s => s - 1)
  }

  const validateHealthForm = (): string | null => {
    if (healthForm.chronic_disease && !healthForm.chronic_disease_description.trim()) {
      return 'Keterangan riwayat penyakit kronis wajib diisi jika menjawab Ya (Pertanyaan 1).'
    }
    if (healthForm.diagnosed_conditions.includes('Lainnya') && !healthForm.diagnosed_conditions_other.trim()) {
      return 'Isian kondisi diagnosis lainnya wajib diisi jika opsi Lainnya dipilih (Pertanyaan 2).'
    }
    if (healthForm.allergies) {
      if (healthForm.allergy_types.includes('Lainnya') && !healthForm.allergy_other.trim()) {
        return 'Isian jenis alergi lainnya wajib diisi jika opsi Lainnya dipilih (Pertanyaan 3).'
      }
    }
    if (healthForm.regular_medication && !healthForm.regular_medication_description.trim()) {
      return 'Keterangan pengobatan rutin wajib diisi jika menjawab Ya (Pertanyaan 4).'
    }
    if (healthForm.physical_limitation && !healthForm.physical_limitation_description.trim()) {
      return 'Keterangan keterbatasan fisik wajib diisi jika menjawab Ya (Pertanyaan 5).'
    }
    if (healthForm.hospitalization_history && !healthForm.hospitalization_history_description.trim()) {
      return 'Keterangan riwayat rawat inap/operasi wajib diisi jika menjawab Ya (Pertanyaan 6).'
    }
    if (healthForm.special_needs && !healthForm.special_needs_description.trim()) {
      return 'Keterangan kebutuhan khusus saat belajar wajib diisi jika menjawab Ya (Pertanyaan 7).'
    }
    if (!healthForm.emergency_contact_name.trim()) {
      return 'Nama kontak darurat wajib diisi (Pertanyaan 8).'
    }
    if (!healthForm.emergency_contact_relation.trim()) {
      return 'Hubungan kontak darurat wajib diisi (Pertanyaan 9).'
    }
    const cleanPhone = healthForm.emergency_contact_phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 16) {
      return 'Nomor telepon kontak darurat harus berupa 9-16 digit angka (Pertanyaan 10).'
    }
    if (!healthForm.health_declaration_confirmed) {
      return 'Anda wajib mencentang persetujuan pernyataan kesehatan sebelum menyelesaikan pendaftaran.'
    }
    return null
  }

  const buildHealthPayload = () => {
    return {
      health_form: {
        chronic_disease: healthForm.chronic_disease,
        chronic_disease_description: healthForm.chronic_disease ? healthForm.chronic_disease_description.trim() : null,

        diagnosed_conditions: healthForm.diagnosed_conditions,
        diagnosed_conditions_other: healthForm.diagnosed_conditions.includes('Lainnya')
          ? healthForm.diagnosed_conditions_other.trim()
          : null,
        diagnosed_conditions_description: healthForm.diagnosed_conditions_description.trim() || null,

        allergies: healthForm.allergies,
        allergy_types: healthForm.allergies ? healthForm.allergy_types : [],
        allergy_other: healthForm.allergies && healthForm.allergy_types.includes('Lainnya')
          ? healthForm.allergy_other.trim()
          : null,
        allergy_description: healthForm.allergies ? (healthForm.allergy_description.trim() || null) : null,

        regular_medication: healthForm.regular_medication,
        regular_medication_description: healthForm.regular_medication
          ? healthForm.regular_medication_description.trim()
          : null,

        physical_limitation: healthForm.physical_limitation,
        physical_limitation_description: healthForm.physical_limitation
          ? healthForm.physical_limitation_description.trim()
          : null,

        hospitalization_history: healthForm.hospitalization_history,
        hospitalization_history_description: healthForm.hospitalization_history
          ? healthForm.hospitalization_history_description.trim()
          : null,

        special_needs: healthForm.special_needs,
        special_needs_description: healthForm.special_needs
          ? healthForm.special_needs_description.trim()
          : null,

        emergency_contact_name: healthForm.emergency_contact_name.trim(),
        emergency_contact_relation: healthForm.emergency_contact_relation.trim(),
        emergency_contact_phone: healthForm.emergency_contact_phone.trim().replace(/\D/g, ''),

        health_declaration_confirmed: healthForm.health_declaration_confirmed,
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const healthError = validateHealthForm()
    if (healthError) {
      setSubmitError(healthError)
      toast('error', healthError)
      return
    }

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
      const res = await ppdbService.registerApplicant({
        ...formData,
        gender: formData.gender || null,
        ...buildHealthPayload(),
      })
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
              <CardDescription className="text-base">Tentukan jalur pendaftaran yang sesuai dengan calon peserta didik.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noActiveWave && (
                <Alert type="warning" title="Pendaftaran Sedang Ditutup">
                  Saat ini tidak ada gelombang pendaftaran yang aktif. Silakan cek kembali nanti atau hubungi panitia.
                </Alert>
              )}
              {[
                { value: 'reguler', icon: BookOpen, title: 'Reguler (Tes TIU)', desc: "Jalur tes kemampuan akademik & TIU online untuk calon santri baru.", bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-500/20' },
                { value: 'prestasi', icon: Trophy, title: 'Prestasi (Non-TIU)', desc: 'Jalur seleksi berbasis prestasi akademik, rapor, atau sertifikat kejuaraan.', bg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20' },
                { value: 'tahfidz', icon: Award, title: 'Tahfidz (Non-TIU)', desc: 'Jalur khusus hafalan Al-Qur\'an dengan uji kompetensi Tahfidz intensif.', bg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/20' },
                { value: 'rapot', icon: GraduationCap, title: 'Rapot', desc: 'Jalur seleksi berbasis nilai rapor untuk pendaftaran tahun ajaran baru.', bg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20' },
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
                     onClick={() => { if (!open) return; setFormData({...formData, registration_path: opt.value}) }}
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

                  <div className="space-y-2">
                    <Label htmlFor="previous_school" className="font-semibold text-slate-700">Asal Sekolah *</Label>
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

                {/* Section: Riwayat Kesehatan (Pengganti Medcheck) */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <div className="h-6 w-1.5 rounded-full bg-emerald-primary" />
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Formulir Identifikasi Kesehatan (Pengganti Medcheck)</h3>
                      <p className="text-xs text-slate-500">
                        Diisi mandiri oleh pendaftar. Mohon berikan informasi yang akurat demi keselamatan dan kenyamanan santri di sekolah.
                      </p>
                    </div>
                  </div>

                  {/* 1. Riwayat Penyakit Kronis */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <Label className="text-sm font-bold text-slate-800 block">
                      1. Apakah Anda memiliki riwayat penyakit kronis? *
                    </Label>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.chronic_disease ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="chronic_disease"
                          checked={healthForm.chronic_disease}
                          onChange={() => setHealthForm(prev => ({ ...prev, chronic_disease: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.chronic_disease ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="chronic_disease"
                          checked={!healthForm.chronic_disease}
                          onChange={() => setHealthForm(prev => ({ ...prev, chronic_disease: false, chronic_disease_description: '' }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.chronic_disease && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="chronic_desc" className="text-xs font-semibold text-slate-700">
                          Jika Ya, sebutkan: *
                        </Label>
                        <Textarea
                          id="chronic_desc"
                          required
                          rows={2}
                          placeholder="Sebutkan riwayat penyakit kronis yang dimiliki..."
                          value={healthForm.chronic_disease_description}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, chronic_disease_description: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Kondisi yang Pernah Didiagnosis */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div>
                      <Label className="text-sm font-bold text-slate-800">
                        2. Apakah Anda pernah didiagnosis memiliki salah satu kondisi berikut?
                      </Label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        (Bisa checklist — kosongkan jika tidak ada)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                      {DIAGNOSED_CONDITIONS_OPTIONS.map((cond) => {
                        const checked = healthForm.diagnosed_conditions.includes(cond)
                        return (
                          <label
                            key={cond}
                            className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors",
                              checked ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                setHealthForm(prev => {
                                  const next = c
                                    ? [...prev.diagnosed_conditions, cond]
                                    : prev.diagnosed_conditions.filter(item => item !== cond)
                                  return {
                                    ...prev,
                                    diagnosed_conditions: next,
                                    diagnosed_conditions_other: next.includes('Lainnya') ? prev.diagnosed_conditions_other : ''
                                  }
                                })
                              }}
                            />
                            <span>{cond}</span>
                          </label>
                        )
                      })}
                    </div>
                    {healthForm.diagnosed_conditions.includes('Lainnya') && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="diagnosed_other" className="text-xs font-semibold text-slate-700">
                          Lainnya: *
                        </Label>
                        <Input
                          id="diagnosed_other"
                          required
                          placeholder="Sebutkan kondisi diagnosis lainnya..."
                          value={healthForm.diagnosed_conditions_other}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, diagnosed_conditions_other: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <Label htmlFor="diagnosed_notes" className="text-xs font-semibold text-slate-700">
                        Keterangan tambahan (opsional)
                      </Label>
                      <Textarea
                        id="diagnosed_notes"
                        rows={2}
                        placeholder="Penjelasan singkat mengenai diagnosis yang dipilih jika ada..."
                        value={healthForm.diagnosed_conditions_description}
                        onChange={(e) => setHealthForm(prev => ({ ...prev, diagnosed_conditions_description: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* 3. Alergi */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Alergi</span>
                      <Label className="text-sm font-bold text-slate-800 block mt-0.5">
                        3. Apakah Anda memiliki alergi? *
                      </Label>
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.allergies ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="allergies"
                          checked={healthForm.allergies}
                          onChange={() => setHealthForm(prev => ({ ...prev, allergies: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.allergies ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="allergies"
                          checked={!healthForm.allergies}
                          onChange={() => setHealthForm(prev => ({
                            ...prev,
                            allergies: false,
                            allergy_types: [],
                            allergy_other: '',
                            allergy_description: ''
                          }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.allergies && (
                      <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                        <Label className="text-xs font-semibold text-slate-700 block">Jika Ya:</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {ALLERGY_OPTIONS.map((al) => {
                            const checked = healthForm.allergy_types.includes(al)
                            return (
                              <label
                                key={al}
                                className={cn(
                                  "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors",
                                  checked ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    setHealthForm(prev => {
                                      const next = c
                                        ? [...prev.allergy_types, al]
                                        : prev.allergy_types.filter(item => item !== al)
                                      return {
                                        ...prev,
                                        allergy_types: next,
                                        allergy_other: next.includes('Lainnya') ? prev.allergy_other : ''
                                      }
                                    })
                                  }}
                                />
                                <span>{al}</span>
                              </label>
                            )
                          })}
                        </div>
                        {healthForm.allergy_types.includes('Lainnya') && (
                          <div className="space-y-1.5">
                            <Label htmlFor="allergy_other" className="text-xs font-semibold text-slate-700">
                              Lainnya: *
                            </Label>
                            <Input
                              id="allergy_other"
                              required
                              placeholder="Sebutkan jenis alergi lainnya..."
                              value={healthForm.allergy_other}
                              onChange={(e) => setHealthForm(prev => ({ ...prev, allergy_other: e.target.value }))}
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="allergy_desc" className="text-xs font-semibold text-slate-700">
                            Keterangan:
                          </Label>
                          <Textarea
                            id="allergy_desc"
                            rows={2}
                            placeholder="Contoh: Gejala atau obat penanganan jika alergi kambuh..."
                            value={healthForm.allergy_description}
                            onChange={(e) => setHealthForm(prev => ({ ...prev, allergy_description: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Pengobatan Rutin */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Pengobatan Rutin</span>
                      <Label className="text-sm font-bold text-slate-800 block mt-0.5">
                        4. Apakah Anda sedang menjalani pengobatan rutin atau mengonsumsi obat tertentu secara berkala? *
                      </Label>
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.regular_medication ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="regular_medication"
                          checked={healthForm.regular_medication}
                          onChange={() => setHealthForm(prev => ({ ...prev, regular_medication: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.regular_medication ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="regular_medication"
                          checked={!healthForm.regular_medication}
                          onChange={() => setHealthForm(prev => ({ ...prev, regular_medication: false, regular_medication_description: '' }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.regular_medication && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="regular_med_desc" className="text-xs font-semibold text-slate-700">
                          Jika Ya: *
                        </Label>
                        <Textarea
                          id="regular_med_desc"
                          required
                          rows={2}
                          placeholder="Sebutkan nama obat, dosis, atau frekuensi konsumsi..."
                          value={healthForm.regular_medication_description}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, regular_medication_description: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. Keterbatasan Fisik */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Keterbatasan Fisik</span>
                      <Label className="text-sm font-bold text-slate-800 block mt-0.5">
                        5. Apakah Anda memiliki kondisi kesehatan atau keterbatasan fisik yang perlu diketahui sekolah? *
                      </Label>
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.physical_limitation ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="physical_limitation"
                          checked={healthForm.physical_limitation}
                          onChange={() => setHealthForm(prev => ({ ...prev, physical_limitation: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.physical_limitation ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="physical_limitation"
                          checked={!healthForm.physical_limitation}
                          onChange={() => setHealthForm(prev => ({ ...prev, physical_limitation: false, physical_limitation_description: '' }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.physical_limitation && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="physical_lim_desc" className="text-xs font-semibold text-slate-700">
                          Jika Ya: *
                        </Label>
                        <Textarea
                          id="physical_lim_desc"
                          required
                          rows={2}
                          placeholder="Jelaskan kondisi atau keterbatasan fisik yang perlu diketahui sekolah..."
                          value={healthForm.physical_limitation_description}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, physical_limitation_description: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 6. Riwayat Rawat Inap */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Riwayat Rawat Inap</span>
                      <Label className="text-sm font-bold text-slate-800 block mt-0.5">
                        6. Apakah Anda pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir? *
                      </Label>
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.hospitalization_history ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="hospitalization_history"
                          checked={healthForm.hospitalization_history}
                          onChange={() => setHealthForm(prev => ({ ...prev, hospitalization_history: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.hospitalization_history ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="hospitalization_history"
                          checked={!healthForm.hospitalization_history}
                          onChange={() => setHealthForm(prev => ({ ...prev, hospitalization_history: false, hospitalization_history_description: '' }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.hospitalization_history && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="hosp_desc" className="text-xs font-semibold text-slate-700">
                          Jika Ya: *
                        </Label>
                        <Textarea
                          id="hosp_desc"
                          required
                          rows={2}
                          placeholder="Jelaskan alasan rawat inap atau operasi dalam 2 tahun terakhir..."
                          value={healthForm.hospitalization_history_description}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, hospitalization_history_description: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 7. Kebutuhan Khusus */}
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Kebutuhan Khusus</span>
                      <Label className="text-sm font-bold text-slate-800 block mt-0.5">
                        7. Apakah Anda memiliki kebutuhan khusus terkait kesehatan selama mengikuti kegiatan belajar? *
                      </Label>
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        healthForm.special_needs ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="special_needs"
                          checked={healthForm.special_needs}
                          onChange={() => setHealthForm(prev => ({ ...prev, special_needs: true }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Ya</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all",
                        !healthForm.special_needs ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      )}>
                        <input
                          type="radio"
                          name="special_needs"
                          checked={!healthForm.special_needs}
                          onChange={() => setHealthForm(prev => ({ ...prev, special_needs: false, special_needs_description: '' }))}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span>Tidak</span>
                      </label>
                    </div>
                    {healthForm.special_needs && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <Label htmlFor="special_needs_desc" className="text-xs font-semibold text-slate-700">
                          Jika Ya: *
                        </Label>
                        <Textarea
                          id="special_needs_desc"
                          required
                          rows={2}
                          placeholder="Jelaskan kebutuhan khusus saat belajar..."
                          value={healthForm.special_needs_description}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, special_needs_description: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* 8, 9, 10. Kontak Darurat */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
                      <Phone className="h-4 w-4 text-emerald-700" />
                      <h4 className="font-bold text-sm text-slate-800">Kontak Darurat</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="emg_name" className="text-xs font-semibold text-slate-700">
                          8. Nama kontak darurat *
                        </Label>
                        <Input
                          id="emg_name"
                          required
                          maxLength={150}
                          placeholder="Nama lengkap kontak darurat..."
                          value={healthForm.emergency_contact_name}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="emg_rel" className="text-xs font-semibold text-slate-700">
                          9. Hubungan dengan calon peserta didik *
                        </Label>
                        <Input
                          id="emg_rel"
                          required
                          maxLength={100}
                          placeholder="Contoh: Orang Tua (Ayah/Ibu), Wali, Paman..."
                          value={healthForm.emergency_contact_relation}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_relation: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="emg_phone" className="text-xs font-semibold text-slate-700">
                          10. Nomor telepon darurat *
                        </Label>
                        <Input
                          id="emg_phone"
                          required
                          inputMode="numeric"
                          minLength={9}
                          maxLength={16}
                          placeholder="08xxxxxxxxxx (9-16 digit angka)"
                          value={healthForm.emergency_contact_phone}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_phone: e.target.value.replace(/\D/g, '') }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pernyataan */}
                  <div className={cn(
                    "rounded-xl border p-4 sm:p-5 transition-all",
                    healthForm.health_declaration_confirmed
                      ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                      : "border-slate-300 bg-slate-50"
                  )}>
                    <div className="mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Pernyataan</span>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <Checkbox
                        id="health_declaration"
                        checked={healthForm.health_declaration_confirmed}
                        onCheckedChange={(c) => setHealthForm(prev => ({ ...prev, health_declaration_confirmed: !!c }))}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                          "Saya menyatakan bahwa informasi kesehatan yang saya berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat perubahan kondisi kesehatan, saya bersedia memberitahukan pihak sekolah."
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

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
