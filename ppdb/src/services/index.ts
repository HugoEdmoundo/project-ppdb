import { apiFetch } from '../api/client'

export const ppdbService = {
  getPeriods: (params?: any) => apiFetch<any>(`/ppdb/periods${params ? '?' + new URLSearchParams(params) : ''}`),
  getAllPeriods: () => apiFetch<any[]>('/ppdb/periods/all'),
  getPeriod: (id: string) => apiFetch<any>(`/ppdb/periods/${id}`),
  createPeriod: (body: any) => apiFetch<any>('/ppdb/periods', { method: 'POST', body: JSON.stringify(body) }),
  updatePeriod: (id: string, body: any) => apiFetch<any>(`/ppdb/periods/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}`, { method: 'DELETE' }),
  activatePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}/activate`, { method: 'PUT' }),
  deactivatePeriod: (id: string) => apiFetch<void>(`/ppdb/periods/${id}/deactivate`, { method: 'PUT' }),
  getWaves: (params?: any) => apiFetch<any>(`/ppdb/waves${params ? '?' + new URLSearchParams(params) : ''}`),
  getActiveWavePublic: () => apiFetch<any>('/ppdb/waves/active-public'),
  getAllWaves: (periodId?: string) => apiFetch<any[]>(`/ppdb/waves/all${periodId ? '?period_id=' + periodId : ''}`),
  getWave: (id: string) => apiFetch<any>(`/ppdb/waves/${id}`),
  createWave: (body: any) => apiFetch<any>('/ppdb/waves', { method: 'POST', body: JSON.stringify(body) }),
  updateWave: (id: string, body: any) => apiFetch<any>(`/ppdb/waves/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}`, { method: 'DELETE' }),
  activateWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}/activate`, { method: 'PUT' }),
  deactivateWave: (id: string) => apiFetch<void>(`/ppdb/waves/${id}/deactivate`, { method: 'PUT' }),
  registerApplicant: (body: any) => apiFetch<any>('/ppdb/register', { method: 'POST', body: JSON.stringify(body) }),

  // Wave Fee Items (Biaya Tahap 2)
  getWaveFeeItems: (waveId: string) => apiFetch<any[]>(`/ppdb/waves/${waveId}/fee-items`),
  createWaveFeeItem: (waveId: string, body: any) => apiFetch<any>(`/ppdb/waves/${waveId}/fee-items`, { method: 'POST', body: JSON.stringify(body) }),
  updateWaveFeeItem: (waveId: string, itemId: string, body: any) => apiFetch<any>(`/ppdb/waves/${waveId}/fee-items/${itemId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWaveFeeItem: (waveId: string, itemId: string) => apiFetch<void>(`/ppdb/waves/${waveId}/fee-items/${itemId}`, { method: 'DELETE' }),
  updateWaveMouTemplate: (waveId: string, template: string) => apiFetch<any>(`/ppdb/waves/${waveId}/mou-template`, { method: 'PUT', body: JSON.stringify({ mou_template: template }) }),

  // MOU (admin generate)
  generateMouForApplicant: (applicantId: string) => apiFetch<any>(`/ppdb/applicants/${applicantId}/mou/generate`, { method: 'POST' }),
}

export const applicantService = {
  getMyApplication: () => apiFetch<any>('/ppdb/applicants/me'),
  updateProfile: (body: any) => apiFetch<any>('/ppdb/applicants/me/profile', { method: 'PUT', body: JSON.stringify(body) }),
  getParents: () => apiFetch<any[]>('/ppdb/applicants/me/parents'),
  saveParent: (type: string, body: any) => apiFetch<any>(`/ppdb/applicants/me/parents/${type}`, { method: 'PUT', body: JSON.stringify(body) }),
  getStatusHistory: () => apiFetch<any[]>('/ppdb/applicants/me/status-history'),
  getApplicants: (params?: any) => apiFetch<any>(`/ppdb/applicants${params ? '?' + new URLSearchParams(params) : ''}`),
  getApplicantDetail: (id: string) => apiFetch<any>(`/ppdb/applicants/${id}`),
  updateApplicantStatus: (id: string, body: any) => apiFetch<any>(`/ppdb/applicants/${id}/status`, { method: 'POST', body: JSON.stringify(body) }),
}

export const documentService = {
  getRequirements: (levelId?: string) => apiFetch<any[]>(`/ppdb/document-requirements${levelId ? '?level_id=' + levelId : ''}`),
  createRequirement: (body: any) => apiFetch<any>('/ppdb/document-requirements', { method: 'POST', body: JSON.stringify(body) }),
  updateRequirement: (id: string, body: any) => apiFetch<any>(`/ppdb/document-requirements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRequirement: (id: string) => apiFetch<void>(`/ppdb/document-requirements/${id}`, { method: 'DELETE' }),
  getChecklist: () => apiFetch<any>('/ppdb/applicants/me/document-checklist'),
  uploadDocument: (requirementId: string, file: File) => { const fd = new FormData(); fd.append('file', file); fd.append('requirement_id', requirementId); return apiFetch<any>('/ppdb/applicants/me/documents', { method: 'POST', body: fd }) },
  getReviewQueue: (params?: any) => apiFetch<any>(`/ppdb/admin/documents/review${params ? '?' + new URLSearchParams(params) : ''}`),
  reviewDocument: (id: string, body: any) => apiFetch<any>(`/ppdb/admin/documents/${id}/review`, { method: 'PUT', body: JSON.stringify(body) }),
}

export const paymentService = {
  getMyInvoices: () => apiFetch<any[]>('/payment/invoices/mine'),
  getInvoices: (params?: any) => apiFetch<any>(`/payment/invoices${params ? '?' + new URLSearchParams(params) : ''}`),
  submitPayment: (invoiceId: string, amount: number, file: File, method = 'transfer') => { const fd = new FormData(); fd.append('file', file); fd.append('invoice_id', invoiceId); fd.append('amount', String(amount)); fd.append('payment_method', method); return apiFetch<any>('/payment/transactions', { method: 'POST', body: fd }) },
  generateInvoices: (applicantId: string) => apiFetch<any>('/payment/invoices/generate', { method: 'POST', body: JSON.stringify({ applicant_id: applicantId }) }),
  getTransactions: (params?: any) => apiFetch<any>(`/payment/transactions${params ? '?' + new URLSearchParams(params) : ''}`),
  verifyTransaction: (id: string, status: string, notes?: string) => apiFetch<any>(`/payment/transactions/${id}/verify`, { method: 'PUT', body: JSON.stringify({ status, notes: notes || null }) }),
  getStages: (params?: any) => apiFetch<any[]>(`/payment/stages${params ? '?' + new URLSearchParams(params) : ''}`),
  createStage: (body: any) => apiFetch<any>('/payment/stages', { method: 'POST', body: JSON.stringify(body) }),
  updateStage: (id: string, body: any) => apiFetch<any>(`/payment/stages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStage: (id: string) => apiFetch<void>(`/payment/stages/${id}`, { method: 'DELETE' }),
  getDiscounts: () => apiFetch<any[]>('/payment/discounts'),
  createDiscount: (body: any) => apiFetch<any>('/payment/discounts', { method: 'POST', body: JSON.stringify(body) }),
  updateDiscount: (id: string, body: any) => apiFetch<any>(`/payment/discounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDiscount: (id: string) => apiFetch<void>(`/payment/discounts/${id}`, { method: 'DELETE' }),
  assignDiscount: (applicantId: string, discountId: string, invoiceId?: string) => apiFetch<any>('/payment/discounts/assign', { method: 'POST', body: JSON.stringify({ applicant_id: applicantId, discount_id: discountId, invoice_id: invoiceId || null }) }),
  getInstallments: (invoiceId: string) => apiFetch<any>(`/payment/installments/${invoiceId}`),
  createInstallment: (invoiceId: string, totalInstallments: number) => apiFetch<any>(`/payment/installments/${invoiceId}`, { method: 'POST', body: JSON.stringify({ total_installments: totalInstallments }) }),
}

export const selectionService = {
  getTestTypes: () => apiFetch<any[]>('/selection/test-types'),
  createTestType: (body: any) => apiFetch<any>('/selection/test-types', { method: 'POST', body: JSON.stringify(body) }),
  updateTestType: (id: string, body: any) => apiFetch<any>(`/selection/test-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTestType: (id: string) => apiFetch<void>(`/selection/test-types/${id}`, { method: 'DELETE' }),
  getParameters: (testTypeId?: string) => apiFetch<any[]>(`/selection/test-parameters${testTypeId ? '?test_type_id=' + testTypeId : ''}`),
  createParameter: (body: any) => apiFetch<any>('/selection/test-parameters', { method: 'POST', body: JSON.stringify(body) }),
  updateParameter: (id: string, body: any) => apiFetch<any>(`/selection/test-parameters/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteParameter: (id: string) => apiFetch<void>(`/selection/test-parameters/${id}`, { method: 'DELETE' }),
  getSessions: (params?: any) => apiFetch<any>(`/selection/sessions${params ? '?' + new URLSearchParams(params) : ''}`),
  createSession: (body: any) => apiFetch<any>('/selection/sessions', { method: 'POST', body: JSON.stringify(body) }),
  updateSession: (id: string, body: any) => apiFetch<any>(`/selection/sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSession: (id: string) => apiFetch<void>(`/selection/sessions/${id}`, { method: 'DELETE' }),
  getMySessions: () => apiFetch<any[]>('/selection/applicants/me/sessions'),
  getMyResults: () => apiFetch<any[]>('/selection/applicants/me/results'),
  getMyGraduation: () => apiFetch<any>('/selection/applicants/me/graduation'),
  saveResult: (body: any) => apiFetch<any>('/selection/results', { method: 'POST', body: JSON.stringify(body) }),
  getResults: (params?: any) => apiFetch<any>(`/selection/results${params ? '?' + new URLSearchParams(params) : ''}`),
  getGraduations: (params?: any) => apiFetch<any>(`/selection/graduations${params ? '?' + new URLSearchParams(params) : ''}`),
  setGraduation: (body: any) => apiFetch<any>('/selection/graduations', { method: 'POST', body: JSON.stringify(body) }),
  getGraduationRules: (waveConfigId?: string) => apiFetch<any[]>(`/selection/graduation-rules${waveConfigId ? '?wave_config_id=' + waveConfigId : ''}`),
  createGraduationRule: (body: any) => apiFetch<any>('/selection/graduation-rules', { method: 'POST', body: JSON.stringify(body) }),
  updateGraduationRule: (id: string, body: any) => apiFetch<any>(`/selection/graduation-rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGraduationRule: (id: string) => apiFetch<void>(`/selection/graduation-rules/${id}`, { method: 'DELETE' }),
}

export const postService = {
  getMouTemplates: () => apiFetch<any[]>('/post/mou-templates'),
  createMouTemplate: (body: any) => apiFetch<any>('/post/mou-templates', { method: 'POST', body: JSON.stringify(body) }),
  updateMouTemplate: (id: string, body: any) => apiFetch<any>(`/post/mou-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMouTemplate: (id: string) => apiFetch<void>(`/post/mou-templates/${id}`, { method: 'DELETE' }),
  generateMou: (applicantId: string, templateId: string) => apiFetch<any>('/post/mou/generate', { method: 'POST', body: JSON.stringify({ applicant_id: applicantId, template_id: templateId }) }),
  getMouList: (params?: any) => apiFetch<any>(`/post/mou${params ? '?' + new URLSearchParams(params) : ''}`),
  deleteMou: (id: string) => apiFetch<void>(`/post/mou/${id}`, { method: 'DELETE' }),
  getMyMou: () => apiFetch<any>('/post/mou/mine'),
  signMou: (mouId: string, file: File) => { const fd = new FormData(); fd.append('signature', file); return apiFetch<any>(`/post/mou/${mouId}/sign`, { method: 'POST', body: fd }) },
  reviewMou: (id: string, status: string) => apiFetch<any>(`/post/mou/${id}/review`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAcceptanceLetters: (params?: any) => apiFetch<any>(`/post/acceptance-letters${params ? '?' + new URLSearchParams(params) : ''}`),
  generateAcceptanceLetter: (applicantId: string) => apiFetch<any>('/post/acceptance-letters/generate', { method: 'POST', body: JSON.stringify({ applicant_id: applicantId }) }),
  getMyAcceptanceLetter: () => apiFetch<any>('/post/acceptance-letters/mine'),
  getReRegistrations: (params?: any) => apiFetch<any>(`/post/re-registrations${params ? '?' + new URLSearchParams(params) : ''}`),
  createReRegistration: (body: any) => apiFetch<any>('/post/re-registrations', { method: 'POST', body: JSON.stringify(body) }),
  updateReRegistration: (id: string, body: any) => apiFetch<any>(`/post/re-registrations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteReRegistration: (id: string) => apiFetch<void>(`/post/re-registrations/${id}`, { method: 'DELETE' }),
  getMyReRegistration: () => apiFetch<any>('/post/re-registrations/mine'),
  getMplsSchedules: () => apiFetch<any[]>('/post/mpls-schedules'),
  createMplsSchedule: (body: any) => apiFetch<any>('/post/mpls-schedules', { method: 'POST', body: JSON.stringify(body) }),
  updateMplsSchedule: (id: string, body: any) => apiFetch<any>(`/post/mpls-schedules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMplsSchedule: (id: string) => apiFetch<void>(`/post/mpls-schedules/${id}`, { method: 'DELETE' }),
  assignMpls: (applicantId: string, scheduleId: string) => apiFetch<any>('/post/mpls/assign', { method: 'POST', body: JSON.stringify({ applicant_id: applicantId, schedule_id: scheduleId }) }),
  getMplsList: () => apiFetch<any[]>('/post/mpls'),
  deleteMplsAssignment: (id: string) => apiFetch<void>(`/post/mpls/${id}`, { method: 'DELETE' }),
  getMyMpls: () => apiFetch<any[]>('/post/mpls/mine'),
}

export const notifService = {
  getTemplates: () => apiFetch<any[]>('/notif/templates'),
  createTemplate: (body: any) => apiFetch<any>('/notif/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id: string, body: any) => apiFetch<any>(`/notif/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTemplate: (id: string) => apiFetch<void>(`/notif/templates/${id}`, { method: 'DELETE' }),
  sendNotification: (body: any) => apiFetch<any>('/notif/send', { method: 'POST', body: JSON.stringify(body) }),
  getHistory: (params?: any) => apiFetch<any>(`/notif/history${params ? '?' + new URLSearchParams(params) : ''}`),
  getMyNotifications: () => apiFetch<any[]>('/notif/my'),
  markRead: (id: string) => apiFetch<any>(`/notif/${id}/read`, { method: 'PUT' }),
  getCalendar: () => apiFetch<any[]>('/notif/calendar'),
  getAdminCalendar: () => apiFetch<any[]>('/notif/calendar/admin'),
  createCalendarEvent: (body: any) => apiFetch<any>('/notif/calendar', { method: 'POST', body: JSON.stringify(body) }),
  updateCalendarEvent: (id: string, body: any) => apiFetch<any>(`/notif/calendar/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCalendarEvent: (id: string) => apiFetch<void>(`/notif/calendar/${id}`, { method: 'DELETE' }),
}

export const notificationService = {
  getTemplates: () => apiFetch<any[]>('/notifications/templates'),
  updateTemplate: (id: string, body: any) => apiFetch<any>(`/notifications/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}

export const dashboardService = {
  getStats: () => apiFetch<any>('/ppdb/dashboard/stats'),
  getAuditLogs: (params?: any) => apiFetch<any>(`/dashboard/audit-logs${params ? '?' + new URLSearchParams(params) : ''}`),
  getReportsSummary: () => apiFetch<any>('/dashboard/reports/summary'),
  exportReport: (type: string) => `/dashboard/reports/export/${type}`,
}

export const stage2Service = {
  // Admin
  getPassedApplicants: (params?: any) => apiFetch<any>(`/payment/stage2/applicants${params ? '?' + new URLSearchParams(params) : ''}`),
  getDiscounts: (applicantId: string) => apiFetch<any>(`/payment/stage2/${applicantId}/discounts`),
  saveDiscounts: (applicantId: string, body: any) => apiFetch<any>(`/payment/stage2/${applicantId}/discounts`, { method: 'POST', body: JSON.stringify(body) }),
  getBills: (params?: any) => apiFetch<any>(`/payment/stage2/bills${params ? '?' + new URLSearchParams(params) : ''}`),
  confirmBill: (billId: string) => apiFetch<any>(`/payment/stage2/bills/${billId}/confirm`, { method: 'PUT' }),
  cancelBill: (billId: string) => apiFetch<any>(`/payment/stage2/bills/${billId}/cancel`, { method: 'PUT' }),
  // Applicant
  getMyBills: () => apiFetch<any>('/payment/stage2/my-bills'),
}

export const settingsService = {
  getAll: () => apiFetch<{ key: string; value: string }[]>('/companyprofile/settings'),
  getFavicon: () => apiFetch<{ value: string }>('/companyprofile/settings/favicon'),
  getLogo: () => apiFetch<{ value: string }>('/companyprofile/settings/logo'),
}
