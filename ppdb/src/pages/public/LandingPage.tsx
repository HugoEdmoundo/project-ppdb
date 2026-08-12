import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ArrowRight, GraduationCap } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-bold text-foreground">
            PPDB Online
          </h1>
          <p className="text-muted-foreground text-lg">
            Penerimaan Peserta Didik Baru
          </p>
        </div>

        <div className="pt-8">
          <Button 
            size="lg" 
            className="w-full text-lg h-14 gap-2 shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate('/register')}
          >
            Daftar Sekarang <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
