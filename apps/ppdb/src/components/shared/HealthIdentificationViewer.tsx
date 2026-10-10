import React from 'react'
import { Phone, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { HealthIdentificationData } from '@/types/ppdb'

interface HealthIdentificationViewerProps {
  data?: string | null
  className?: string
}

function parseHealthData(raw?: string | null): HealthIdentificationData | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'object' && parsed !== null && ('chronic_disease' in parsed || 'emergency_contact_name' in parsed)) {
      return parsed as HealthIdentificationData
    }
  } catch {
    // bukan JSON valid
  }
  return null
}

export const HealthIdentificationViewer: React.FC<HealthIdentificationViewerProps> = ({ data, className }) => {
  const parsed = parseHealthData(data)

  if (!data || !data.trim()) {
    return <span className="text-slate-500 italic">-</span>
  }

  // Jika format data lama (teks biasa non-JSON)
  if (!parsed) {
    return <span className="font-medium text-slate-800 whitespace-pre-line">{data}</span>
  }

  return (
    <div className={`space-y-4 text-sm ${className || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Penyakit Kronis */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">1. Penyakit Kronis</span>
            <Badge variant={parsed.chronic_disease ? 'destructive' : 'secondary'}>
              {parsed.chronic_disease ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.chronic_disease && parsed.chronic_disease_description && (
            <p className="text-xs text-slate-600 mt-1 pl-1 border-l-2 border-rose-400">
              {parsed.chronic_disease_description}
            </p>
          )}
        </div>

        {/* 2. Diagnosis Tertentu */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">2. Diagnosis Tertentu</span>
          </div>
          {parsed.diagnosed_conditions && parsed.diagnosed_conditions.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              <div className="flex flex-wrap gap-1">
                {parsed.diagnosed_conditions.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-white">
                    {c === 'Lainnya' && parsed.diagnosed_conditions_other ? `Lainnya: ${parsed.diagnosed_conditions_other}` : c}
                  </Badge>
                ))}
              </div>
              {parsed.diagnosed_conditions_description && (
                <p className="text-xs text-slate-600 pl-1 border-l-2 border-emerald-400">
                  {parsed.diagnosed_conditions_description}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Tidak ada kondisi yang dicentang</p>
          )}
        </div>

        {/* 3. Alergi */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">3. Riwayat Alergi</span>
            <Badge variant={parsed.allergies ? 'destructive' : 'secondary'}>
              {parsed.allergies ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.allergies && (
            <div className="space-y-1.5 mt-1">
              {parsed.allergy_types && parsed.allergy_types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parsed.allergy_types.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-white">
                      {a === 'Lainnya' && parsed.allergy_other ? `Lainnya: ${parsed.allergy_other}` : a}
                    </Badge>
                  ))}
                </div>
              )}
              {parsed.allergy_description && (
                <p className="text-xs text-slate-600 pl-1 border-l-2 border-amber-400">
                  {parsed.allergy_description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. Pengobatan Rutin */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">4. Pengobatan Rutin</span>
            <Badge variant={parsed.regular_medication ? 'destructive' : 'secondary'}>
              {parsed.regular_medication ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.regular_medication && parsed.regular_medication_description && (
            <p className="text-xs text-slate-600 mt-1 pl-1 border-l-2 border-indigo-400">
              {parsed.regular_medication_description}
            </p>
          )}
        </div>

        {/* 5. Keterbatasan Fisik */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">5. Keterbatasan Fisik</span>
            <Badge variant={parsed.physical_limitation ? 'destructive' : 'secondary'}>
              {parsed.physical_limitation ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.physical_limitation && parsed.physical_limitation_description && (
            <p className="text-xs text-slate-600 mt-1 pl-1 border-l-2 border-indigo-400">
              {parsed.physical_limitation_description}
            </p>
          )}
        </div>

        {/* 6. Rawat Inap / Operasi */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">6. Rawat Inap / Operasi (2 Thn)</span>
            <Badge variant={parsed.hospitalization_history ? 'destructive' : 'secondary'}>
              {parsed.hospitalization_history ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.hospitalization_history && parsed.hospitalization_history_description && (
            <p className="text-xs text-slate-600 mt-1 pl-1 border-l-2 border-indigo-400">
              {parsed.hospitalization_history_description}
            </p>
          )}
        </div>

        {/* 7. Kebutuhan Khusus */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">7. Kebutuhan Khusus Saat Belajar</span>
            <Badge variant={parsed.special_needs ? 'destructive' : 'secondary'}>
              {parsed.special_needs ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.special_needs && parsed.special_needs_description && (
            <p className="text-xs text-slate-600 mt-1 pl-1 border-l-2 border-indigo-400">
              {parsed.special_needs_description}
            </p>
          )}
        </div>
      </div>

      {/* Kontak Darurat */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="h-4 w-4 text-emerald-700" />
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Kontak Darurat</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">Nama Kontak:</span>
            <span className="font-semibold text-slate-800">{parsed.emergency_contact_name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Hubungan:</span>
            <span className="font-semibold text-slate-800">{parsed.emergency_contact_relation || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">No. Telepon:</span>
            <span className="font-semibold text-slate-800">{parsed.emergency_contact_phone || '-'}</span>
          </div>
        </div>
      </div>

      {/* Persetujuan Pernyataan */}
      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Pernyataan kebenaran data kesehatan telah disetujui pendaftar saat registrasi.</span>
      </div>
    </div>
  )
}
