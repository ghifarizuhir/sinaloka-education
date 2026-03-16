import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TUTOR' | 'PARENT';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  institution: { id: string; name: string } | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  institution_id: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
}

export const usersService = {
  getAll: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<AdminUser>>('/api/admin/users', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<AdminUser>(`/api/admin/users/${id}`).then((r) => r.data),

  create: (data: CreateUserPayload) =>
    api.post<AdminUser>('/api/admin/users', data).then((r) => r.data),

  update: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
    api.patch<AdminUser>(`/api/admin/users/${id}`, data).then((r) => r.data),
};
