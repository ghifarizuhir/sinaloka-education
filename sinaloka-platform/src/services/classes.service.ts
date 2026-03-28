import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Class, ClassDetail, CreateClassDto, UpdateClassDto, ClassQueryParams } from '@/src/types/class';

export interface ClassStats {
  total_classes: number;
  active_classes: number;
  total_monthly_fee: number;
}

export const classesService = {
  getAll: (params?: ClassQueryParams) =>
    api.get<PaginatedResponse<Class>>('/api/admin/classes', { params }).then((r) => r.data),
  getStats: (params?: { semester_id?: string }) =>
    api.get<ClassStats>('/api/admin/classes/stats', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ClassDetail>(`/api/admin/classes/${id}`).then((r) => r.data),
  create: (data: CreateClassDto) =>
    api.post<Class>('/api/admin/classes', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateClassDto }) =>
    api.patch<Class>(`/api/admin/classes/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/classes/${id}`),
};
