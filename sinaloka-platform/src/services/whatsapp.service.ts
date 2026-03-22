import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { WhatsappMessage, WhatsappStats, WhatsappSettings, WhatsappMessageQueryParams, WhatsappTemplate } from '@/src/types/whatsapp';

export const whatsappService = {
  getMessages: (params?: WhatsappMessageQueryParams) =>
    api.get<PaginatedResponse<WhatsappMessage>>('/api/admin/whatsapp/messages', { params }).then((r) => r.data),
  getStats: () =>
    api.get<WhatsappStats>('/api/admin/whatsapp/stats').then((r) => r.data),
  getSettings: () =>
    api.get<WhatsappSettings>('/api/admin/whatsapp/settings').then((r) => r.data),
  updateSettings: (data: Partial<WhatsappSettings>) =>
    api.patch<WhatsappSettings>('/api/admin/whatsapp/settings', data).then((r) => r.data),
  sendPaymentReminder: (paymentId: string) =>
    api.post<{ success: boolean; message_id: string | null }>(`/api/admin/whatsapp/payment-reminder/${paymentId}`).then((r) => r.data),
  getTemplate: (name: string) =>
    api.get<WhatsappTemplate>(`/api/admin/whatsapp/templates/${name}`).then((r) => r.data),
  updateTemplate: (name: string, body: string) =>
    api.put<WhatsappTemplate>(`/api/admin/whatsapp/templates/${name}`, { body }).then((r) => r.data),
  deleteTemplate: (name: string) =>
    api.delete<{ message: string }>(`/api/admin/whatsapp/templates/${name}`).then((r) => r.data),
};
