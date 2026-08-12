export interface User {
  id: string
  username: string
  email: string
  full_name: string
  role_id: string
  user_type: string
  is_active: boolean
  role?: Role
}

export interface Role {
  id: string
  name: string
  description: string
  is_superadmin: boolean
  permissions: Record<string, string>
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  user: User
  access_token: string
  token_type: string
}
