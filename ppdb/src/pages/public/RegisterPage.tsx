import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ppdbService } from '@/services'
import { useToast } from '@/components/Toast'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { ArrowLeft, CheckCircle2, Copy } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    registration_path: '',
    registration_level: ''
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
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        
        <Card className="glass-card shadow-xl border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold font-heading text-center">Formulir Pendaftaran</CardTitle>
            <CardDescription className="text-center">
              Lengkapi data diri Anda untuk mendaftar PPDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input 
                  id="full_name" 
                  required 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Sesuai ijazah / akte kelahiran"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">No. WhatsApp *</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  required 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="081234567890"
                />
              </div>

              <div className="space-y-2">
                <Label>Jalur Pendaftaran *</Label>
                <Select 
                  required 
                  value={formData.registration_path} 
                  onValueChange={(v: string) => setFormData({...formData, registration_path: v, registration_level: ''})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jalur..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reguler">Reguler</SelectItem>
                    <SelectItem value="pindahan">Pindahan (Mutasi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jenjang Tujuan *</Label>
                <Select 
                  required 
                  disabled={!formData.registration_path}
                  value={formData.registration_level} 
                  onValueChange={(v: string) => setFormData({...formData, registration_level: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenjang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map(lvl => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? 'Memproses...' : 'Daftar Sekarang'}
              </Button>
            </form>
          </CardContent>
        </Card>
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
