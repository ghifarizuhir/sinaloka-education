import api from '@/src/lib/api';
import type { DashboardStats, ActivityItem } from '@/src/types/dashboard';

export const dashboardService = {
  getStats: () => api.get<DashboardStats>('/api/admin/dashboard/stats').then((r) => r.data),
  getActivity: () => api.get<ActivityItem[]>('/api/admin/dashboard/activity').then((r) => r.data),
};
