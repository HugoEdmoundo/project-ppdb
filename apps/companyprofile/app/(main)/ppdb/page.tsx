'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  ArrowRight,
  Phone,
  ShieldCheck,
  Award,
  CheckCircle2,
  Laptop,
  Users
} from 'lucide-react'

import { useActivePpdbWave } from '@/app/hooks/usePpdbWave'
import { buildSchedule } from '@/app/lib/ppdb'

// Load Three.js 3D Hero dynamically with SSR disabled to prevent hydration/canvas errors
const OrbitDeliveryHero = dynamic(
  () => import('@/components/ui/orbit-delivery-hero'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[85vh] flex flex-col items-center justify-center bg-radial-gradient from-white to-[#f0f6ff] text-emerald-900">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium text-sm tracking-widest uppercase text-emerald-800/80 animate-pulse">
          Menyiapkan Dunia 3D Ar-Rahman…
        </p>
      </div>
    ),
  }
)

export default function PPDBPage() {
  const wave = useActivePpdbWave()
  const ppdb = buildSchedule(wave)

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* 3D Interactive Planet & Courier Hero */}
      <section className="relative w-full">
        <OrbitDeliveryHero theme="auto" academicYear={ppdb.academicYear} />
      </section>

      {/* Info Section: Jalur & Program PPDB */}
      <section id="info-section" className="py-20 md:py-28 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs tracking-wider uppercase mb-4 border border-emerald-500/20">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {ppdb.academicYear ? `Tahun Ajaran ${ppdb.academicYear}` : 'PPDB'}
          </div>
          <h2 className="font-[var(--font-display)] text-3xl md:text-5xl font-bold tracking-tight mb-5 text-emerald-950 dark:text-emerald-100">
            Jalur Pendaftaran Santri Baru
          </h2>
          <p className="text-[var(--text-secondary)] text-base md:text-lg leading-relaxed">
            Pilihlah jalur penerimaan yang sesuai dengan minat dan potensi ananda untuk bergabung bersama Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman.
          </p>
        </div>

        {/* 2 Jalur Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {/* Jalur Prestasi */}
          <div className="group relative rounded-3xl bg-[var(--bg-elevated)] border border-[var(--color-border)] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-emerald-600/40 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Beasiswa Penuh & Parsial
              </span>
              <h3 className="font-[var(--font-heading)] text-2xl font-bold mt-2 mb-3 text-[var(--text)]">
                Jalur Prestasi Tahfidz & Sains
              </h3>
              <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-6">
                Dikhususkan bagi calon santri yang memiliki hafalan Al-Qur&apos;an minimal 5 Juz bersanad mutqin atau memiliki prestasi kejuaraan sains, robotika, dan IT tingkat regional/nasional.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Bebas biaya pendaftaran dan seleksi',
                  'Potongan uang pangkal hingga 100%',
                  'Uji tasmi hafalan langsung dengan dewan asatidz',
                  'Sertifikat atau piagam kejuaraan pendukung'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium transition-colors shadow-sm"
            >
              Daftar Jalur Prestasi
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Jalur Reguler */}
          <div className="group relative rounded-3xl bg-[var(--bg-elevated)] border border-[var(--color-border)] p-8 md:p-10 shadow-sm hover:shadow-xl hover:border-emerald-600/40 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Seleksi Reguler Berbasis Minat
              </span>
              <h3 className="font-[var(--font-heading)] text-2xl font-bold mt-2 mb-3 text-[var(--text)]">
                Jalur Reguler Terpadu
              </h3>
              <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-6">
                Terbuka bagi seluruh lulusan SD/MI untuk jenjang SMP dan lulusan SMP/MTs untuk jenjang SMK yang memiliki komitmen kuat dalam menghafal Al-Qur&apos;an dan belajar teknologi digital.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Tes Potensi Akademik (TPA) & Baca Al-Qur&apos;an',
                  'Wawancara kesiapan santri dan orang tua',
                  'Observasi minat bakat teknologi digital',
                  'Pembinaan intensif tahsin di awal masuk'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-[var(--bg-secondary)] hover:bg-emerald-50 text-[var(--text)] hover:text-emerald-800 border border-[var(--color-border)] font-medium transition-colors"
            >
              Daftar Jalur Reguler
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 4 Pilar Keunggulan Santri */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="font-[var(--font-display)] text-2xl md:text-3xl font-bold mb-3">
              Kurikulum Holistik Masa Depan
            </h3>
            <p className="text-[var(--text-secondary)] text-sm md:text-base">
              Keseimbangan antara ilmu ukhrawi dan bekal teknologi kontemporer
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: 'Tahfidz Mutqin 30 Juz',
                desc: 'Metode hafalan intensif bimbingan asatidz bersanad dengan target mutqin dan adab Qur\'ani.'
              },
              {
                icon: Laptop,
                title: 'Coding & AI Academy',
                desc: 'Penguasaan rekayasa software, web development, robotika, dan dasar machine learning.'
              },
              {
                icon: Users,
                title: 'Bahasa Internasional',
                desc: 'Lingkungan pembiasaan bilingual Bahasa Arab dan Inggris aktif dalam interaksi harian.'
              },
              {
                icon: ShieldCheck,
                title: 'Adab & Kepemimpinan',
                desc: 'Pendidikan akhlak mulia, kemandirian pondok, dan kepekaan sosial kemasyarakatan.'
              }
            ].map((pillar, i) => {
              const Icon = pillar.icon
              return (
                <div key={i} className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--color-border)] hover:border-emerald-600/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-lg mb-2 text-[var(--text)]">{pillar.title}</h4>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{pillar.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alur Pendaftaran Simple Timeline */}
        <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--color-border)] p-8 md:p-12 mb-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Langkah Mudah</span>
            <h3 className="font-[var(--font-heading)] text-2xl md:text-3xl font-bold mt-1">Alur Pendaftaran PPDB</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Pendaftaran Online', desc: 'Isi formulir biodata santri dan unggah dokumen pendukung melalui sistem.' },
              { step: '02', title: 'Verifikasi Berkas', desc: 'Tim panitia memvalidasi data akademik dan administrasi calon santri.' },
              { step: '03', title: 'Ujian Seleksi & Tasmi', desc: 'Tes kemampuan dasar, observasi minat digital, dan tes baca Al-Qur\'an.' },
              { step: '04', title: 'Pengumuman & Daftar Ulang', desc: 'Penerimaan santri baru resmi dan persiapan orientasi santri (khutbah & ta\'aruf).' }
            ].map((step, idx) => (
              <div key={idx} className="relative p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--color-border)] shadow-sm">
                <span className="text-2xl font-black text-emerald-600/30 block mb-2 font-mono">{step.step}</span>
                <h4 className="font-bold text-base mb-1 text-[var(--text)]">{step.title}</h4>
                <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="font-[var(--font-display)] text-2xl md:text-3xl font-bold mb-3">
              Konsultasi Pendaftaran Santri Baru?
            </h3>
            <p className="text-emerald-100/80 text-sm md:text-base leading-relaxed">
              Tim panitia PPDB siap melayani pertanyaan mengenai kurikulum, program beasiswa, dan kunjungan kampus pesantren.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-full bg-white text-emerald-900 font-bold hover:bg-emerald-50 transition-colors shadow-md text-sm"
            >
              <Phone className="w-4 h-4 text-emerald-700" />
              Hubungi Panitia
            </Link>
            <Link
              href="/programs"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-full border border-emerald-400/30 text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Lihat Fasilitas & Asrama
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
