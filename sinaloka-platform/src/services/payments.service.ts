import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common';
import type { Payment, CreatePaymentDto, UpdatePaymentDto, PaymentQueryParams } from '@/types/payment';

export const paymentsService = {
  getAll: (params?: PaymentQueryParams) =>
    api.get<PaginatedResponse<Payment>>('/api/admin/payments', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Payment>(`/api/admin/payments/${id}`).then((r) => r.data),
  create: (data: CreatePaymentDto) =>
    api.post<Payment>('/api/admin/payments', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
    api.patch<Payment>(`/api/admin/payments/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/payments/${id}`),
};
