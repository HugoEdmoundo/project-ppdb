import { useState, useRef, useEffect } from 'react'
import { Phone, MessageCircle, Mail, X } from 'lucide-react'

export default function SupportFab({ phone, whatsapp, email }: { phone?: string; whatsapp?: string; email?: string }) {
  const [fabOpen, setFabOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFabOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [fabOpen])

  useEffect(() => {
    if (!fabOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFabOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fabOpen])

  const telHref = `tel:${(phone || '').replace(/[^0-9+]/g, '')}`
  const waHref = `https://wa.me/${(whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Assalamualaikum! Saya ingin bertanya tentang PPDB Pesantren Ar-Rahman.')}`
  const mailHref = `mailto:${email || ''}`

  const options = [
    { icon: Phone, title: 'Call Support', subtitle: phone || '-', href: telHref },
    { icon: MessageCircle, title: 'WhatsApp', subtitle: `+${(whatsapp || '').replace(/[^0-9]/g, '')}`, href: waHref, external: true },
    { icon: Mail, title: 'Email Support', subtitle: email || '-', href: mailHref },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div ref={containerRef} className="relative">
        <div
          role="dialog"
          aria-label="Butuh Bantuan?"
          aria-hidden={!fabOpen}
          className={[
            'absolute bottom-full right-0 mb-4 w-[300px] max-w-[calc(100vw-2.5rem)]',
            'origin-bottom-right overflow-hidden rounded-2xl border border-border',
            'bg-card shadow-xl',
            'transition-all duration-300 ease-out',
            fabOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-3 scale-95 pointer-events-none',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Butuh Bantuan?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pilih cara menghubungi kami</p>
            </div>
            <button
              onClick={() => setFabOpen(false)}
              className="p-1.5 -m-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Tutup menu bantuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t py-2">
            {options.map((opt) => (
              <a
                key={opt.title}
                href={opt.href}
                {...(opt.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <opt.icon className="w-5 h-5 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{opt.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{opt.subtitle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <button
          onClick={() => setFabOpen(!fabOpen)}
          aria-label={fabOpen ? 'Tutup menu bantuan' : 'Butuh Bantuan?'}
          aria-expanded={fabOpen}
          aria-haspopup="dialog"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-lg"
        >
          <span
            className="relative flex items-center justify-center"
            style={{
              transform: fabOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <MessageCircle
              className="w-6 h-6"
              aria-hidden="true"
              style={{
                opacity: fabOpen ? 0 : 1,
                transform: fabOpen ? 'scale(0.4) rotate(-90deg)' : 'scale(1)',
                transition: 'opacity 0.15s ease, transform 0.25s ease',
              }}
            />
            <X
              className="absolute w-6 h-6"
              aria-hidden="true"
              style={{
                opacity: fabOpen ? 1 : 0,
                transform: fabOpen ? 'scale(1)' : 'scale(0.4) rotate(90deg)',
                transition: 'opacity 0.15s ease 0.05s, transform 0.25s ease 0.05s',
              }}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
