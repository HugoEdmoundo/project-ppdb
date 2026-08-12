import { apiFetch } from '../api/client'

export const authService = {
  login: (data: { username: string; password: string }) => apiFetch<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch<any>('/auth/me'),
}
