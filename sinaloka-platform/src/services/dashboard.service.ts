import api from '@/src/lib/api';
import type { DashboardStats, ActivityItem, UpcomingSession } from '@/src/types/dashboard';

export const dashboardService = {
  getStats: () => api.get<DashboardStats>('/api/admin/dashboard/stats').then((r) => r.data),
  getActivity: () => api.get<ActivityItem[]>('/api/admin/dashboard/activity').then((r) => r.data),
  getUpcomingSessions: () =>
    api.get<UpcomingSession[]>('/api/admin/dashboard/upcoming-sessions').then((r) => r.data),
};
