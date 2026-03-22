import api from '@/src/lib/api';

export interface Notification {
  id: string;
  institution_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const notificationsService = {
  getAll: (params?: { page?: number; limit?: number; type?: string; unread?: boolean }) =>
    api.get<PaginatedResponse<Notification>>('/api/notifications', { params }).then((r) => r.data),

  getUnreadCount: () =>
    api.get<number>('/api/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string) =>
    api.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    api.patch('/api/notifications/read-all').then((r) => r.data),
};
