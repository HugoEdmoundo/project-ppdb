/**
 * Tipe bersama untuk halaman Profile + kartu "Sesi Perangkat".
 *
 * Dipakai oleh keempat app (Superadmin, Company Profile, PPDB Backoffice,
 * PPDB Pendaftar) supaya tampilan & kontrak data tetap identik.
 */

export interface ProfileUserLike {
  id?: string
  username?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  role_name?: string | null
  user_type?: string | null
  is_superadmin?: boolean
  created_at?: string | null
  last_login_at?: string | null
}

/** Satu sesi perangkat aktif (belum logout / token belum kedaluwarsa). */
export interface ProfileSession {
  id: string
  /** Kunci aplikasi asal sesi: companyprofile | superadmin | ppdb | "" */
  app: string
  /** Label tampilan aplikasi, mis. "Company Profile", "PPDB Backoffice". */
  app_label: string
  /** Ringkasan perangkat, mis. "Chrome · Windows". */
  device: string
  browser: string
  os: string
  ip_address: string
  user_agent: string
  created_at: string | null
  last_seen_at: string | null
  expires_at: string | null
  /** True untuk perangkat yang sedang dipakai (tidak bisa di-logout). */
  is_current: boolean
}

export interface DeviceSessionsResponse {
  sessions: ProfileSession[]
  current_session_id?: string | null
}
