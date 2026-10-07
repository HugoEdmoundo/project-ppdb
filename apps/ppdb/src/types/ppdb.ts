export interface HealthIdentificationData {
  chronic_disease: boolean
  chronic_disease_description?: string | null
  diagnosed_conditions: string[]
  diagnosed_conditions_other?: string | null
  diagnosed_conditions_description?: string | null
  allergies: boolean
  allergy_types: string[]
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

export interface Applicant {
  id: string
  full_name: string
  email: string
  phone: string
  registration_path: string
  registration_level?: string
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
  disease_history?: string
  created_at: string
}

export interface Transaction {
  id: string
  applicant_name?: string
  full_name?: string
  applicant_email?: string
  wave_name?: string
  method: string
  amount: number
  created_at: string
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled' | 'exception'
}
