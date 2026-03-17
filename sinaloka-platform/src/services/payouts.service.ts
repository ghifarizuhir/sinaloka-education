import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Payout, CreatePayoutDto, UpdatePayoutDto, PayoutQueryParams, PayoutCalculation } from '@/src/types/payout';

export const payoutsService = {
  getAll: (params?: PayoutQueryParams) =>
    api.get<PaginatedResponse<Payout>>('/api/admin/payouts', { params }).then((r) => {
      const raw = r.data as any;
      // Normalize: backend may return { data, meta } or flat { data, total, page, limit }
      if (raw.meta) return raw as PaginatedResponse<Payout>;
      return {
        data: raw.data,
        meta: {
          total: raw.total ?? 0,
          page: raw.page ?? 1,
          limit: raw.limit ?? 20,
          totalPages: Math.ceil((raw.total ?? 0) / (raw.limit ?? 20)),
          hasNextPage: (raw.page ?? 1) < Math.ceil((raw.total ?? 0) / (raw.limit ?? 20)),
          hasPreviousPage: (raw.page ?? 1) > 1,
        },
      } as PaginatedResponse<Payout>;
    }),
  getById: (id: string) =>
    api.get<Payout>(`/api/admin/payouts/${id}`).then((r) => r.data),
  create: (data: CreatePayoutDto) =>
    api.post<Payout>('/api/admin/payouts', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdatePayoutDto }) =>
    api.patch<Payout>(`/api/admin/payouts/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/payouts/${id}`),
  calculatePayout: (params: { tutor_id: string; period_start: string; period_end: string }) =>
    api.get<PayoutCalculation>('/api/admin/payouts/calculate', { params }).then((r) => r.data),
  uploadProof: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/uploads/proofs', formData).then((r) => r.data.url);
  },
  generateSlip: (id: string) =>
    api.post<Payout>(`/api/admin/payouts/${id}/generate-slip`).then((r) => r.data),
  exportAudit: (id: string) =>
    api.get(`/api/admin/payouts/${id}/export-audit`, { responseType: 'blob' }).then((r) => r.data as Blob),
  generateSalaries: () =>
    api.post<{ created: number }>('/api/admin/payouts/generate-salaries').then((r) => r.data),
};
