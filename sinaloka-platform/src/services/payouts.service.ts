import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Payout, CreatePayoutDto, UpdatePayoutDto, PayoutQueryParams } from '@/types/payout';

export const payoutsService = {
  getAll: (params?: PayoutQueryParams) =>
    api.get<PaginatedResponse<Payout>>('/api/admin/payouts', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Payout>(`/api/admin/payouts/${id}`).then((r) => r.data),
  create: (data: CreatePayoutDto) =>
    api.post<Payout>('/api/admin/payouts', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdatePayoutDto }) =>
    api.patch<Payout>(`/api/admin/payouts/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/payouts/${id}`),
};
