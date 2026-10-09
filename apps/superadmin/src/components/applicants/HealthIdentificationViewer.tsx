import { Phone, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui'

export interface HealthIdentificationData {
  chronic_disease: boolean
  chronic_disease_description?: string | null
  diagnosed_conditions?: string[]
  diagnosed_conditions_other?: string | null
  diagnosed_conditions_description?: string | null
  allergies: boolean
  allergy_types?: string[]
  allergy_other?: string | null
  allergy_description?: string | null
  regular_medication: boolean
  regular_medication_description?: string | null
  physical_limitation: boolean
  physical_limitation_description?: string | null
  hospitalization_history: boolean
  hospitalization_history_description?: string | null
  special_needs: boolean
  special_needs_description?: string | null
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_phone: string
  health_declaration_confirmed: boolean
}

export function parseHealthData(raw?: string | null): HealthIdentificationData | null {
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

interface HealthIdentificationViewerProps {
  data?: string | null
  className?: string
}

export const HealthIdentificationViewer: React.FC<HealthIdentificationViewerProps> = ({ data, className }) => {
  const parsed = parseHealthData(data)

  if (!data || !data.trim()) {
    return <span className="text-muted-foreground italic text-xs">-</span>
  }

  // Jika format data lama (teks biasa non-JSON)
  if (!parsed) {
    return <span className="font-medium text-foreground whitespace-pre-line text-xs">{data}</span>
  }

  return (
    <div className={`space-y-3 text-xs ${className || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* 1. Riwayat Penyakit Kronis */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">1. Riwayat Penyakit Kronis</span>
            <Badge variant={parsed.chronic_disease ? 'destructive' : 'secondary'}>
              {parsed.chronic_disease ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.chronic_disease && parsed.chronic_disease_description && (
            <p className="text-muted-foreground mt-1 pl-1.5 border-l-2 border-destructive">
              {parsed.chronic_disease_description}
            </p>
          )}
        </div>

        {/* 2. Diagnosis Kondisi Tertentu */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">2. Diagnosis Tertentu</span>
          </div>
          {parsed.diagnosed_conditions && parsed.diagnosed_conditions.length > 0 ? (
            <div className="space-y-1 mt-1">
              <div className="flex flex-wrap gap-1">
                {parsed.diagnosed_conditions.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {c === 'Lainnya' && parsed.diagnosed_conditions_other ? `Lainnya: ${parsed.diagnosed_conditions_other}` : c}
                  </Badge>
                ))}
              </div>
              {parsed.diagnosed_conditions_description && (
                <p className="text-muted-foreground pl-1.5 border-l-2 border-emerald-500">
                  {parsed.diagnosed_conditions_description}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">Tidak ada kondisi yang dicentang</p>
          )}
        </div>

        {/* 3. Alergi */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">3. Riwayat Alergi</span>
            <Badge variant={parsed.allergies ? 'destructive' : 'secondary'}>
              {parsed.allergies ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.allergies && (
            <div className="space-y-1 mt-1">
              {parsed.allergy_types && parsed.allergy_types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parsed.allergy_types.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {a === 'Lainnya' && parsed.allergy_other ? `Lainnya: ${parsed.allergy_other}` : a}
                    </Badge>
                  ))}
                </div>
              )}
              {parsed.allergy_description && (
                <p className="text-muted-foreground pl-1.5 border-l-2 border-amber-500">
                  {parsed.allergy_description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. Pengobatan Rutin */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">4. Pengobatan Rutin</span>
            <Badge variant={parsed.regular_medication ? 'destructive' : 'secondary'}>
              {parsed.regular_medication ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.regular_medication && parsed.regular_medication_description && (
            <p className="text-muted-foreground mt-1 pl-1.5 border-l-2 border-blue-500">
              {parsed.regular_medication_description}
            </p>
          )}
        </div>

        {/* 5. Keterbatasan Fisik */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">5. Keterbatasan Fisik</span>
            <Badge variant={parsed.physical_limitation ? 'destructive' : 'secondary'}>
              {parsed.physical_limitation ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.physical_limitation && parsed.physical_limitation_description && (
            <p className="text-muted-foreground mt-1 pl-1.5 border-l-2 border-blue-500">
              {parsed.physical_limitation_description}
            </p>
          )}
        </div>

        {/* 6. Rawat Inap / Operasi */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">6. Rawat Inap / Operasi (2 Thn)</span>
            <Badge variant={parsed.hospitalization_history ? 'destructive' : 'secondary'}>
              {parsed.hospitalization_history ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.hospitalization_history && parsed.hospitalization_history_description && (
            <p className="text-muted-foreground mt-1 pl-1.5 border-l-2 border-blue-500">
              {parsed.hospitalization_history_description}
            </p>
          )}
        </div>

        {/* 7. Kebutuhan Khusus */}
        <div className="rounded-lg border border-border bg-card/60 p-2.5 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">7. Kebutuhan Khusus Saat Belajar</span>
            <Badge variant={parsed.special_needs ? 'destructive' : 'secondary'}>
              {parsed.special_needs ? 'Ya' : 'Tidak'}
            </Badge>
          </div>
          {parsed.special_needs && parsed.special_needs_description && (
            <p className="text-muted-foreground mt-1 pl-1.5 border-l-2 border-blue-500">
              {parsed.special_needs_description}
            </p>
          )}
        </div>
      </div>

      {/* Kontak Darurat */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Phone className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">
            Kontak Darurat (8-10)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <span className="text-muted-foreground block text-[10px]">Nama:</span>
            <span className="font-semibold text-foreground">{parsed.emergency_contact_name || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Hubungan:</span>
            <span className="font-semibold text-foreground">{parsed.emergency_contact_relation || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">No. Telepon:</span>
            <span className="font-semibold text-foreground">{parsed.emergency_contact_phone || '-'}</span>
          </div>
        </div>
      </div>

      {/* Status Pernyataan */}
      <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded border border-emerald-500/20">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span>Pernyataan kebenaran data kesehatan telah disetujui pendaftar saat registrasi.</span>
      </div>
    </div>
  )
}
