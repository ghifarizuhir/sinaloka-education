import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Payment, CreatePaymentDto, UpdatePaymentDto, PaymentQueryParams, OverdueSummary } from '@/src/types/payment';

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
  getOverdueSummary: () =>
    api.get<OverdueSummary>('/api/admin/payments/overdue-summary').then((r) => r.data),
  generateInvoice: (id: string) =>
    api.post<Payment>(`/api/admin/payments/${id}/generate-invoice`).then((r) => r.data),
  batchRecord: (data: { payment_ids: string[]; paid_date: string; method: 'CASH' | 'TRANSFER' | 'OTHER' }) =>
    api.post<{ updated: number }>('/api/admin/payments/batch-record', data).then((r) => r.data),
  remind: (id: string) =>
    api.post<{ reminded: boolean }>(`/api/admin/payments/${id}/remind`).then((r) => r.data),
  checkout: (id: string) =>
    api.post<{ snap_token: string; redirect_url: string }>(`/api/payments/${id}/checkout`).then((r) => r.data),
};
