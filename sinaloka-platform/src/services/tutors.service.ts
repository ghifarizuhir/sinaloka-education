import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Tutor, CreateTutorDto, UpdateTutorDto, TutorQueryParams } from '@/src/types/tutor';

export const tutorsService = {
  getAll: (params?: TutorQueryParams) =>
    api.get<PaginatedResponse<Tutor>>('/api/admin/tutors', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Tutor>(`/api/admin/tutors/${id}`).then((r) => r.data),
  create: (data: CreateTutorDto) =>
    api.post<Tutor>('/api/admin/tutors', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateTutorDto }) =>
    api.patch<Tutor>(`/api/admin/tutors/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/tutors/${id}`),
};
