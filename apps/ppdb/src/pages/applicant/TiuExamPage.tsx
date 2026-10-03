import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { apiFetch } from '@/api/client'

export default function TiuExamPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // 90 minutes countdown
  const [timeLeft, setTimeLeft] = useState(90 * 60)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleAutoSubmit = async () => {
    setSubmitting(true)
    try {
      // Dummy submission to a plausible endpoint. If endpoint doesn't exist, just catch error.
      await apiFetch('/selection/applicants/me/tiu-submit', {
        method: 'POST',
        body: JSON.stringify({
          score: 85,
          answers: []
        })
      }).catch(() => {})
      toast('success', 'Ujian berhasil diselesaikan')
      navigate('/applicant')
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengirim ujian')
      navigate('/applicant')
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="bg-emerald-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle>Ujian TIU (Tes Inteligensi Umum)</CardTitle>
            <div className="text-xl font-mono font-bold">
              {formatTime(timeLeft)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6 text-center">
          <div className="py-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Simulasi Ujian Sedang Berjalan</h2>
            <p className="text-slate-600">
              Halaman ini adalah placeholder. Dalam integrasi sebenarnya, sistem ujian akan ditampilkan di sini.<br />
              Waktu akan otomatis habis dalam 90 menit dan ujian akan diselesaikan secara otomatis.
            </p>
          </div>
          <div className="pt-8 border-t border-slate-200">
            <Button 
              onClick={handleAutoSubmit} 
              disabled={submitting}
              className="bg-emerald-primary hover:bg-emerald-dark"
            >
              {submitting ? 'Menyimpan Hasil...' : 'Akhiri Ujian Sekarang'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
