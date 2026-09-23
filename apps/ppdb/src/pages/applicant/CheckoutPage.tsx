import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui"
import { Button } from "@/components/ui"
import { Alert } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { apiFetch } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Building } from 'lucide-react'

const FORMATTER = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function CheckoutPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const amount = transactionQuery.data?.transaction?.amount || 0
  const WA_NUMBER = "6281234567890" // Dummy WA

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

            {amount > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 text-center space-y-2">
                <p className="text-emerald-800 font-medium">Total Tagihan Pendaftaran</p>
                <div className="text-4xl font-bold text-emerald-600 font-heading">
                  {FORMATTER.format(amount)}
                </div>
              </div>
            )}

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

            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900">Instruksi Pembayaran Manual</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Silakan transfer tagihan sebesar <strong>{FORMATTER.format(amount)}</strong> ke rekening berikut:
                  </p>
                  <div className="mt-3 bg-white border border-blue-100 rounded-md p-3 font-mono text-sm text-blue-900 shadow-sm">
                    <div className="flex justify-between items-center border-b border-blue-50 pb-2 mb-2">
                      <span className="text-muted-foreground font-sans">Bank</span>
                      <span className="font-semibold">BSI (Bank Syariah Indonesia)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-blue-50 pb-2 mb-2">
                      <span className="text-muted-foreground font-sans">Nomor Rekening</span>
                      <span className="font-semibold text-base">712 345 6789</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-sans">Atas Nama</span>
                      <span className="font-semibold">PPDB PTDARRAHMAN</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100/50 flex flex-col sm:flex-row gap-3 items-center">
                <Button
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-md shadow-emerald-200"
                  onClick={() => window.open(`https://wa.me/${WA_NUMBER}?text=Halo%20Panitia%20PPDB%2C%20saya%20telah%20melakukan%20pembayaran%20atas%20nama%20${user?.full_name}%20dengan%20tagihan%20${FORMATTER.format(amount)}`, '_blank')}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Konfirmasi via WhatsApp
                </Button>
              </div>
              <p className="text-xs text-blue-700 mt-2 italic text-center sm:text-left">
                * Jika Anda sudah membayar manual, mohon simpan bukti transfer dan hubungi panitia via WhatsApp jika belum dikonfirmasi dalam 1x24 jam.
              </p>
            </div>

          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t bg-muted/20">
            <Button variant="outline" className="w-full" size="lg" onClick={handleRefresh} disabled={loading || transactionQuery.isLoading}>
              {(loading || transactionQuery.isLoading) ? 'Memeriksa Status...' : 'Cek Status Pembayaran (Refresh)'}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => logout().then(() => navigate('/auth/login'))}>
            Keluar (Logout)
          </Button>
        </div>

      </div>
    </div>
  )
}
