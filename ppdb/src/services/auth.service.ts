import { apiFetch } from '../api/client'

export const authService = {
  login: (data: { username: string; password: string }) => apiFetch<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch<any>('/auth/me'),
  updateProfile: (body: {
    username?: string
    email?: string
    full_name?: string
    avatar_url?: string
    old_password?: string
    new_password?: string
  }) => apiFetch<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetch<any>('/auth/upload', { method: 'POST', body: fd })
  },
}
