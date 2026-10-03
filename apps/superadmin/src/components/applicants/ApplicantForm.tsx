import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Input, Label, SelectField, Textarea } from '@/components/ui'
import type { ApplicantWave } from '../../api/client'

export const REGISTRATION_PATHS = [
  { value: 'reguler', label: 'Reguler' },
  { value: 'pindahan', label: 'Pindahan' },
]

/**
 * Status alur pendaftar. Daftar ini dipakai bersama oleh form edit dan kolom
 * tabel supaya label yang sama muncul di dua tempat.
 */
export const APPLICANT_STATUSES = [
  { value: 'pending_payment', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Sudah Bayar' },
  { value: 'document_uploaded', label: 'Dokumen Diunggah' },
  { value: 'document_uploaded_pending', label: 'Menunggu Verifikasi Dokumen' },
  { value: 'document_approved', label: 'Dokumen Disetujui' },
  { value: 'document_rejected', label: 'Dokumen Ditolak' },
  { value: 'selection', label: 'Seleksi' },
  { value: 'passed', label: 'Lulus' },
  { value: 'failed', label: 'Tidak Lulus' },
  { value: 'expired', label: 'Kedaluwarsa' },
]

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Belum Bayar' },
  { value: 'paid', label: 'Lunas' },
  { value: 'failed', label: 'Gagal' },
  { value: 'expired', label: 'Kedaluwarsa' },
]

const EMPTY_FORM: Record<string, string> = {
  wave_id: '',
  full_name: '',
  email: '',
  phone: '',
  registration_path: 'reguler',
  registration_level: '',
  gender: '',
  birth_place: '',
  birth_date: '',
  nisn: '',
  nik: '',
  parent_name: '',
  previous_school: '',
  major_choice: '',
  province: '',
  city: '',
  district: '',
  village: '',
  postal_code: '',
  address: '',
  status: 'pending_payment',
  payment_status: 'pending',
}

type FormState = Record<string, string>

/** Radix Select rejects empty-string values, so "not set" needs a sentinel. */
const UNSET = '__unset__'

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  inputMode,
  maxLength,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  inputMode?: 'numeric' | 'text' | 'email' | 'tel'
  maxLength?: number
}) {
  return (
    <div>
      <Label htmlFor={`af-${name}`} className="mb-1.5 block text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={`af-${name}`}
        name={name}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)}
      />
    </div>
  )
}

/**
 * Form data pendaftar untuk Create & Edit.
 *
 * Password SENGAJA tidak ada di sini — konsep kredensial tetap seperti semula:
 * username & password dibuat sistem, dan perubahan password hanya lewat aksi
 * "Reset Password" terpisah.
 */
export default function ApplicantForm({
  mode,
  initial,
  waves,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  mode: 'create' | 'edit'
  initial?: any
  waves: ApplicantWave[]
  submitting: boolean
  onSubmit: (payload: Record<string, string>) => void
  onCancel: () => void
  submitLabel: string
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'edit' && initial) {
      const next: FormState = { ...EMPTY_FORM }
      for (const key of Object.keys(EMPTY_FORM)) {
        const v = initial[key]
        next[key] = v === null || v === undefined ? '' : String(v)
      }
      setForm(next)
    } else {
      setForm({ ...EMPTY_FORM })
    }
    setErrors({})
  }, [mode, initial])

  const waveOptions = useMemo(
    () => [
      { value: '__none__', label: '— Tanpa gelombang —' },
      ...waves.map((w) => ({
        value: w.id,
        label: `${w.period_name} · ${w.name}${w.status === 'active' ? ' (aktif)' : ''}`,
      })),
    ],
    [waves]
  )

  const set = (name: string, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }))

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!form.full_name.trim()) next.full_name = 'Nama wajib diisi'
    if (!form.email.trim()) next.email = 'Email wajib diisi'
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = 'Format email tidak valid'
    if (!form.phone.trim()) next.phone = 'Nomor WhatsApp wajib diisi'
    else if (!/^\d+$/.test(form.phone.trim()))
      next.phone = 'Nomor WhatsApp hanya boleh angka'
    else if (form.phone.trim().length < 9)
      next.phone = 'Nomor WhatsApp minimal 9 digit'
    if (!form.registration_level.trim())
      next.registration_level = 'Jenjang wajib diisi'
    if (!form.province.trim()) next.province = 'Provinsi wajib diisi'
    if (!form.city.trim()) next.city = 'Kota/Kabupaten wajib diisi'
    if (!form.district.trim()) next.district = 'Kecamatan wajib diisi'
    if (!form.village.trim()) next.village = 'Kelurahan/Desa wajib diisi'
    if (form.address.trim().length < 5)
      next.address = 'Alamat wajib diisi (minimal 5 karakter)'
    if (form.postal_code.trim() && !/^\d{5}$/.test(form.postal_code.trim()))
      next.postal_code = 'Kode pos harus 5 digit angka'
    if (form.nisn.trim() && !/^\d{10}$/.test(form.nisn.trim()))
      next.nisn = 'NISN harus 10 digit angka'
    if (form.nik.trim() && !/^\d{16}$/.test(form.nik.trim()))
      next.nik = 'NIK harus 16 digit angka'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h4 className="text-sm font-semibold">Penempatan & Jalur</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs">
              Periode &amp; Gelombang
            </Label>
            <SelectField
              options={waveOptions}
              value={form.wave_id || '__none__'}
              onValueChange={(v) => set('wave_id', v === '__none__' ? '' : v)}
              placeholder="Pilih gelombang..."
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Gelombang menentukan label periode pada daftar &amp; dashboard.
            </p>
          </div>
          <SelectField
            label="Jalur Pendaftaran"
            options={REGISTRATION_PATHS}
            value={form.registration_path}
            onValueChange={(v) => set('registration_path', v)}
          />
          <Field
            label="Jenjang Tujuan"
            name="registration_level"
            value={form.registration_level}
            onChange={set}
            placeholder="mis. SMP"
            required
          />
          {mode === 'edit' && (
            <>
              <SelectField
                label="Status Pendaftaran"
                options={APPLICANT_STATUSES}
                value={form.status}
                onValueChange={(v) => set('status', v)}
              />
              <SelectField
                label="Status Pembayaran"
                options={PAYMENT_STATUSES}
                value={form.payment_status}
                onValueChange={(v) => set('payment_status', v)}
              />
            </>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t pt-4">
        <h4 className="text-sm font-semibold">Identitas &amp; Kontak</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nama Lengkap"
            name="full_name"
            value={form.full_name}
            onChange={set}
            required
          />
          <Field
            label="Email"
            name="email"
            value={form.email}
            onChange={set}
            type="email"
            inputMode="email"
            required
          />
          <Field
            label="No. WhatsApp"
            name="phone"
            value={form.phone}
            onChange={set}
            inputMode="numeric"
            maxLength={16}
            required
          />
          <SelectField
            label="Jenis Kelamin"
            options={[
              { value: UNSET, label: '— Tidak diisi —' },
              { value: 'L', label: 'Laki-laki' },
              { value: 'P', label: 'Perempuan' },
            ]}
            value={form.gender || UNSET}
            onValueChange={(v) => set('gender', v === UNSET ? '' : v)}
          />
          <Field
            label="NISN"
            name="nisn"
            value={form.nisn}
            onChange={set}
            inputMode="numeric"
            maxLength={10}
          />
          <Field
            label="NIK"
            name="nik"
            value={form.nik}
            onChange={set}
            inputMode="numeric"
            maxLength={16}
          />
          <Field
            label="Tempat Lahir"
            name="birth_place"
            value={form.birth_place}
            onChange={set}
          />
          <Field
            label="Tanggal Lahir"
            name="birth_date"
            value={form.birth_date}
            onChange={set}
            type="date"
          />
          <Field
            label="Nama Orang Tua/Wali"
            name="parent_name"
            value={form.parent_name}
            onChange={set}
          />
          <Field
            label="Asal Sekolah"
            name="previous_school"
            value={form.previous_school}
            onChange={set}
          />
          <Field
            label="Pilihan Jurusan"
            name="major_choice"
            value={form.major_choice}
            onChange={set}
          />
        </div>
      </section>

      <section className="space-y-4 border-t pt-4">
        <h4 className="text-sm font-semibold">Domisili</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Provinsi"
            name="province"
            value={form.province}
            onChange={set}
            required
          />
          <Field
            label="Kota/Kabupaten"
            name="city"
            value={form.city}
            onChange={set}
            required
          />
          <Field
            label="Kecamatan"
            name="district"
            value={form.district}
            onChange={set}
            required
          />
          <Field
            label="Kelurahan/Desa"
            name="village"
            value={form.village}
            onChange={set}
            required
          />
          <Field
            label="Kode Pos"
            name="postal_code"
            value={form.postal_code}
            onChange={set}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <div>
          <Label htmlFor="af-address" className="mb-1.5 block text-xs">
            Alamat Detail<span className="text-destructive"> *</span>
          </Label>
          <Textarea
            id="af-address"
            rows={3}
            value={form.address}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              set('address', e.target.value)
            }
          />
        </div>
      </section>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <ul className="list-disc pl-4 space-y-0.5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : submitLabel}
        </button>
      </div>
    </form>
  )
}