import api from './client';
import type { NotificationListResponse } from '../types';

export const notificationApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<NotificationListResponse>('/api/notifications', { params: { page, limit } }).then((r) => r.data),

  getUnreadCount: () =>
    api.get<number>('/api/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string) =>
    api.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    api.patch('/api/notifications/read-all').then((r) => r.data),
};
