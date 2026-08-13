import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui'
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, BookOpen, GraduationCap } from 'lucide-react'

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
    major_choice: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState<{username: string, password: string} | null>(null)

  const levelOptions = useMemo(() => {
    if (formData.registration_path === 'reguler') {
      return ['SMP Kelas 7', 'SMA Kelas 10']
    }
    if (formData.registration_path === 'pindahan') {
      return ['SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9', 'SMA Kelas 10', 'SMA Kelas 11']
    }
    return []
  }, [formData.registration_path])

  const showMajor = useMemo(() => {
    return formData.registration_level.includes('SMA')
  }, [formData.registration_level])

  const handleNext = () => {
    if (step === 1 && !formData.registration_path) {
      toast('error', 'Pilih jalur pendaftaran terlebih dahulu')
      return
    }
    if (step === 2 && !formData.registration_level) {
      toast('error', 'Pilih jenjang tujuan terlebih dahulu')
      return
    }
    setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step === 1) navigate('/')
    else setStep(s => s - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await ppdbService.registerApplicant(formData)
      setSuccessData(res.credentials)
      toast('success', 'Pendaftaran berhasil!')
    } catch (err: any) {
      toast('error', err.message || 'Gagal mendaftar')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast('success', 'Disalin ke clipboard')
  }

  const handleFinish = () => {
    navigate('/auth/login')
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
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${formData.registration_path === 'reguler' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                onClick={() => setFormData({...formData, registration_path: 'reguler', registration_level: ''})}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><BookOpen className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg">Reguler (Peserta Didik Baru)</h3>
                    <p className="text-sm text-muted-foreground mt-1">Pendaftaran untuk lulusan jenjang sebelumnya (SD ke SMP, atau SMP ke SMA) yang ingin masuk pada tahun ajaran baru tingkat awal.</p>
                  </div>
                </div>
              </div>
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${formData.registration_path === 'pindahan' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                onClick={() => setFormData({...formData, registration_path: 'pindahan', registration_level: ''})}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><ArrowRight className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-bold text-lg">Pindahan (Mutasi Masuk)</h3>
                    <p className="text-sm text-muted-foreground mt-1">Pendaftaran untuk siswa yang pindah sekolah di pertengahan tahun ajaran atau naik kelas namun pindah sekolah.</p>
                  </div>
                </div>
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {levelOptions.map(lvl => (
                  <div 
                    key={lvl}
                    className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all hover:border-primary/50 ${formData.registration_level === lvl ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                    onClick={() => setFormData({...formData, registration_level: lvl})}
                  >
                    <GraduationCap className={`h-8 w-8 mx-auto mb-2 ${formData.registration_level === lvl ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-bold text-lg">{lvl}</h3>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>Kembali</Button>
                <Button onClick={handleNext} disabled={!formData.registration_level}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
                      id="full_name" required 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nisn">NISN *</Label>
                    <Input 
                      id="nisn" required 
                      value={formData.nisn}
                      onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nik">NIK *</Label>
                    <Input 
                      id="nik" required 
                      value={formData.nik}
                      onChange={(e) => setFormData({...formData, nik: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_place">Tempat Lahir *</Label>
                    <Input 
                      id="birth_place" required 
                      value={formData.birth_place}
                      onChange={(e) => setFormData({...formData, birth_place: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Tanggal Lahir *</Label>
                    <Input 
                      id="birth_date" type="date" required 
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Aktif *</Label>
                    <Input 
                      id="email" type="email" required 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor HP/WhatsApp *</Label>
                    <Input 
                      id="phone" type="tel" required 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Nama Orang Tua / Wali *</Label>
                    <Input 
                      id="parent_name" required 
                      value={formData.parent_name}
                      onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_school">Asal Sekolah (TK/SD/SMP) *</Label>
                    <Input 
                      id="previous_school" required 
                      value={formData.previous_school}
                      onChange={(e) => setFormData({...formData, previous_school: e.target.value})}
                    />
                  </div>

                  {showMajor && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="major_choice">Pilihan Jurusan/Program *</Label>
                      <Select required value={formData.major_choice} onValueChange={(v: string) => setFormData({...formData, major_choice: v})}>
                        <SelectTrigger><SelectValue placeholder="Pilih jurusan..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MIPA">MIPA (Matematika & Ilmu Pengetahuan Alam)</SelectItem>
                          <SelectItem value="IPS">IPS (Ilmu Pengetahuan Sosial)</SelectItem>
                          <SelectItem value="BAHASA">Bahasa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={handleBack}>Kembali</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Memproses...' : 'Selesaikan Pendaftaran'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!successData} onOpenChange={(open) => !open && handleFinish()}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-xl">Pendaftaran Berhasil!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Akun Anda telah berhasil dibuat. Harap simpan Username dan Password di bawah ini untuk login ke dashboard pendaftar.
            </DialogDescription>
          </DialogHeader>
          
          {successData && (
            <div className="bg-muted p-4 rounded-lg space-y-4 my-4">
              <div className="flex justify-between items-center bg-background border rounded-md p-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Username</p>
                  <p className="font-mono font-bold text-lg">{successData.username}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(successData.username)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex justify-between items-center bg-background border rounded-md p-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Password</p>
                  <p className="font-mono font-bold text-lg tracking-wider">{successData.password}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(successData.password)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-amber-600 font-medium text-center bg-amber-50 p-2 rounded">
                Simpan informasi ini dengan baik. Anda akan membutuhkannya untuk masuk ke sistem.
              </p>
            </div>
          )}
          
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleFinish} className="w-full">
              Lanjut ke Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
