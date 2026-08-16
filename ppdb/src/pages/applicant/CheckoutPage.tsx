import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/components/Toast'
import * as api from '../../api/client'

export default function CheckoutPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (user?.payment_status === 'paid') {
      navigate('/applicant', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user?.payment_deadline) return

    const deadline = new Date(user.payment_deadline).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const distance = deadline - now

      if (distance < 0) {
        setTimeLeft('Waktu pembayaran telah habis')
        return
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      
      setTimeLeft(`${days} hari ${hours} jam ${minutes} menit`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [user?.payment_deadline])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await refreshUser()
      toast('success', 'Status diperbarui')
    } catch {
      toast('error', 'Gagal memperbarui status')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Selesaikan Pembayaran Anda</h1>
          <p className="text-muted-foreground">
            Selamat datang <strong>{user?.full_name}</strong>! Untuk melanjutkan ke tahap Upload Dokumen & Seleksi, Anda diwajibkan menyelesaikan pembayaran biaya formulir pendaftaran.
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5 rounded-t-lg border-b border-primary/10">
            <CardTitle className="flex justify-between items-center">
              <span>Status Pembayaran</span>
              <span className="text-sm font-normal px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                Menunggu Pembayaran
              </span>
            </CardTitle>
            <CardDescription>
              Segera selesaikan pembayaran sebelum batas waktu berakhir
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            <Alert type="error" title="Batas Waktu Pembayaran">
              <div className="font-semibold text-lg mt-1">
                {timeLeft || 'Menghitung...'}
              </div>
            </Alert>

            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-sm text-muted-foreground mb-4">RINGKASAN ALUR PENDAFTARAN</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-sm">1</div>
                  <div className="font-medium text-primary">Pembayaran (Saat Ini)</div>
                </div>
                <div className="w-0.5 h-4 bg-muted ml-4"></div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">2</div>
                  <div>Upload Dokumen</div>
                </div>
                <div className="w-0.5 h-4 bg-muted ml-4 opacity-50"></div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">3</div>
                  <div>Seleksi Berkas</div>
                </div>
                <div className="w-0.5 h-4 bg-muted ml-4 opacity-50"></div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">4</div>
                  <div>Ujian / Seleksi Akhir</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-blue-800 text-sm">
              <strong>Info:</strong> Saat ini pembayaran hanya dapat dilakukan secara manual (cash atau transfer) ke Panitia PPDB. Hubungi panitia dan mereka akan mengonfirmasi pembayaran Anda pada sistem. Setelah dikonfirmasi, Anda otomatis masuk ke dashboard pendaftar.
            </div>

          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t bg-muted/20">
            <Button variant="outline" className="w-full" size="lg" onClick={handleRefresh} disabled={loading}>
              {loading ? 'Memeriksa Status...' : 'Cek Status Pembayaran (Refresh)'}
            </Button>
          </CardFooter>
        </Card>
        
        <div className="text-center">
          <Button variant="ghost" onClick={() => api.logout().then(() => navigate('/auth/login'))}>
            Keluar (Logout)
          </Button>
        </div>

      </div>
    </div>
  )
}
