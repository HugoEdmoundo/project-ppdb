import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ArrowRight, LogIn, CheckCircle2 } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              ار
            </div>
            <span className="font-bold text-lg tracking-tight text-primary">Ar-Rahman</span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/auth/login')} className="gap-2 font-medium">
            <LogIn className="h-4 w-4" /> Masuk
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="container relative mx-auto px-4 text-center max-w-4xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Pendaftaran Gelombang Baru Telah Dibuka
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Penerimaan Peserta Didik Baru <br className="hidden md:block"/>
              <span className="text-primary">Pesantren Ar-Rahman</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Membangun generasi Qur'ani yang berakhlak mulia, unggul dalam ilmu pengetahuan, dan kompetitif di era digital.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/register')}>
                Daftar Sekarang <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-white" onClick={() => navigate('/auth/login')}>
                Sudah Punya Akun?
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Sistem Terintegrasi', desc: 'Pendaftaran, seleksi, hingga pengumuman dapat dipantau dari satu dashboard.' },
                { title: 'Transparan & Cepat', desc: 'Proses seleksi dan informasi kelulusan dilakukan secara transparan dan seketika.' },
                { title: 'Dukungan Panitia', desc: 'Tim panitia siap sedia mendampingi proses pendaftaran Anda jika mengalami kendala.' }
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. All rights reserved.</p>
      </footer>
    </div>
  )
}
