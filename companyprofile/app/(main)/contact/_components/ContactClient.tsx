'use client'

import { useRef, useState, useEffect } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import { MapPin, Phone, Mail, Clock, Send, ChevronDown, MessageCircle } from 'lucide-react'
import type { ContactInfo, SocialLink } from '@/app/lib/types'

const faqs = [
  {
    question: 'Bagaimana jadwal pendaftaran 2026/2027?',
    answer: 'Pendaftaran awal berlangsung dari 1 September hingga 31 Desember 2026. Ujian masuk 15 Juni, wawancara 20-25 Juni, dan pengumuman 1 Juli. Tahun ajaran dimulai 15 Juli.',
  },
  {
    question: 'Program apa saja yang tersedia?',
    answer: 'Kami menawarkan empat program unggulan: Tahfidz Al-Quran, Teknologi Digital, Program Bilingual, dan Akademi Kepemimpinan, dari tingkat SMP hingga SMA (program terpadu 6 tahun).',
  },
  {
    question: 'Apakah Ar-Rahman menawarkan beasiswa?',
    answer: 'Ya, kami menawarkan beasiswa berdasarkan prestasi dan kebutuhan bagi siswa berprestasi. Hubungi kantor penerimaan kami untuk detail lebih lanjut.',
  },
  {
    question: 'Apa yang membedakan Ar-Rahman dari pesantren lain?',
    answer: 'Kami adalah satu-satunya pesantren yang secara sistematis mengintegrasikan hafalan Al-Quran (Tahfidz) dengan pendidikan teknologi digital termasuk coding, AI, robotik, dan keamanan siber.',
  },
]

export default function ContactClient({ contactInfo, socialLinks = [] }: { contactInfo: ContactInfo | null; socialLinks?: SocialLink[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'Hubungi Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const contactItems = [
    { icon: MapPin, label: 'Alamat', value: contactInfo?.address },
    { icon: Phone, label: 'Telepon', value: contactInfo?.phone_primary },
    { icon: MessageCircle, label: 'WhatsApp', value: contactInfo?.whatsapp },
    { icon: Mail, label: 'Email', value: contactInfo?.email_primary },
    { icon: Clock, label: 'Jam Kantor', value: contactInfo?.office_hours },
  ]

  return (
    <>
      <PageHeader
        title="Hubungi Kami"
        subtitle="Kami senang mendengar dari Anda. Hubungi kami untuk tahu lebih lanjut tentang Ar-Rahman"
        badge="HUBUNGI KAMI"
      />

      <section ref={sectionRef} className="relative py-16 sm:py-20 bg-[var(--bg)]">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.04]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-5 gap-8 md:gap-10 lg:gap-12">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {contactItems.map((item, i) => (
                <div key={i} className="glass-card p-4 sm:p-5 flex items-start gap-4 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div className="pt-0.5">
                    <div className="text-[10px] font-[var(--font-heading)] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">{item.label}</div>
                    <div className="text-sm font-medium leading-relaxed text-[var(--text)]">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3">
              <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-md">
                <h3 className="font-[var(--font-display)] text-xl font-bold mb-6">
                  Kirim Pesan
                </h3>
                {sent ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
                      <Send className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <h4 className="font-[var(--font-display)] text-xl font-bold mb-2">
                      Pesan Terkirim!
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Terima kasih telah menghubungi kami. Kami akan segera menghubungi Anda kembali.
                    </p>
                    <button onClick={() => setSent(false)} className="btn-ghost mt-6 text-xs">
                      Kirim Pesan Lain
                    </button>
                  </div>
                ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="text-[10px] font-bold font-[var(--font-heading)] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
                        Nama Lengkap *
                      </label>
                      <input id="contact-name" type="text" className="input-field" placeholder="Masukkan nama lengkap" required aria-label="Nama Lengkap" value={formData.name} onChange={updateField('name')} />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="text-[10px] font-bold font-[var(--font-heading)] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
                        Email *
                      </label>
                      <input id="contact-email" type="email" className="input-field" placeholder="Masukkan alamat email" required aria-label="Email" value={formData.email} onChange={updateField('email')} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="text-[10px] font-bold font-[var(--font-heading)] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
                      Nomor Telepon
                    </label>
                    <input id="contact-phone" type="tel" className="input-field" placeholder="Masukkan nomor telepon" aria-label="Nomor Telepon" value={formData.phone} onChange={updateField('phone')} />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="text-[10px] font-bold font-[var(--font-heading)] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
                      Subjek *
                    </label>
                    <select id="contact-subject" className="input-field" required aria-label="Subjek" value={formData.subject} onChange={updateField('subject')}>
                      <option value="">Pilih topik...</option>
                      <option value="enrollment">Pertanyaan Pendaftaran</option>
                      <option value="info">Informasi Umum</option>
                      <option value="visit">Kunjungan Pesantren</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="text-[10px] font-bold font-[var(--font-heading)] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
                      Pesan *
                    </label>
                    <textarea id="contact-message" className="input-field min-h-[140px] resize-none" placeholder="Tulis pesan Anda di sini..." required aria-label="Pesan" value={formData.message} onChange={updateField('message')} />
                  </div>
                  {formError && (
                    <p className="text-red-500 text-sm">{formError}</p>
                  )}
                  <button type="submit" disabled={sending} className="btn-primary w-full justify-center disabled:opacity-50">
                    <Send className="w-4 h-4" />
                    {sending ? 'Mengirim...' : 'Kirim Pesan'}
                  </button>
                </form>
                )}
              </div>
          </div>
          </div>

          <div className="text-center mt-12 sm:mt-16 pt-8 sm:pt-10">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-5">Ikuti Kami</h4>
            <div className="flex justify-center gap-3">
              {socialLinks.map((net) => (
                <a key={net.label} href={net.href} target="_blank" rel="noopener noreferrer" className="p-3 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all hover:scale-110" aria-label={net.label}>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d={net.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20 bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <span className="section-badge justify-center">FAQ</span>
            <h2 className="section-title">
              Pertanyaan Umum
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function FAQItem({ question, answer, defaultOpen }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false)

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-sm font-[var(--font-heading)] font-semibold pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-60' : 'max-h-0'}`}>
        <p className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}
