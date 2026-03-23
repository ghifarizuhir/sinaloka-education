import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Student, CreateStudentDto, UpdateStudentDto, StudentQueryParams } from '@/src/types/student';

export const studentsService = {
  getAll: (params?: StudentQueryParams) =>
    api.get<PaginatedResponse<Student>>('/api/admin/students', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Student>(`/api/admin/students/${id}`).then((r) => r.data),
  create: (data: CreateStudentDto) =>
    api.post<Student>('/api/admin/students', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateStudentDto }) =>
    api.patch<Student>(`/api/admin/students/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/students/${id}`),
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/admin/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  exportCsv: (params?: StudentQueryParams) =>
    api.get('/api/admin/students/export', { params, responseType: 'blob' }).then((r) => r.data),
};
