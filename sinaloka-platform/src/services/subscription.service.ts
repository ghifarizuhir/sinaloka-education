import api from '../lib/api';
import type {
  SubscriptionStatus,
  SubscriptionInvoice,
  SubscriptionPayment,
  SubscriptionListItem,
  SubscriptionStats,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaginatedResponse,
} from '../types/subscription';

export const subscriptionService = {
  getStatus: () =>
    api.get<SubscriptionStatus>('/api/subscription').then((r) => r.data),

  getInvoices: () =>
    api.get<SubscriptionInvoice[]>('/api/subscription/invoices').then((r) => r.data),

  createPayment: (data: CreatePaymentRequest) =>
    api.post<CreatePaymentResponse>('/api/subscription/pay', data).then((r) => r.data),

  // SUPER_ADMIN
  listSubscriptions: (params?: Record<string, unknown>) =>
    api
      .get<PaginatedResponse<SubscriptionListItem>>('/api/admin/subscriptions', { params })
      .then((r) => r.data),

  getStats: () =>
    api.get<SubscriptionStats>('/api/admin/subscriptions/stats').then((r) => r.data),

  overrideSubscription: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/admin/subscriptions/${id}`, data).then((r) => r.data),

  listPayments: (params?: Record<string, unknown>) =>
    api
      .get<PaginatedResponse<SubscriptionPayment>>('/api/admin/subscription-payments', { params })
      .then((r) => r.data),

  confirmPayment: (id: string, data: { action: 'approve' | 'reject'; notes?: string }) =>
    api.patch(`/api/admin/subscription-payments/${id}/confirm`, data).then((r) => r.data),
};
