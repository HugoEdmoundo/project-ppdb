'use client'

import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import SectionTitle from '@/app/components/ui/SectionTitle'
import AboutProgramCarousel from '@/app/components/sections/AboutProgramCarousel'
import FlowArt, { FlowSection } from '@/app/components/ui/story-scroll'

import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Staff } from '@/app/lib/types'
import { Shield, Target, BookOpen, Cpu, Globe, Heart, Award, ArrowRight, BookMarked } from 'lucide-react'
import { useRef, useEffect } from 'react'

const coreValues = [
  { icon: BookOpen, idn: 'Berpusat Al-Quran', descId: 'Al-Quran sebagai fondasi utama pendidikan dan pembentukan karakter' },
  { icon: Cpu, idn: 'Inovasi Teknologi', descId: 'Menguasai teknologi digital terkini untuk masa depan' },
  { icon: Globe, idn: 'Perspektif Global', descId: 'Berwawasan internasional dengan akar budaya yang kuat' },
  { icon: Heart, idn: 'Karakter Utama', descId: 'Akhlak mulia sebagai prioritas sebelum kecerdasan' },
  { icon: Award, idn: 'Orientasi Unggul', descId: 'Budaya keunggulan dalam setiap aspek kehidupan' },
  { icon: Shield, idn: 'Berakar Integritas', descId: 'Kejujuran dan amanah sebagai nilai hidup' },
]

const studentValues = [
  {
    categoryId: 'AKIDAH AKHLAK',
    values: ['BERTAQWA', 'JUJUR', 'AMANAH', 'PEMBAWA PERUBAHAN LEBIH BAIK', 'BERJIWA SOSIAL'],
  },
  {
    categoryId: 'MENTAL KARAKTER',
    values: ['RAJIN', 'DISIPLIN', 'PERCAYA DIRI', 'TANGGUH', 'KREATIF', 'BERANI'],
  },
  {
    categoryId: 'SHALIH',
    values: ['AL-QURAN', 'KEISLAMAN', 'CERDAS', 'BAHASA', 'FISIK'],
  },
  {
    categoryId: 'SOCIAL RELATIONSHIP',
    values: [],
  },
  {
    categoryId: 'EKSTRAKURIKULER',
    values: ['UMUM'],
  },
  {
    categoryId: 'KOMPETEN',
    values: ['DIGITAL - IT', 'LEADERSHIP'],
  },
]

export default function AboutClient({ staff }: { staff: Staff[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'Tentang Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  const leaders = staff.filter((s) => s.role === 'leader')

  return (
    <>
      <PageHeader
        title="Tentang Kami"
        subtitle="Temukan kisah, visi, dan misi di balik Pesantren Tahfidz Qur&rsquo;an dan Digital Arrahman"
        badge="KISAH KAMI"
      />

      {/* Story Section */}
      <section className="py-16 sm:py-20 md:py-28 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            <div>
              <SectionTitle
                badge="SEJAK 2021"
                title="Warisan Keunggulan Quran & Digital"
              />
              <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
                <p>{'Terletak di kawasan strategis Rukan Hexa Green Kalimalang, Pesantren Arrahman lahir dari visi untuk menciptakan generasi pemimpin yang tidak hanya kuat dalam nilai-nilai Al-Quran tetapi juga unggul dalam inovasi digital.'}</p>
                <p>{'Selama 5 tahun terakhir, kami telah berkembang dari kelompok belajar tahfidz kecil menjadi pesantren komprehensif dari tingkat SMP hingga SMA (program terpadu 6 tahun), dengan fasilitas canggih dan kurikulum kelas dunia yang mengintegrasikan hafalan Al-Quran dengan coding, AI, robotik, dan pengembangan kepemimpinan.'}</p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-lg relative">
                <Image src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2070&auto=format&fit=crop" alt="Arrahman Boarding School" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              </div>
              <div className="absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-[var(--accent)] text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold">5+</div>
                <div className="text-xs sm:text-sm font-medium opacity-80">{'Tahun Keunggulan'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Carousel: auto-scroll ala PulseFit */}
      <AboutProgramCarousel />

      {/* Story Scroll Program Unggulan & Core Info */}
      <FlowArt aria-label="Tentang Kami">
        {/* SECTION 1: Program Unggulan */}
        <FlowSection aria-label="Program Unggulan" style={{ backgroundColor: '#F7F5F0', color: '#1A1A1A' }}>
          <div className="absolute inset-0 bg-pattern-dots opacity-[0.04]" />

          <div className="relative z-10 flex flex-col h-full">
            <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-[var(--accent)] pt-2 shrink-0">01 — Program Unggulan</p>
            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0" />

            <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text)] mb-6">
                Tahfidz
                <br />
                <span className="text-[var(--accent-gold)]">& Digital</span>
              </h1>
              <p className="max-w-[48ch] text-lg md:text-xl lg:text-2xl font-light leading-relaxed text-[var(--text-secondary)]">
                Perpaduan hafalan Al-Quran dengan kompetensi teknologi, bahasa, dan kepemimpinan — <strong className="font-semibold text-[var(--text)]">membentuk santri unggul sejak hari pertama.</strong>
              </p>
            </div>

            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0 opacity-0" />
          </div>
        </FlowSection>

        {/* SECTION 2: Visi & Misi */}
        <FlowSection aria-label="Visi Misi" style={{ backgroundColor: '#EFEDE8', color: '#1A1A1A' }}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />

          <div className="relative z-10 flex flex-col h-full overflow-y-auto no-scrollbar">
            <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] pt-2 shrink-0">02 — Arah dan Tujuan</p>
            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0" />

            <div className="flex-1 flex flex-col justify-center py-2 gap-4 md:gap-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text)]">
                Visi & <span className="text-[var(--accent)]">Misi</span>
              </h1>

              {/* Visi Card */}
              <div className="solid-card relative max-w-full">
                <span className="absolute -top-4 -left-2 text-4xl md:text-5xl text-[var(--accent-gold)] font-serif leading-none">"</span>
                <p className="text-base md:text-lg lg:text-xl font-light leading-relaxed italic text-[var(--text-secondary)] relative z-10 pl-6 md:pl-8">
                  Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan penghayatan dan bekal hidup agar dapat berkembang menjadi generasi Islam yang berakhlak mulia, berkepribadian kuat, memiliki kompetensi hafizh Al-Quran dan IT serta berjiwa mandiri...
                </p>
              </div>

              {/* Misi & Tujuan Cards */}
              <div className="grid md:grid-cols-2 gap-4 md:gap-6 pb-4">
                <div className="solid-card">
                  <h3 className="text-base md:text-lg font-bold uppercase tracking-widest text-[var(--text)] flex items-center gap-3 mb-4">
                    <Target className="w-5 h-5 text-[var(--accent)]" /> Misi Kami
                  </h3>
                  <ul className="space-y-3 text-sm md:text-base font-normal text-[var(--text-secondary)]">
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">01</span> <span className="leading-snug">Menciptakan lingkungan yang islami, bersih, nyaman, dan bersahabat</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">02</span> <span className="leading-snug">Menumbuhkan akidah yang lurus, berakhlak mulia, berkepribadian kuat</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">03</span> <span className="leading-snug">Mencetak generasi penerus yang hafal Al-Quran</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">04</span> <span className="leading-snug">Memiliki kemampuan di bidang informasi & teknologi</span></li>
                  </ul>
                </div>
                <div className="solid-card">
                  <h3 className="text-base md:text-lg font-bold uppercase tracking-widest text-[var(--text)] flex items-center gap-3 mb-4">
                    <Award className="w-5 h-5 text-[var(--accent)]" /> Tujuan Kami
                  </h3>
                  <ul className="space-y-3 text-sm md:text-base font-normal text-[var(--text-secondary)]">
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">01</span> <span className="leading-snug">Membangun peradaban Islam di muka bumi</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">02</span> <span className="leading-snug">Menumbuhkan kecintaan pada Allah dan Rasul-Nya</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">03</span> <span className="leading-snug">Meningkatkan mutu Islam melalui teknologi mutakhir</span></li>
                    <li className="flex items-start gap-3"><span className="w-5 h-5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-bold mt-0.5 text-[10px] flex items-center justify-center shrink-0">04</span> <span className="leading-snug">Mencetak para pemimpin Muslim dan penggerak dakwah</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </FlowSection>

        {/* SECTION 3: Nilai Santri */}
        <FlowSection aria-label="Nilai Santri" style={{ backgroundColor: '#F7F5F0', color: '#1A1A1A' }}>
          <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.04]" />

          <div className="relative z-10 flex flex-col h-full overflow-y-auto no-scrollbar">
            <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)] pt-2 shrink-0">03 — Profil Santri</p>
            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0" />

            <div className="flex-1 flex flex-col justify-center py-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8 text-[var(--text)]">
                Nilai Santri
              </h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl pb-4">
                {studentValues.map((cat, i) => (
                  <div key={i} className="glass-card p-5 hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="text-xs md:text-sm font-bold tracking-widest uppercase text-[var(--accent)] mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
                      {cat.categoryId}
                    </div>
                    {cat.values.length === 0 ? (
                      <p className="text-xs md:text-sm font-light text-[var(--text-muted)] leading-relaxed italic">
                        {'Mengembangkan hubungan sosial yang bermakna.'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {cat.values.map((v, j) => (
                          <span key={j} className="text-[11px] md:text-xs font-medium text-[var(--text)] px-2.5 py-1 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/10">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0" />

            <div className="mt-auto flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center pb-6 shrink-0">
              <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-[var(--accent-subtle)] to-transparent border border-[var(--accent)]/10">
                <span className="arabic-quote text-xl md:text-2xl text-[var(--accent-gold)]">«جَعَلَكُمْ رَحْمَةً لِلْعَالَمِينَ»</span>
              </div>
              <div className="flex-1">
                <p className="text-lg md:text-xl font-medium leading-snug text-[var(--text)]">
                  {'Jadilah Generasi Rahmatan lil \'Alamin'}
                </p>
                <p className="text-xs md:text-sm text-[var(--accent)] mt-1 uppercase tracking-[0.1em] font-semibold">Membawa Manfaat Bagi Semesta</p>
              </div>
            </div>
          </div>
        </FlowSection>

        {/* SECTION 4: Core Values */}
        <FlowSection aria-label="Nilai Inti" style={{ backgroundColor: '#EFEDE8', color: '#1A1A1A' }}>
          <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />

          <div className="relative z-10 flex flex-col h-full overflow-y-auto no-scrollbar">
            <p className="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] pt-2 shrink-0">04 — Nilai Inti</p>
            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0" />

            <div className="flex-1 flex flex-col justify-center py-4 gap-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text)]">
                Apa Yang Kami <span className="text-[var(--accent-gold)]">Perjuangkan</span>
              </h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl pb-4">
                {coreValues.map((v, i) => {
                  const Icon = v.icon
                  return (
                    <div key={i} className="solid-card text-center group">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <h4 className="font-bold text-base md:text-lg tracking-tight mb-2 text-[var(--text)]">{v.idn}</h4>
                      <p className="text-xs md:text-sm font-light text-[var(--text-secondary)] leading-relaxed">{v.descId}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <hr className="my-4 border-none border-t border-[var(--border-strong)] shrink-0 opacity-0" />
          </div>
        </FlowSection>
      </FlowArt>

      {/* Leadership */}
      <section className="py-16 sm:py-20 md:py-28 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle
            center
            badge="KEPEMIMPINAN"
            title="Tim Kepemimpinan Kami"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {leaders.map((person) => {
              const p = person.content ?? {}
              return (
                <div key={person.id} className="solid-card text-center p-8">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-2 border-[var(--accent)]/20 relative">
                    {person.image ? <Image src={person.image} alt={p.name || ''} fill className="object-cover" sizes="96px" /> : <div className="w-full h-full bg-[var(--bg-secondary)] rounded-full" />}
                  </div>
                  <h3 className="font-[var(--font-heading)] text-base font-bold">{p.name}</h3>
                  <p className="text-xs text-[var(--accent)] font-medium mb-3">{p.position}</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-3">{p.bio}</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(p.expertise || []).map((exp, j) => (
                      <span key={j} className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">{exp}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-10">
            <Link href="/staff" className="btn-ghost">
              {'Lihat Semua Guru & Staff'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-[var(--accent)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-[var(--font-display)] text-3xl md:text-4xl font-bold text-white mb-4">
            {'Siap Bergabung dengan Arrahman?'}
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8">
            {'Ambil langkah pertama menuju pendidikan kelas dunia yang menggabungkan keunggulan Al-Quran dengan inovasi digital.'}
          </p>
          <Link href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--accent)] text-sm font-bold rounded-full hover:bg-white/90 transition-all shadow-md">
            {'Daftar Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
