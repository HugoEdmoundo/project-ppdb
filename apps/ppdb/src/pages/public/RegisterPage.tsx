import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import { useActiveWave } from '@/hooks/useActiveWave'
import { cn } from '@/lib/utils'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Alert,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea, Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  SuccessState
} from '@/components/ui'
import { CredentialsCard } from '@/components/CredentialsCard'
import {
  ArrowLeft, ArrowRight, LogIn, BookOpen, GraduationCap, Check, Trophy, Award,
  Phone, User, Users, Mail, MapPin, HeartPulse, ShieldCheck, Edit3,
  CheckCircle2, AlertTriangle, ShieldAlert
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

const JOB_OPTIONS = [
  'PNS / TNI / POLRI',
  'Karyawan BUMN',
  'Karyawan Swasta',
  'Wiraswasta / Pengusaha',
  'Pedagang',
  'Petani / Peternak / Nelayan',
  'Tenaga Medis / Dokter / Perawat',
  'Guru / Dosen / Pendidik',
  'Buruh / Pekerja Harian',
  'Pensiunan',
  'Ibu Rumah Tangga',
  'Tidak Bekerja',
  'Lainnya',
]

const INCOME_OPTIONS = [
  'Kurang dari Rp 1.500.000',
  'Rp 1.500.000 - Rp 3.000.000',
  'Rp 3.000.000 - Rp 5.000.000',
  'Rp 5.000.000 - Rp 10.000.000',
  'Di atas Rp 10.000.000',
]

const STEPS = [
  { id: 1, title: 'Jalur', desc: 'Pilih Jalur' },
  { id: 2, title: 'Calon Murid', desc: 'Identitas Siswa' },
  { id: 3, title: 'Orang Tua/Wali', desc: 'Data Orang Tua' },
  { id: 4, title: 'Kontak', desc: 'Email & WhatsApp' },
  { id: 5, title: 'Domisili', desc: 'Alamat Tinggal' },
  { id: 6, title: 'Kesehatan', desc: 'Identifikasi Kesehatan' },
  { id: 7, title: 'Persetujuan', desc: 'Review & Submit' },
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

  // 1. Data Pendaftaran Lengkap
  const [formData, setFormData] = useState({
    // Step 1: Jalur
    registration_path: '',

    // Step 2: Calon Murid
    full_name: '',
    gender: '',
    nisn: '',
    nik: '',
    birth_place: '',
    birth_date: '',
    previous_school: '',

    // Step 3: Orang Tua / Wali
    father_name: '',
    father_job: '',
    father_phone: '',
    mother_name: '',
    mother_job: '',
    mother_phone: '',
    guardian_name: '',
    guardian_job: '',
    parent_income: '',

    // Step 4: Kontak
    email: '',
    phone: '',
    parent_phone: '',
    parent_email: '',

    // Step 5: Domisili
    address: '',
    province: '',
    city: '',
    district: '',
    village: '',
    postal_code: '',
  })

  // Step 6: Formulir Identifikasi Kesehatan
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

  // Step 7: Pernyataan & Persetujuan
  const [agreements, setAgreements] = useState({
    accurate_data: false,
    false_data_cancel: false,
    privacy_policy: false,
    contact_verified: false,
  })

  // Interstitial Dialog Step 4 -> 5
  const [contactConfirmModalOpen, setContactConfirmModalOpen] = useState(false)

  // Loading & Result
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{username: string, password: string} | null>(null)

  // Wilayah
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [villages, setVillages] = useState<any[]>([])

  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')

  // Scope gelombang aktif
  const { isActive: waveIsActive, allowedPaths, isFetching: scopeLoading, isError } = useActiveWave()

  const waveScope = useMemo(() => ({
    paths: scopeLoading || isError ? null : (waveIsActive ? allowedPaths : []),
  }), [scopeLoading, isError, waveIsActive, allowedPaths])
  const scopeLoaded = !scopeLoading

  useEffect(() => {
    fetchWilayah('provinces.json').then(setProvinces)
  }, [])

  const handleProvinceChange = (id: string) => {
    setSelectedProvinceId(id)
    const name = provinces.find(p => p.id === id)?.name || ''
    setFormData(prev => ({ ...prev, province: name, city: '', district: '', village: '' }))

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
    setFormData(prev => ({ ...prev, city: name, district: '', village: '' }))

    setSelectedDistrictId('')
    setDistricts([])
    setVillages([])

    fetchWilayah(`districts/${id}.json`).then(setDistricts)
  }

  const handleDistrictChange = (id: string) => {
    setSelectedDistrictId(id)
    const name = districts.find(d => d.id === id)?.name || ''
    setFormData(prev => ({ ...prev, district: name, village: '' }))

    setVillages([])

    fetchWilayah(`villages/${id}.json`).then(setVillages)
  }

  const handleVillageChange = (id: string) => {
    const name = villages.find(v => v.id === id)?.name || ''
    setFormData(prev => ({ ...prev, village: name }))
  }

  const isPathOpen = (path: string) => !waveScope.paths || waveScope.paths.includes(path)
  const noActiveWave = scopeLoaded && waveScope.paths !== null && waveScope.paths.length === 0

  // Validasi Step 2: Calon Murid
  const validateStep2 = (): string | null => {
    if (!formData.full_name.trim()) return 'Nama lengkap calon siswa wajib diisi.'
    if (!formData.gender) return 'Jenis kelamin calon siswa wajib dipilih.'
    const cleanNisn = formData.nisn.trim()
    if (!cleanNisn || !/^\d{10}$/.test(cleanNisn)) return 'NISN harus tepat 10 digit angka.'
    const cleanNik = formData.nik.trim()
    if (!cleanNik || !/^\d{16}$/.test(cleanNik)) return 'NIK harus tepat 16 digit angka.'
    if (!formData.birth_place.trim()) return 'Tempat lahir wajib diisi.'
    if (!formData.birth_date) return 'Tanggal lahir wajib diisi.'
    if (formData.birth_date > todayStr) return 'Tanggal lahir tidak boleh di masa depan.'
    if (!formData.previous_school.trim()) return 'Asal sekolah wajib diisi.'
    return null
  }

  // Validasi Step 3: Orang Tua / Wali
  const validateStep3 = (): string | null => {
    const hasFather = formData.father_name.trim().length > 0
    const hasMother = formData.mother_name.trim().length > 0
    const hasGuardian = formData.guardian_name.trim().length > 0

    if (!hasFather && !hasMother && !hasGuardian) {
      return 'Mohon lengkapi minimal salah satu nama orang tua (Ayah/Ibu) atau wali.'
    }
    if (!formData.parent_income) {
      return 'Penghasilan rata-rata orang tua/wali wajib dipilih.'
    }
    return null
  }

  // Validasi Step 4: Kontak
  const validateStep4 = (): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      return 'Format email calon siswa tidak valid.'
    }
    const cleanPhone = formData.phone.trim().replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 16) {
      return 'Nomor HP/WhatsApp calon siswa harus berupa 9-16 digit angka.'
    }
    const cleanParentPhone = formData.parent_phone.trim().replace(/\D/g, '')
    if (!cleanParentPhone || cleanParentPhone.length < 9 || cleanParentPhone.length > 16) {
      return 'Nomor WhatsApp orang tua/wali harus berupa 9-16 digit angka.'
    }
    if (formData.parent_email && !emailRegex.test(formData.parent_email.trim())) {
      return 'Format email orang tua tidak valid.'
    }
    return null
  }

  // Validasi Step 5: Domisili
  const validateStep5 = (): string | null => {
    if (!formData.province) return 'Provinsi wajib dipilih.'
    if (!formData.city) return 'Kota/Kabupaten wajib dipilih.'
    if (!formData.district) return 'Kecamatan wajib dipilih.'
    if (!formData.village) return 'Kelurahan/Desa wajib dipilih.'
    if (!formData.address.trim() || formData.address.trim().length < 5) {
      return 'Alamat detail wajib diisi minimal 5 karakter.'
    }
    if (formData.postal_code && !/^\d{5}$/.test(formData.postal_code.trim())) {
      return 'Kode pos harus 5 digit angka jika diisi.'
    }
    return null
  }

  // Validasi Step 6: Identifikasi Kesehatan
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
      return 'Anda wajib mencentang persetujuan pernyataan kesehatan sebelum melanjutkan.'
    }
    return null
  }

  // Navigasi Next per Step
  const handleNextStep = () => {
    setSubmitError(null)

    if (step === 1) {
      if (!formData.registration_path) {
        toast('error', 'Pilih jalur pendaftaran terlebih dahulu.')
        return
      }
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (step === 2) {
      const err = validateStep2()
      if (err) {
        toast('error', err)
        return
      }
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (step === 3) {
      const err = validateStep3()
      if (err) {
        toast('error', err)
        return
      }
      setStep(4)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (step === 4) {
      const err = validateStep4()
      if (err) {
        toast('error', err)
        return
      }
      // Munculkan Interstitial Confirmation Dialog sebelum lanjut ke Domisili
      setContactConfirmModalOpen(true)
      return
    }

    if (step === 5) {
      const err = validateStep5()
      if (err) {
        toast('error', err)
        return
      }
      setStep(6)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (step === 6) {
      const err = validateHealthForm()
      if (err) {
        toast('error', err)
        return
      }
      setStep(7)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
  }

  const handleBackStep = () => {
    setSubmitError(null)
    if (step === 1) {
      navigate('/')
    } else {
      setStep(s => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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

  // Submit Final di Step 7
  const isAllAgreementsChecked =
    agreements.accurate_data &&
    agreements.false_data_cancel &&
    agreements.privacy_policy &&
    agreements.contact_verified

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAllAgreementsChecked) {
      toast('error', 'Harap centang semua checklist pernyataan untuk melanjutkan.')
      return
    }

    setSubmitError(null)
    setLoading(true)

    try {
      const parentName =
        formData.father_name.trim() ||
        formData.mother_name.trim() ||
        formData.guardian_name.trim()

      const res = await ppdbService.registerApplicant({
        ...formData,
        parent_name: parentName,
        phone: formData.phone.trim().replace(/\D/g, ''),
        parent_phone: formData.parent_phone.trim().replace(/\D/g, ''),
        father_phone: formData.father_phone ? formData.father_phone.trim().replace(/\D/g, '') : null,
        mother_phone: formData.mother_phone ? formData.mother_phone.trim().replace(/\D/g, '') : null,
        gender: formData.gender || null,
        ...buildHealthPayload(),
      })

      setSuccessData(res.credentials)
      toast('success', 'Pendaftaran berhasil dikirim!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setSubmitError(err.message || 'Gagal mendaftar. Silakan periksa kembali data Anda.')
      toast('error', err.message || 'Gagal mendaftar')
    } finally {
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <SuccessState
        badge="Pendaftaran Sedang Diproses"
        title="Pendaftaran Berhasil!"
        titleEn="Registration Successful"
        description="Terima kasih! Data pendaftaran calon santri telah kami terima. Kredensial akun pendaftar telah dikirimkan ke email dan nomor WhatsApp Anda. Simpan kredensial ini untuk login ke dasbor."
        actions={
          <Button onClick={() => navigate('/auth/login')} size="lg" className="w-full sm:w-auto bg-emerald-primary hover:bg-emerald-dark">
            <LogIn className="h-4 w-4 mr-2" />
            Login ke Dasbor PPDB
          </Button>
        }
      >
        <CredentialsCard username={successData.username} password={successData.password} />
      </SuccessState>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50/60 font-sans flex flex-col items-center pt-8 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Decorative Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />
      <div
        className="fixed inset-0 opacity-[0.3] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.12) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      {/* Arabic watermark */}
      <div className="pointer-events-none fixed -left-16 top-20 select-none font-heading text-[16rem] font-bold leading-none text-emerald-primary/[0.03] md:text-[24rem]">
        ار
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Title Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-800 mb-1.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Penerimaan Peserta Didik Baru
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Formulir Pendaftaran <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">Online</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Lengkapi tahapan pendaftaran di bawah ini secara bertahap dan teliti sesuai dokumen resmi calon peserta didik.
          </p>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="mb-8">
          {/* Mobile Stepper Header */}
          <div className="md:hidden bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] text-white font-bold">
                  {step}
                </span>
                {STEPS[step - 1]?.title}
              </span>
              <span className="text-slate-400 font-medium">Langkah {step} dari {STEPS.length}</span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${(step / STEPS.length) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{STEPS[step - 1]?.desc}</p>
          </div>

          {/* Desktop Stepper */}
          <div className="hidden md:block bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="relative flex items-center justify-between">
              {/* Progress track background */}
              <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-1 bg-slate-100 -z-0 rounded-full" />
              <div
                className="absolute left-6 top-5 -translate-y-1/2 h-1 bg-emerald-500 -z-0 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((s) => {
                const isActive = step === s.id
                const isPassed = step > s.id
                const canJump = isPassed

                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!canJump}
                    onClick={() => canJump && setStep(s.id)}
                    className={cn(
                      "flex flex-col items-center group relative z-10 transition-all focus:outline-none",
                      canJump ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100 scale-110"
                        : isPassed
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                          : "border-slate-200 bg-white text-slate-400"
                    )}>
                      {isPassed ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={cn(
                        "text-xs font-bold transition-colors",
                        isActive ? "text-emerald-800" : isPassed ? "text-slate-700 group-hover:text-emerald-700" : "text-slate-400"
                      )}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-400">{s.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Button Back */}
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackStep}
            className="text-slate-600 hover:text-slate-900 hover:bg-white/80"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {step === 1 ? 'Ke Beranda' : 'Kembali ke Langkah Sebelumnya'}
          </Button>

          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Semua isian bertanda <span className="text-rose-500 font-bold">*</span> wajib diisi
          </span>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: PILIH JALUR                                                      */}
        {/* ========================================================================= */}
        {step === 1 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <BookOpen className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Pilih Jalur Pendaftaran
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto">
                Tentukan jalur pendaftaran yang sesuai dengan kompetensi dan persyaratan calon santri.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 md:px-10 pb-8">
              {noActiveWave && (
                <Alert type="warning" title="Pendaftaran Sedang Ditutup">
                  Saat ini tidak ada gelombang pendaftaran yang aktif. Silakan hubungi panitia atau cek jadwal pembukaan gelombang berikutnya.
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    value: 'reguler',
                    icon: BookOpen,
                    title: 'Reguler',
                    subtitle: 'Seleksi Skolastik & Akademik',
                    desc: 'Jalur tes kemampuan akademik dan tes skolastik online untuk seluruh calon santri baru.',
                    accent: 'from-emerald-500 to-emerald-700',
                  },
                  {
                    value: 'prestasi',
                    icon: Trophy,
                    title: 'Prestasi',
                    subtitle: 'Jalur Bakat & Sertifikat',
                    desc: 'Jalur seleksi khusus bagi calon siswa dengan portofolio kejuaraan, olimpiade, sains, atau olahraga.',
                    accent: 'from-blue-500 to-indigo-600',
                  },
                  {
                    value: 'tahfidz',
                    icon: Award,
                    title: 'Tahfidz',
                    subtitle: 'Program Hafalan Al-Qur\'an',
                    desc: 'Program khusus bagi calon santri dengan hafalan Al-Qur\'an melalui uji komprehensif tartil dan tajwid.',
                    accent: 'from-teal-500 to-emerald-700',
                  },
                  {
                    value: 'rapot',
                    icon: GraduationCap,
                    title: 'Rapor',
                    subtitle: 'Penelusuran Nilai Rapor',
                    desc: 'Jalur seleksi berbasis rekam jejak nilai rapor sekolah jenjang sebelumnya.',
                    accent: 'from-amber-500 to-orange-600',
                  },
                ].map((opt) => {
                  const open = isPathOpen(opt.value)
                  const isSelected = formData.registration_path === opt.value

                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        if (!open) return
                        setFormData(prev => ({ ...prev, registration_path: opt.value }))
                      }}
                      className={cn(
                        "group relative p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                        open
                          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"
                          : "opacity-50 cursor-not-allowed bg-slate-50",
                        isSelected && open
                          ? "border-emerald-600 bg-emerald-50/50 ring-4 ring-emerald-600/10 shadow-md"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-200 group-hover:scale-105",
                          opt.accent
                        )}>
                          <opt.icon className="h-6 w-6" />
                        </div>

                        <div className="pr-6">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-slate-900">{opt.title}</h3>
                            {!open && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 border border-rose-200 bg-rose-50 rounded-full px-2 py-0.5">
                                Ditutup
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-emerald-700 mt-0.5">{opt.subtitle}</p>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{opt.desc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!formData.registration_path}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Identitas Calon Murid <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: IDENTITAS CALON MURID                                            */}
        {/* ========================================================================= */}
        {step === 2 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <User className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Identitas Calon Peserta Didik
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto">
                Isi data pribadi calon siswa sesuai Kartu Keluarga (KK), Akta Kelahiran, dan dokumen resmi.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 md:px-10 pb-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nama Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="full_name" className="text-sm font-bold text-slate-800">
                    Nama Lengkap Calon Siswa <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    required
                    maxLength={100}
                    placeholder="Nama lengkap sesuai Ijazah / Akta Kelahiran"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400">Gunakan huruf kapital sesuai yang tertera pada ijazah atau akta.</p>
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-800">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    {[
                      { val: 'L', label: 'Laki-laki' },
                      { val: 'P', label: 'Perempuan' },
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, gender: g.val }))}
                        className={cn(
                          "flex items-center justify-center py-2.5 px-4 rounded-xl border text-sm font-medium transition-all",
                          formData.gender === g.val
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-600/20"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asal Sekolah */}
                <div className="space-y-1.5">
                  <Label htmlFor="previous_school" className="text-sm font-bold text-slate-800">
                    Asal Sekolah Sebelumnya <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="previous_school"
                    required
                    maxLength={150}
                    placeholder="Contoh: SDIT Al-Ihsan / SMP Negeri 1..."
                    value={formData.previous_school}
                    onChange={(e) => setFormData(prev => ({ ...prev, previous_school: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400">Nama sekolah asal jenjang sebelumnya.</p>
                </div>

                {/* NISN */}
                <div className="space-y-1.5">
                  <Label htmlFor="nisn" className="text-sm font-bold text-slate-800">
                    NISN (Nomor Induk Siswa Nasional) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nisn"
                    required
                    inputMode="numeric"
                    minLength={10}
                    maxLength={10}
                    placeholder="10 digit angka NISN"
                    value={formData.nisn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value.replace(/\D/g, '') }))}
                  />
                  <p className="text-[11px] text-slate-400">Tepat 10 digit angka yang terdaftar di Kemendikbud.</p>
                </div>

                {/* NIK */}
                <div className="space-y-1.5">
                  <Label htmlFor="nik" className="text-sm font-bold text-slate-800">
                    NIK (Nomor Induk Kependudukan) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nik"
                    required
                    inputMode="numeric"
                    minLength={16}
                    maxLength={16}
                    placeholder="16 digit angka NIK"
                    value={formData.nik}
                    onChange={(e) => setFormData(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
                  />
                  <p className="text-[11px] text-slate-400">Tepat 16 digit angka sesuai Kartu Keluarga (KK).</p>
                </div>

                {/* Tempat Lahir */}
                <div className="space-y-1.5">
                  <Label htmlFor="birth_place" className="text-sm font-bold text-slate-800">
                    Tempat Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="birth_place"
                    required
                    maxLength={100}
                    placeholder="Contoh: Jakarta / Bogor / Surabaya"
                    value={formData.birth_place}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_place: e.target.value }))}
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="text-sm font-bold text-slate-800">
                    Tanggal Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    required
                    max={todayStr}
                    value={formData.birth_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Data Orang Tua/Wali <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: DATA ORANG TUA / WALI                                            */}
        {/* ========================================================================= */}
        {step === 3 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Users className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Data Orang Tua / Wali
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto">
                Data orang tua kandung atau wali calon santri untuk kebutuhan arsip dan administrasi sekolah.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 md:px-10 pb-8 space-y-6">
              {/* Card Ayah */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800">Data Ayah Kandung</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="father_name" className="text-sm font-semibold text-slate-700">
                      Nama Lengkap Ayah <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="father_name"
                      maxLength={150}
                      placeholder="Nama lengkap ayah kandung"
                      value={formData.father_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, father_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="father_job" className="text-sm font-semibold text-slate-700">
                      Pekerjaan Ayah
                    </Label>
                    <Select
                      value={formData.father_job}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, father_job: v }))}
                    >
                      <SelectTrigger id="father_job">
                        <SelectValue placeholder="Pilih pekerjaan ayah..." />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_OPTIONS.map((job) => (
                          <SelectItem key={job} value={job}>{job}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Card Ibu */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800">Data Ibu Kandung</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mother_name" className="text-sm font-semibold text-slate-700">
                      Nama Lengkap Ibu <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="mother_name"
                      maxLength={150}
                      placeholder="Nama lengkap ibu kandung"
                      value={formData.mother_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, mother_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mother_job" className="text-sm font-semibold text-slate-700">
                      Pekerjaan Ibu
                    </Label>
                    <Select
                      value={formData.mother_job}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, mother_job: v }))}
                    >
                      <SelectTrigger id="mother_job">
                        <SelectValue placeholder="Pilih pekerjaan ibu..." />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_OPTIONS.map((job) => (
                          <SelectItem key={job} value={job}>{job}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Card Wali (Opsional) */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    <h4 className="font-bold text-sm text-slate-800">Data Wali Calon Siswa (Opsional)</h4>
                  </div>
                  <span className="text-[11px] text-slate-400">Isi hanya jika diasuh wali</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="guardian_name" className="text-sm font-semibold text-slate-700">
                      Nama Lengkap Wali
                    </Label>
                    <Input
                      id="guardian_name"
                      maxLength={150}
                      placeholder="Kosongkan jika tidak tinggal bersama wali"
                      value={formData.guardian_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, guardian_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guardian_job" className="text-sm font-semibold text-slate-700">
                      Pekerjaan Wali
                    </Label>
                    <Select
                      value={formData.guardian_job}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, guardian_job: v }))}
                    >
                      <SelectTrigger id="guardian_job">
                        <SelectValue placeholder="Pilih pekerjaan wali..." />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_OPTIONS.map((job) => (
                          <SelectItem key={job} value={job}>{job}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Penghasilan Orang Tua */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 space-y-2">
                <Label htmlFor="parent_income" className="text-sm font-bold text-slate-800">
                  Penghasilan Gabungan Orang Tua / Wali per Bulan <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.parent_income}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, parent_income: v }))}
                >
                  <SelectTrigger id="parent_income" className="bg-white">
                    <SelectValue placeholder="Pilih rentang penghasilan bulanan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_OPTIONS.map((inc) => (
                      <SelectItem key={inc} value={inc}>{inc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">Data digunakan untuk pemetaan administrasi dan beasiswa institusi.</p>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Informasi Kontak <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: KONTAK                                                           */}
        {/* ========================================================================= */}
        {step === 4 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Mail className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Informasi Kontak Akun
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto">
                Email dan nomor WhatsApp ini digunakan untuk mengirimkan kredensial login (username & password) serta seluruh notifikasi PPDB.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 md:px-10 pb-8 space-y-6">
              {/* Alert Warning Pengiriman Kredensial */}
              <Alert type="warning" title="Periksa Email & No. WhatsApp Anda" className="border-amber-200 bg-amber-50/80">
                <span className="text-amber-900 text-xs sm:text-sm">
                  Pastikan email dan nomor WhatsApp yang Anda isi aktif dan benar, karena sistem akan otomatis mengirim kredensial login akun (username & password) ke alamat tersebut.
                </span>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kontak Calon Siswa */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-slate-800">Kontak Calon Siswa</h4>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                      Email Aktif Calon Siswa <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      maxLength={100}
                      placeholder="contoh: calon.santri@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.trim() }))}
                    />
                    <p className="text-[11px] text-slate-400">Kredensial login akun utama akan dikirimkan ke email ini.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                      Nomor WhatsApp Calon Siswa <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      minLength={9}
                      maxLength={16}
                      placeholder="08xxxxxxxxxx (9–16 digit)"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    />
                    <p className="text-[11px] text-slate-400">Diawali angka 08 (9–16 digit angka).</p>
                  </div>
                </div>

                {/* Kontak Orang Tua */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-slate-800">Kontak Orang Tua / Wali</h4>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="parent_phone" className="text-sm font-semibold text-slate-700">
                      Nomor WhatsApp Orang Tua / Wali <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="parent_phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      minLength={9}
                      maxLength={16}
                      placeholder="08xxxxxxxxxx (9–16 digit)"
                      value={formData.parent_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value.replace(/\D/g, '') }))}
                    />
                    <p className="text-[11px] text-slate-400">Digunakan untuk informasi tagihan formulir dan pengumuman sekolah.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="parent_email" className="text-sm font-semibold text-slate-700">
                      Email Orang Tua / Wali (Opsional)
                    </Label>
                    <Input
                      id="parent_email"
                      type="email"
                      maxLength={100}
                      placeholder="contoh: orangtua@gmail.com"
                      value={formData.parent_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_email: e.target.value.trim() }))}
                    />
                    <p className="text-[11px] text-slate-400">Opsional jika orang tua memiliki alamat email terpisah.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Data Domisili <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: DOMISILI                                                         */}
        {/* ========================================================================= */}
        {step === 5 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <MapPin className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Data Domisili & Tempat Tinggal
              </CardTitle>
              <CardDescription className="text-sm max-w-md mx-auto">
                Alamat domisili lengkap calon peserta didik saat ini.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 md:px-10 pb-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Provinsi */}
                <div className="space-y-1.5">
                  <Label htmlFor="province" className="text-sm font-bold text-slate-800">
                    Provinsi <span className="text-rose-500">*</span>
                  </Label>
                  <Select required value={selectedProvinceId} onValueChange={handleProvinceChange}>
                    <SelectTrigger id="province">
                      <SelectValue placeholder="Pilih Provinsi..." />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kota / Kabupaten */}
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-bold text-slate-800">
                    Kota / Kabupaten <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    required
                    disabled={!selectedProvinceId}
                    value={selectedCityId}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Pilih Kota/Kabupaten..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kecamatan */}
                <div className="space-y-1.5">
                  <Label htmlFor="district" className="text-sm font-bold text-slate-800">
                    Kecamatan <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    required
                    disabled={!selectedCityId}
                    value={selectedDistrictId}
                    onValueChange={handleDistrictChange}
                  >
                    <SelectTrigger id="district">
                      <SelectValue placeholder="Pilih Kecamatan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kelurahan / Desa */}
                <div className="space-y-1.5">
                  <Label htmlFor="village" className="text-sm font-bold text-slate-800">
                    Kelurahan / Desa <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    required
                    disabled={!selectedDistrictId}
                    value={villages.find(v => v.name === formData.village)?.id || ''}
                    onValueChange={handleVillageChange}
                  >
                    <SelectTrigger id="village">
                      <SelectValue placeholder="Pilih Kelurahan/Desa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {villages.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kode Pos */}
                <div className="space-y-1.5">
                  <Label htmlFor="postal_code" className="text-sm font-bold text-slate-800">
                    Kode Pos (Opsional)
                  </Label>
                  <Input
                    id="postal_code"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="5 digit angka"
                    value={formData.postal_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>

                {/* Alamat Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-bold text-slate-800">
                    Alamat Lengkap (Jalan, RT/RW, No. Rumah) <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    required
                    maxLength={500}
                    rows={3}
                    placeholder="Contoh: Jl. Sukamaju No. 15 RT 02/RW 05, Kelurahan ABC..."
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400">Minimal 5 karakter.</p>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Identifikasi Kesehatan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: IDENTIFIKASI KESEHATAN                                           */}
        {/* ========================================================================= */}
        {step === 6 && (
          <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
            <CardHeader className="text-center pt-8 pb-4">
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <HeartPulse className="h-5 w-5" />
              </span>
              <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                Formulir Identifikasi Kesehatan
              </CardTitle>
              <CardDescription className="text-sm max-w-xl mx-auto">
                Diisi secara mandiri oleh pendaftar. Mohon berikan informasi yang akurat demi kenyamanan dan keselamatan calon santri selama masa pendidikan di pesantren.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 md:px-10 pb-8 space-y-5">
              {/* 1. Riwayat Penyakit Kronis */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    1. Apakah calon santri memiliki riwayat penyakit kronis? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, chronic_disease: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.chronic_disease
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, chronic_disease: false, chronic_disease_description: '' }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.chronic_disease
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.chronic_disease && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="chronic_desc" className="text-xs font-semibold text-slate-700">
                      Jika Ya, jelaskan nama penyakit kronis: <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="chronic_desc"
                      required
                      rows={2}
                      placeholder="Sebutkan riwayat penyakit kronis yang diderita..."
                      value={healthForm.chronic_disease_description}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, chronic_disease_description: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 2. Kondisi yang Pernah Didiagnosis */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div>
                  <Label className="text-sm font-bold text-slate-800">
                    2. Apakah calon santri pernah didiagnosis memiliki salah satu kondisi berikut?
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">Centang yang sesuai (kosongkan jika tidak ada).</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                  {DIAGNOSED_CONDITIONS_OPTIONS.map((cond) => {
                    const checked = healthForm.diagnosed_conditions.includes(cond)
                    return (
                      <label
                        key={cond}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors",
                          checked
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-600/20"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
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
                      Sebutkan kondisi diagnosis lainnya: <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="diagnosed_other"
                      required
                      placeholder="Tuliskan nama kondisi..."
                      value={healthForm.diagnosed_conditions_other}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, diagnosed_conditions_other: e.target.value }))}
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <Label htmlFor="diagnosed_notes" className="text-xs font-semibold text-slate-700">
                    Keterangan tambahan diagnosis (opsional):
                  </Label>
                  <Textarea
                    id="diagnosed_notes"
                    rows={2}
                    placeholder="Penjelasan singkat mengenai diagnosis yang dipilih..."
                    value={healthForm.diagnosed_conditions_description}
                    onChange={(e) => setHealthForm(prev => ({ ...prev, diagnosed_conditions_description: e.target.value }))}
                  />
                </div>
              </div>

              {/* 3. Alergi */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    3. Apakah calon santri memiliki alergi? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, allergies: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.allergies
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({
                        ...prev,
                        allergies: false,
                        allergy_types: [],
                        allergy_other: '',
                        allergy_description: ''
                      }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.allergies
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.allergies && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                    <Label className="text-xs font-semibold text-slate-700">Pilih jenis alergi:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {ALLERGY_OPTIONS.map((al) => {
                        const checked = healthForm.allergy_types.includes(al)
                        return (
                          <label
                            key={al}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors",
                              checked
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-600/20"
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
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
                          Sebutkan alergi lainnya: <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="allergy_other"
                          required
                          placeholder="Tuliskan jenis alergi..."
                          value={healthForm.allergy_other}
                          onChange={(e) => setHealthForm(prev => ({ ...prev, allergy_other: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="allergy_desc" className="text-xs font-semibold text-slate-700">
                        Keterangan gejala dan penanganan:
                      </Label>
                      <Textarea
                        id="allergy_desc"
                        rows={2}
                        placeholder="Contoh: Gejala gatal/sesak jika terkena udang, obat penanganan..."
                        value={healthForm.allergy_description}
                        onChange={(e) => setHealthForm(prev => ({ ...prev, allergy_description: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Pengobatan Rutin */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    4. Apakah calon santri sedang menjalani pengobatan rutin atau mengonsumsi obat berkala? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, regular_medication: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.regular_medication
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, regular_medication: false, regular_medication_description: '' }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.regular_medication
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.regular_medication && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="regular_med_desc" className="text-xs font-semibold text-slate-700">
                      Jika Ya, sebutkan nama obat, dosis, atau jadwal konsumsi: <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="regular_med_desc"
                      required
                      rows={2}
                      placeholder="Nama obat, dosis, dan instruksi konsumsi..."
                      value={healthForm.regular_medication_description}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, regular_medication_description: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 5. Keterbatasan Fisik */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    5. Apakah calon santri memiliki kondisi kesehatan atau keterbatasan fisik khusus? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, physical_limitation: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.physical_limitation
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, physical_limitation: false, physical_limitation_description: '' }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.physical_limitation
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.physical_limitation && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="physical_lim_desc" className="text-xs font-semibold text-slate-700">
                      Jika Ya, jelaskan kondisi fisik yang perlu diketahui pihak sekolah: <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="physical_lim_desc"
                      required
                      rows={2}
                      placeholder="Jelaskan kondisi atau penyesuaian yang dibutuhkan..."
                      value={healthForm.physical_limitation_description}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, physical_limitation_description: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 6. Riwayat Rawat Inap / Operasi */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    6. Apakah calon santri pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, hospitalization_history: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.hospitalization_history
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, hospitalization_history: false, hospitalization_history_description: '' }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.hospitalization_history
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.hospitalization_history && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="hosp_desc" className="text-xs font-semibold text-slate-700">
                      Jika Ya, jelaskan diagnosa dan riwayat tindakan medis: <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="hosp_desc"
                      required
                      rows={2}
                      placeholder="Jelaskan alasan rawat inap/operasi..."
                      value={healthForm.hospitalization_history_description}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, hospitalization_history_description: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 7. Kebutuhan Khusus Saat Belajar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-800 leading-snug">
                    7. Apakah calon santri memiliki kebutuhan khusus terkait kesehatan saat kegiatan belajar? <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, special_needs: true }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        healthForm.special_needs
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, special_needs: false, special_needs_description: '' }))}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                        !healthForm.special_needs
                          ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Tidak
                    </button>
                  </div>
                </div>

                {healthForm.special_needs && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="special_needs_desc" className="text-xs font-semibold text-slate-700">
                      Jika Ya, jelaskan kebutuhan khusus yang diperlukan: <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="special_needs_desc"
                      required
                      rows={2}
                      placeholder="Jelaskan kebutuhan khusus saat belajar atau asrama..."
                      value={healthForm.special_needs_description}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, special_needs_description: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* 8, 9, 10. Kontak Darurat Medis */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
                  <Phone className="h-4 w-4 text-emerald-700" />
                  <h4 className="font-bold text-sm text-slate-800">Kontak Darurat Terdekat</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="emg_name" className="text-xs font-semibold text-slate-700">
                      8. Nama Kontak Darurat <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="emg_name"
                      required
                      maxLength={150}
                      placeholder="Nama lengkap kontak..."
                      value={healthForm.emergency_contact_name}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emg_rel" className="text-xs font-semibold text-slate-700">
                      9. Hubungan dengan Calon Siswa <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="emg_rel"
                      required
                      maxLength={100}
                      placeholder="Ayah / Ibu / Paman / Wali..."
                      value={healthForm.emergency_contact_relation}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_relation: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emg_phone" className="text-xs font-semibold text-slate-700">
                      10. Nomor Telepon Darurat <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="emg_phone"
                      required
                      inputMode="numeric"
                      minLength={9}
                      maxLength={16}
                      placeholder="08xxxxxxxxxx (9–16 digit)"
                      value={healthForm.emergency_contact_phone}
                      onChange={(e) => setHealthForm(prev => ({ ...prev, emergency_contact_phone: e.target.value.replace(/\D/g, '') }))}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Pernyataan Kesehatan Standar Industri */}
              <div className={cn(
                "rounded-2xl border p-5 transition-all",
                healthForm.health_declaration_confirmed
                  ? "border-emerald-600 bg-emerald-50/60 shadow-sm"
                  : "border-slate-300 bg-slate-50"
              )}>
                <label className="flex items-start gap-3.5 cursor-pointer select-none">
                  <Checkbox
                    id="health_declaration"
                    checked={healthForm.health_declaration_confirmed}
                    onCheckedChange={(c) => setHealthForm(prev => ({ ...prev, health_declaration_confirmed: !!c }))}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                      Pernyataan Integritas Kesehatan Calon Santri <span className="text-rose-500">*</span>
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      "Saya menyatakan bahwa informasi riwayat kesehatan yang saya berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat perubahan kondisi kesehatan di kemudian hari, saya bersedia memberitahukan kepada pihak sekolah."
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 h-11 text-sm font-bold shadow-md shadow-emerald-600/20"
                >
                  Lanjut ke Review & Persetujuan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: PERNYATAAN & PERSETUJUAN (REVIEW SEBELUM SUBMIT)                 */}
        {/* ========================================================================= */}
        {step === 7 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
              <CardHeader className="text-center pt-8 pb-4">
                <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <CardTitle className="text-2xl font-bold font-heading text-slate-900">
                  Review & Persetujuan Pendaftaran
                </CardTitle>
                <CardDescription className="text-sm max-w-md mx-auto">
                  Periksa kembali ringkasan data pendaftaran Anda sebelum menandatangani lembar persetujuan akhir.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 md:px-10 pb-8 space-y-6">
                {/* Review Ringkasan Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Ringkasan Data Formulir
                    </h3>
                    <span className="text-xs text-slate-400">Klik "Ubah" jika ada data yang ingin dikoreksi</span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Ringkasan Jalur & Calon Siswa */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-emerald-600" /> Calon Siswa & Jalur
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="h-3 w-3" /> Ubah
                        </button>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Jalur Pendaftaran:</span>
                          <span className="font-bold text-slate-800 capitalize">{formData.registration_path}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nama Lengkap:</span>
                          <span className="font-bold text-slate-800">{formData.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">NISN / NIK:</span>
                          <span className="font-mono text-slate-700">{formData.nisn} / {formData.nik}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Jenis Kelamin:</span>
                          <span>{formData.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tempat, Tgl Lahir:</span>
                          <span>{formData.birth_place}, {formData.birth_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Asal Sekolah:</span>
                          <span className="font-medium text-slate-800">{formData.previous_school}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Orang Tua */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <Users className="h-3.5 w-3.5 text-emerald-600" /> Orang Tua / Wali
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="h-3 w-3" /> Ubah
                        </button>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ayah Kandung:</span>
                          <span className="font-medium text-slate-800">{formData.father_name || '-'} ({formData.father_job || '-'})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ibu Kandung:</span>
                          <span className="font-medium text-slate-800">{formData.mother_name || '-'} ({formData.mother_job || '-'})</span>
                        </div>
                        {formData.guardian_name && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Wali:</span>
                            <span>{formData.guardian_name} ({formData.guardian_job || '-'})</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Penghasilan:</span>
                          <span className="font-semibold text-slate-700">{formData.parent_income}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Kontak */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <Mail className="h-3.5 w-3.5 text-emerald-600" /> Kontak Terdaftar
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="h-3 w-3" /> Ubah
                        </button>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email Siswa:</span>
                          <span className="font-medium text-slate-800">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">WhatsApp Siswa:</span>
                          <span className="font-medium text-slate-800">{formData.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">WhatsApp Ortu:</span>
                          <span className="font-medium text-slate-800">{formData.parent_phone}</span>
                        </div>
                        {formData.parent_email && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Email Ortu:</span>
                            <span>{formData.parent_email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Domisili */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Alamat Domisili
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(5)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="h-3 w-3" /> Ubah
                        </button>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Alamat Lengkap:</span>
                          <span className="font-medium text-slate-800">{formData.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Wilayah:</span>
                          <span>{formData.village}, {formData.district}, {formData.city}, {formData.province}</span>
                        </div>
                        {formData.postal_code && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Kode Pos:</span>
                            <span>{formData.postal_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lembar Checklist Pernyataan & Persetujuan Wajib */}
                <div className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/40 p-5 sm:p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-emerald-200/70 pb-3">
                    <ShieldAlert className="h-5 w-5 text-emerald-700" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Lembar Pernyataan & Persetujuan Akhir
                      </h4>
                      <p className="text-xs text-slate-500">
                        Centang seluruh pernyataan di bawah ini untuk mengaktifkan tombol pendaftaran:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Checkbox 1 */}
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all",
                      agreements.accurate_data
                        ? "border-emerald-600 bg-white shadow-sm text-slate-900 font-medium"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-700"
                    )}>
                      <Checkbox
                        checked={agreements.accurate_data}
                        onCheckedChange={(c) => setAgreements(prev => ({ ...prev, accurate_data: !!c }))}
                        className="mt-0.5"
                      />
                      <span>Saya menyatakan seluruh data yang diisi adalah benar dan dapat dipertanggungjawabkan.</span>
                    </label>

                    {/* Checkbox 2 */}
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all",
                      agreements.false_data_cancel
                        ? "border-emerald-600 bg-white shadow-sm text-slate-900 font-medium"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-700"
                    )}>
                      <Checkbox
                        checked={agreements.false_data_cancel}
                        onCheckedChange={(c) => setAgreements(prev => ({ ...prev, false_data_cancel: !!c }))}
                        className="mt-0.5"
                      />
                      <span>Saya memahami bahwa kesalahan atau pemalsuan data dapat mengakibatkan pembatalan proses penerimaan.</span>
                    </label>

                    {/* Checkbox 3 */}
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all",
                      agreements.privacy_policy
                        ? "border-emerald-600 bg-white shadow-sm text-slate-900 font-medium"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-700"
                    )}>
                      <Checkbox
                        checked={agreements.privacy_policy}
                        onCheckedChange={(c) => setAgreements(prev => ({ ...prev, privacy_policy: !!c }))}
                        className="mt-0.5"
                      />
                      <span>Saya menyetujui penggunaan data pribadi untuk keperluan proses PPDB sesuai kebijakan sekolah.</span>
                    </label>

                    {/* Checkbox 4 */}
                    <label className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all",
                      agreements.contact_verified
                        ? "border-emerald-600 bg-white shadow-sm text-slate-900 font-medium"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-700"
                    )}>
                      <Checkbox
                        checked={agreements.contact_verified}
                        onCheckedChange={(c) => setAgreements(prev => ({ ...prev, contact_verified: !!c }))}
                        className="mt-0.5"
                      />
                      <span>Saya telah memeriksa kembali email dan nomor WhatsApp yang saya masukkan.</span>
                    </label>
                  </div>

                  {/* Quick Select All */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const allTrue = isAllAgreementsChecked
                        setAgreements({
                          accurate_data: !allTrue,
                          false_data_cancel: !allTrue,
                          privacy_policy: !allTrue,
                          contact_verified: !allTrue,
                        })
                      }}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
                    >
                      {isAllAgreementsChecked ? 'Hapus Semua Centang' : 'Centang Semua Pernyataan'}
                    </button>
                  </div>
                </div>

                {/* Error Banner jika submit gagal */}
                {submitError && (
                  <Alert type="error" title="Gagal Menyelesaikan Pendaftaran" className="mt-2">
                    {submitError}
                  </Alert>
                )}

                {/* Tombol Submit Final */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {!isAllAgreementsChecked ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Tombol "Daftar Sekarang" akan aktif setelah Anda mencentang seluruh 4 checklist di atas.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Seluruh persyaratan persetujuan telah lengkap. Silakan kirimkan formulir.
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!isAllAgreementsChecked || loading}
                    className={cn(
                      "w-full sm:w-auto rounded-full px-10 h-12 text-sm font-bold transition-all",
                      isAllAgreementsChecked
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 ring-2 ring-emerald-600/20 scale-100"
                        : "opacity-50 cursor-not-allowed bg-slate-300 text-slate-600 shadow-none"
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        Memproses Pendaftaran...
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Daftar Sekarang <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* ========================================================================= */}
        {/* INTERSTITIAL CONFIRMATION MODAL: VALIDASI KONTAK (Step 4 -> Step 5)       */}
        {/* ========================================================================= */}
        <Dialog open={contactConfirmModalOpen} onOpenChange={setContactConfirmModalOpen}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-2xl border-slate-100">
            <DialogHeader className="text-left space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold font-heading text-slate-900">
                Periksa Email & No. WhatsApp Anda
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pastikan email dan nomor WhatsApp yang Anda isi sudah benar, karena sistem akan mengirim kredensial login (username & password) ke alamat email dan nomor WhatsApp tersebut.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2.5 my-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-amber-200/50">
                <span className="text-slate-500 font-medium">Email Calon Siswa:</span>
                <span className="font-bold text-slate-900 font-mono">{formData.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-amber-200/50">
                <span className="text-slate-500 font-medium">WhatsApp Calon Siswa:</span>
                <span className="font-bold text-slate-900 font-mono">{formData.phone}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">WhatsApp Orang Tua/Wali:</span>
                <span className="font-bold text-slate-900 font-mono">{formData.parent_phone}</span>
              </div>
              {formData.parent_email && (
                <div className="flex justify-between items-center py-1 border-t border-amber-200/50">
                  <span className="text-slate-500 font-medium">Email Orang Tua:</span>
                  <span className="font-bold text-slate-900 font-mono">{formData.parent_email}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactConfirmModalOpen(false)}
                className="w-full sm:w-auto rounded-full text-xs font-semibold"
              >
                Cek Kembali
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setContactConfirmModalOpen(false)
                  setStep(5)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="w-full sm:w-auto rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Sudah Benar, Lanjutkan <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
