import { apiFetch } from '../api/client'

export const ppdbService = {
  getPeriods: (params?: any) => apiFetch<any>(`/ppdb/periods${params ? '?' + new URLSearchParams(params) : ''}`),
  getAllPeriods: () => apiFetch<any[]>('/ppdb/periods/all'),
  createPeriod: (body: any) => apiFetch<any>('/ppdb/periods', { method: 'POST', body: JSON.stringify(body) }),
  updatePeriod: (id: string, body: any) => apiFetch<any>(`/ppdb/periods/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}`, { method: 'DELETE' }),
  activatePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}/activate`, { method: 'PUT' }),
  deactivatePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}/deactivate`, { method: 'PUT' }),
  getWaves: (params?: any) => apiFetch<any>(`/ppdb/waves${params ? '?' + new URLSearchParams(params) : ''}`),
  createWave: (body: any) => apiFetch<any>('/ppdb/waves', { method: 'POST', body: JSON.stringify(body) }),
  updateWave: (id: string, body: any) => apiFetch<any>(`/ppdb/waves/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}`, { method: 'DELETE' }),
  activateWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}/activate`, { method: 'PUT' }),
  deactivateWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}/deactivate`, { method: 'PUT' }),
  registerApplicant: (body: any) => apiFetch<any>('/ppdb/register', { method: 'POST', body: JSON.stringify(body) }),
}

export const applicantService = {
  getApplicants: (params?: any) => apiFetch<any>(`/ppdb/applicants${params ? '?' + new URLSearchParams(params) : ''}`),
}

export const paymentService = {
  getTransactions: (params?: any) => apiFetch<any>(`/payment/transactions${params ? '?' + new URLSearchParams(params) : ''}`),
}

export const notificationService = {
  getTemplates: () => apiFetch<any[]>('/notifications/templates'),
  updateTemplate: (id: string, body: any) => apiFetch<any>(`/notifications/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}

export const settingsService = {
  getAll: () => apiFetch<{ key: string; value: string }[]>('/companyprofile/settings'),
}
