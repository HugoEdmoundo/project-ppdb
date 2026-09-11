import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useActiveWave } from '@/hooks/useActiveWave'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Alert, ConfirmDialog,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea
} from '@/components/ui'
import { SuccessState } from "@/components/ui"
import { CredentialsCard } from '@/components/CredentialsCard'
import { ArrowLeft, ArrowRight, LogIn, BookOpen, GraduationCap } from 'lucide-react'

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
    nisn: '',
    nik: '',
    email: '',
    phone: '',
    parent_name: '',
    previous_school: '',
    major_choice: '',
    address: '',
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
      const res = await ppdbService.registerApplicant(formData)
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
          <Button onClick={handleFinish} size="lg" className="w-full sm:w-auto">
            <LogIn className="h-4 w-4" />
            Lanjut ke Login
          </Button>
        }
      >
        <CredentialsCard username={successData.username} password={successData.password} />
      </SuccessState>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>

        {step === 1 && (
          <Card className="glass-card shadow-xl border-primary/10 animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-heading">Jalur Pendaftaran</CardTitle>
              <CardDescription>Pilih jalur pendaftaran yang sesuai dengan kondisi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noActiveWave && (
                <Alert type="warning" title="Pendaftaran Sedang Ditutup">
                  Saat ini tidak ada gelombang pendaftaran yang aktif. Silakan cek kembali nanti atau hubungi panitia.
                </Alert>
              )}
              {[
                { value: 'reguler', icon: BookOpen, title: 'Reguler (Peserta Didik Baru)', desc: "Pendaftaran untuk lulusan jenjang sebelumnya (SD ke SMP, atau SMP ke SMK) yang ingin masuk pada tahun ajaran baru tingkat awal.", bg: 'bg-blue-100 text-blue-600' },
                { value: 'pindahan', icon: ArrowRight, title: 'Pindahan (Mutasi Masuk)', desc: 'Pendaftaran untuk siswa yang pindah sekolah di pertengahan tahun ajaran atau naik kelas namun pindah sekolah.', bg: 'bg-amber-100 text-amber-600' },
              ].map(opt => {
                const open = isPathOpen(opt.value)
                const active = formData.registration_path === opt.value
                return (
                  <div
                    key={opt.value}
                    className={`p-4 border-2 rounded-xl transition-all ${open ? 'cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'} ${active && open ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                    onClick={() => { if (!open) return; setFormData({...formData, registration_path: opt.value, registration_level: ''}) }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${opt.bg}`}><opt.icon className="h-6 w-6" /></div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {opt.title}
                          {!open && <span className="text-xs font-semibold text-rose-danger border border-rose-danger/30 bg-rose-light rounded-md px-2 py-0.5">Ditutup</span>}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!formData.registration_path}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass-card shadow-xl border-primary/10 animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-heading">Jenjang Pendidikan</CardTitle>
              <CardDescription>Pilih jenjang dan kelas tujuan pendaftaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableLevels.length === 0 ? (
                <Alert type="warning" title="Jenjang Tidak Tersedia">
                  Gelombang yang aktif saat ini tidak membuka jenjang untuk jalur {formData.registration_path === 'pindahan' ? 'pindahan' : 'reguler'}. Silakan pilih jalur lain atau hubungi panitia.
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableLevels.map(lvl => (
                    <div
                      key={lvl}
                      className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all hover:border-primary/50 ${effectiveRegistrationLevel === lvl ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                      onClick={() => setFormData({...formData, registration_level: lvl})}
                    >
                      <GraduationCap className={`h-8 w-8 mx-auto mb-2 ${effectiveRegistrationLevel === lvl ? 'text-primary' : 'text-muted-foreground'}`} />
                      <h3 className="font-bold text-lg">{lvl}</h3>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>Kembali</Button>
                <Button onClick={handleNext} disabled={!effectiveRegistrationLevel}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="glass-card shadow-xl border-primary/10 animate-in fade-in slide-in-from-right-4 duration-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold font-heading">Formulir Biodata</CardTitle>
              <CardDescription>
                Lengkapi data calon siswa dengan benar sesuai dokumen resmi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="full_name">Nama Lengkap (Sesuai Ijazah/Akta) *</Label>
                    <Input
                      id="full_name" required maxLength={100}
                      value={formData.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, full_name: e.target.value})}
                    />
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
                    <Label htmlFor="birth_place">Tempat Lahir *</Label>
                    <Input
                      id="birth_place" required maxLength={100}
                      value={formData.birth_place}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, birth_place: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Tanggal Lahir *</Label>
                    <Input
                      id="birth_date" type="date" required max={todayStr}
                      value={formData.birth_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>

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
                    <Label htmlFor="previous_school">Asal Sekolah (TK/SD/SMP) *</Label>
                    <Input
                      id="previous_school" required maxLength={150}
                      value={formData.previous_school}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, previous_school: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2 pt-4 pb-2">
                    <h3 className="text-lg font-semibold border-b pb-2">Data Domisili</h3>
                  </div>

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
                    <Label htmlFor="address">Alamat Detail *</Label>
                    <Textarea
                      id="address" required maxLength={500}
                      placeholder="Contoh: Jl. Ahmad Yani No. 12 RT 01/RW 03, Perumahan ABC Blok C5"
                      value={formData.address}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, address: e.target.value})}
                      className="min-h-[80px]"
                    />
                  </div>

                  {showMajor && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="major_choice">Pilihan Kompetensi Keahlian *</Label>
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
                  )}
                </div>

                <Alert type="warning" title="Periksa Email & No. WhatsApp Anda">
                  Pastikan email dan nomor WhatsApp yang Anda isi sudah benar, karena sistem akan mengirim
                  kredensial login (username &amp; password) ke alamat email dan nomor WhatsApp tersebut.
                </Alert>

                <div className="flex justify-between pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={handleBack}>Kembali</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Memproses...' : 'Selesaikan Pendaftaran'}
                  </Button>
                </div>

                {submitError && (
                  <Alert type="error" title="Pendaftaran gagal">
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
