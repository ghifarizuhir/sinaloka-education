import api from '../lib/api';
import type { Registration, RegistrationSettings } from '../types/registration';

export const registrationService = {
  getRegistrations: (params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Registration[]; total: number }>('/api/admin/registrations', { params }).then((r) => r.data),

  getRegistration: (id: string) =>
    api.get<Registration>(`/api/admin/registrations/${id}`).then((r) => r.data),

  getPendingCount: () =>
    api.get<{ count: number }>('/api/admin/registrations/count').then((r) => r.data),

  approveRegistration: (id: string) =>
    api.patch<Registration>(`/api/admin/registrations/${id}/approve`).then((r) => r.data),

  rejectRegistration: (id: string, reason?: string) =>
    api.patch<Registration>(`/api/admin/registrations/${id}/reject`, { reason }).then((r) => r.data),

  getRegistrationSettings: () =>
    api.get<RegistrationSettings>('/api/settings/registration').then((r) => r.data),

  updateRegistrationSettings: (data: Partial<RegistrationSettings>) =>
    api.patch<RegistrationSettings>('/api/settings/registration', data).then((r) => r.data),
};
