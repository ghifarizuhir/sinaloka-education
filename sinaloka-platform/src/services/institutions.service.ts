import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type {
  Institution,
  InstitutionSummary,
  CreateInstitutionPayload,
  UpdateInstitutionPayload,
} from '@/src/types/institution';

export const institutionsService = {
  getAll: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Institution>>('/api/admin/institutions', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Institution>(`/api/admin/institutions/${id}`).then((r) => r.data),

  create: (data: CreateInstitutionPayload) =>
    api.post<Institution>('/api/admin/institutions', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateInstitutionPayload }) =>
    api.patch<Institution>(`/api/admin/institutions/${id}`, data).then((r) => r.data),

  getSummary: (id: string) =>
    api.get<InstitutionSummary>(`/api/admin/institutions/${id}/summary`).then((r) => r.data),
};
