import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Enrollment, CreateEnrollmentDto, UpdateEnrollmentDto, EnrollmentQueryParams, CheckConflictDto } from '@/src/types/enrollment';

export const enrollmentsService = {
  getAll: (params?: EnrollmentQueryParams) =>
    api.get<PaginatedResponse<Enrollment>>('/api/admin/enrollments', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Enrollment>(`/api/admin/enrollments/${id}`).then((r) => r.data),
  create: (data: CreateEnrollmentDto) =>
    api.post<Enrollment>('/api/admin/enrollments', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateEnrollmentDto }) =>
    api.patch<Enrollment>(`/api/admin/enrollments/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/enrollments/${id}`),
  checkConflict: (data: CheckConflictDto) =>
    api.post('/api/admin/enrollments/check-conflict', data).then((r) => r.data),
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/admin/enrollments/import', formData).then((r) => r.data);
  },
};
