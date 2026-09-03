export interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  registration_path: string
  registration_level: string
  wave_name?: string
  payment_status: 'pending' | 'paid' | 'expired'
  status: string
  birth_place?: string
  birth_date?: string
  gender?: string
  nisn?: string
  nik?: string
  province?: string
  city?: string
  district?: string
  village?: string
  postal_code?: string
  address?: string
  parent_name?: string
  previous_school?: string
  created_at: string
}

export interface Transaction {
  id: string
  applicant_name?: string
  full_name?: string
  applicant_email?: string
  wave_name?: string
  payment_method: string
  amount: number
  created_at: string
  status: 'pending' | 'paid' | 'expired'
}
