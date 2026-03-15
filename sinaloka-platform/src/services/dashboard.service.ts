import api from '@/lib/api';
import type { DashboardStats, ActivityItem } from '@/types/dashboard';

export const dashboardService = {
  getStats: () => api.get<DashboardStats>('/api/admin/dashboard/stats').then((r) => r.data),
  getActivity: () => api.get<ActivityItem[]>('/api/admin/dashboard/activity').then((r) => r.data),
};
