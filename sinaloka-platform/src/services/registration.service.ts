import api from '../lib/api';
import type { Registration, RegistrationSettings } from '../types/registration';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const publicApi = axios.create({ baseURL: API_BASE_URL });

interface RegistrationInfo {
  institution: { name: string; logo_url: string | null; slug: string };
  registration: { student_enabled: boolean; tutor_enabled: boolean };
}

interface StudentRegistrationPayload {
  name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  phone?: string;
  parent_email?: string;
}

interface TutorRegistrationPayload {
  name: string;
  email: string;
  phone?: string;
  subject_names: string[];
  experience_years?: number;
}

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

  // Public registration endpoints (no auth required — uses publicApi to avoid 401 interceptor redirect)
  getRegistrationInfo: (slug: string) =>
    publicApi.get<RegistrationInfo>(`/api/register/${slug}`).then((r) => r.data),

  submitStudentRegistration: (slug: string, data: StudentRegistrationPayload) =>
    publicApi.post(`/api/register/${slug}/student`, data).then((r) => r.data),

  submitTutorRegistration: (slug: string, data: TutorRegistrationPayload) =>
    publicApi.post(`/api/register/${slug}/tutor`, data).then((r) => r.data),
};
