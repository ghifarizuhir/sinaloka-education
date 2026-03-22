import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, ExpenseQueryParams } from '@/src/types/expense';

export const expensesService = {
  getAll: (params?: ExpenseQueryParams) =>
    api.get<PaginatedResponse<Expense>>('/api/admin/expenses', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<Expense>(`/api/admin/expenses/${id}`).then((r) => r.data),
  create: (data: CreateExpenseDto) =>
    api.post<Expense>('/api/admin/expenses', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateExpenseDto }) =>
    api.patch<Expense>(`/api/admin/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/expenses/${id}`),
  uploadReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/api/uploads/receipts', formData).then((r) => r.data);
  },
  exportCsv: async (params?: { category?: string; search?: string; date_from?: string; date_to?: string }) => {
    const response = await api.get('/api/admin/expenses/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
