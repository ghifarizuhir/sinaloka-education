import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';

function flattenParent(raw: any) {
  return {
    ...raw,
    name: raw.user?.name || '',
    email: raw.user?.email || '',
    children_count: raw._count?.children ?? raw.children?.length ?? 0,
    children: raw.children?.map((c: any) => c.student ?? c) ?? [],
  };
}

export const parentsService = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<any>>('/api/admin/parents', { params }).then((r) => ({
      ...r.data,
      data: (r.data.data ?? []).map(flattenParent),
    })),
  getById: (id: string) =>
    api.get<any>(`/api/admin/parents/${id}`).then((r) => flattenParent(r.data)),
  remove: (id: string) =>
    api.delete(`/api/admin/parents/${id}`),
  invite: (data: { email: string; student_ids: string[] }) =>
    api.post<any>('/api/admin/parents/invite', data).then((r) => r.data),
  linkStudents: ({ id, student_ids }: { id: string; student_ids: string[] }) =>
    api.post<any>(`/api/admin/parents/${id}/link`, { student_ids }).then((r) => flattenParent(r.data)),
  unlinkStudent: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
    api.delete(`/api/admin/parents/${parentId}/children/${studentId}`),
};
