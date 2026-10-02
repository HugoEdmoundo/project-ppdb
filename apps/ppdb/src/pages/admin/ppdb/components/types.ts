export interface Session {
  id: string
  wave_id: string
  wave_name?: string
  name: string
  session_type?: 'tahfidz' | 'interview' | null
  session_date?: string
  start_time?: string
  end_time?: string
  mode?: 'online' | 'offline' | null
  officer_name?: string | null
  location?: string
  meeting_url?: string | null
  description?: string
  quota: number
  booked_count?: number
}

export interface SelectionCategory {
  id: string
  wave_id: string
  name: string
  criteria: SelectionCriteria[]
}

interface SelectionCriteria {
  id: string
  category_id: string
  name: string
  weight: number
}

export interface SelectionResult {
  result_id: string
  applicant_id: string
  full_name: string
  email: string
  registration_path: string
  registration_level: string
  applicant_status: string
  session_id?: string
  session_name?: string
  session_date?: string
  notes?: string
  scores: { criteria_id: string, score: number }[]
}
