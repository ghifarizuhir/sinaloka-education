import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Tutor, CreateTutorDto, UpdateTutorDto, TutorQueryParams } from '@/src/types/tutor';

// The backend returns name/email nested inside `user`, but our Tutor type expects them at the top level.
function flattenTutor(raw: any): Tutor {
  return {
    ...raw,
    name: raw.name || raw.user?.name || '',
    email: raw.email || raw.user?.email || '',
  };
}

export const tutorsService = {
  getAll: (params?: TutorQueryParams) =>
    api.get<PaginatedResponse<any>>('/api/admin/tutors', { params }).then((r) => ({
      ...r.data,
      data: (r.data.data ?? []).map(flattenTutor),
    })),
  getById: (id: string) =>
    api.get<any>(`/api/admin/tutors/${id}`).then((r) => flattenTutor(r.data)),
  create: (data: CreateTutorDto) =>
    api.post<any>('/api/admin/tutors', data).then((r) => flattenTutor(r.data)),
  update: ({ id, data }: { id: string; data: UpdateTutorDto }) =>
    api.patch<any>(`/api/admin/tutors/${id}`, data).then((r) => flattenTutor(r.data)),
  remove: (id: string) =>
    api.delete(`/api/admin/tutors/${id}`),
  invite: (data: { email: string; name?: string; subject_ids: string[]; experience_years?: number }) =>
    api.post<any>('/api/admin/tutors/invite', data).then((r) => r.data),
  resendInvite: (id: string) =>
    api.post<any>(`/api/admin/tutors/${id}/resend-invite`).then((r) => r.data),
  cancelInvite: (id: string) =>
    api.post<any>(`/api/admin/tutors/${id}/cancel-invite`).then((r) => r.data),
};
