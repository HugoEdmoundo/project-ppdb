'use client'

import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import SectionTitle from '@/app/components/ui/SectionTitle'

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

      {/* Vision, Mission & Goals */}
      <section id="vision" className="relative py-16 sm:py-20 md:py-28 bg-[var(--bg-secondary)] overflow-hidden">
        <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionTitle
            center
            badge="VISI & MISI"
            title="Arah dan Tujuan Kami"
          />

          {/* Vision */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="relative bg-[var(--bg-elevated)] rounded-2xl p-8 md:p-12 shadow-md border border-[var(--color-border)] text-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-gold)] to-[var(--accent)] rounded-t-2xl" />
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-6">
                <Target className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h3 className="font-[var(--font-display)] text-xl sm:text-2xl md:text-3xl font-bold mb-6 leading-tight">
                {'VISI'}
              </h3>
              <div className="relative">
                <span className="absolute -top-4 -left-2 text-5xl leading-none text-[var(--accent)]/10 font-serif select-none">&ldquo;</span>
                <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-4xl mx-auto italic px-4">
                  {'"Menjadi Lembaga Pendidikan Terbaik bagi generasi Islam dengan memberikan penghayatan dan bekal hidup agar dapat berkembang menjadi generasi Islam yang berakhlak mulia, berkepribadian kuat, memiliki kompetensi hafizh Al-Quran dan IT serta berjiwa mandiri dan mempunyai daya juang tinggi dalam menghadapi tantangan masa depan."'}
                </p>
                <span className="absolute -bottom-8 -right-2 text-5xl leading-none text-[var(--accent)]/10 font-serif select-none">&rdquo;</span>
              </div>
            </div>
          </div>

          {/* Mission & Goals Grid */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-8 shadow-md border border-[var(--color-border)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mb-5">
                <BookMarked className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h3 className="font-[var(--font-display)] text-xl font-bold mb-6">
                {'MISI'}
              </h3>
              <ul className="space-y-4">
                {[
                  'Menciptakan lingkungan yang islami, bersih, nyaman, dan bersahabat',
                  'Menumbuhkan akidah yang lurus, berakhlak mulia, berkepribadian kuat, dan berdaya juang tinggi',
                  'Mencetak generasi penerus yang hafal Al-Quran',
                  'Memiliki kemampuan dalam bidang informasi & teknologi',
                  'Menjalin kerjasama dengan berbagai pihak baik dalam dan luar negeri untuk meningkatkan mutu pendidikan',
                ].map((mission, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    <span className="w-6 h-6 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {mission}
                  </li>
                ))}
              </ul>
            </div>

            {/* Goals */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-8 shadow-md border border-[var(--color-border)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-gold-subtle)] flex items-center justify-center mb-5">
                <Award className="w-6 h-6 text-[var(--accent-gold)]" />
              </div>
              <h3 className="font-[var(--font-display)] text-xl font-bold mb-6">
                {'TUJUAN'}
              </h3>
              <ul className="space-y-4">
                {[
                  'Membangun peradaban Islam di muka bumi',
                  'Menumbuhkan kecintaan pada Allah dan Rasul-Nya melalui hafalan Al-Quran dan pemahaman Islam',
                  'Meningkatkan mutu perkembangan Islam melalui informasi dan teknologi mutakhir',
                  'Mencetak para pemimpin Muslim dan penggerak dakwah',
                ].map((goal, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-gold-subtle)] text-[var(--accent-gold)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Student Values (Nilai Santri) */}
      <section className="relative py-16 sm:py-20 md:py-28 bg-[var(--bg)]">
        <div className="absolute inset-0 bg-pattern-dots opacity-[0.04]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <SectionTitle
            center
            badge="NILAI SANTRI"
            title="Profil Santri Arrahman"
          />

          <p className="text-center text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto text-sm">
            {'Pesantren Tahfidz Quran dan Digital Arrahman membentuk santri dengan nilai-nilai inti berikut'}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentValues.map((cat, i) => {
              return (
                <div key={i} className="glass-card p-6 sm:p-7">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-bold tracking-widest mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    {cat.categoryId}
                  </div>
                  {cat.values.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">
                      {'Mengembangkan hubungan yang bermakna dengan teman, guru, dan masyarakat luas'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-2.5">
                      {cat.values.map((v, j) => (
                        <span key={j} className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                          <span className="w-1 h-1 rounded-full bg-[var(--accent-gold)]" />
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tagline */}
          <div className="text-center mt-16 p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-[var(--accent-subtle)] to-transparent border border-[var(--accent)]/10 max-w-3xl mx-auto">
            <span className="arabic-quote text-2xl sm:text-3xl text-[var(--accent-gold)] opacity-60 block mb-4 leading-relaxed">
              «جَعَلَكُمْ رَحْمَةً لِلْعَالَمِينَ»
            </span>
            <p className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[var(--text)] mb-3">
              {'Jadilah Generasi Rahmatan lil \'Alamin'}
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                {'Perubahan diri sendiri'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)]" />
                {'Keberanian mencetak satu langkah'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                {'Pantang menunda'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values (original) */}
      <section className="py-16 sm:py-20 md:py-28 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle
            center
            badge="NILAI INTI"
            title="Apa yang Kami Perjuangkan"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((v, i) => {
              const Icon = v.icon
              return (
                <div key={i} className="solid-card text-center p-6">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <h4 className="font-[var(--font-heading)] text-sm font-bold mb-2">{v.idn}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{v.descId}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

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
          <Link href="/ppdb" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--accent)] text-sm font-bold rounded-full hover:bg-white/90 transition-all shadow-md">
            {'Daftar Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
