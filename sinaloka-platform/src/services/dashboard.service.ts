import api from '@/src/lib/api';
import type { DashboardStats, ActivityItem, UpcomingSession, AttendanceTrendPoint, StudentGrowthPoint, RevenueExpensesPoint } from '@/src/types/dashboard';

export const dashboardService = {
  getStats: () => api.get<DashboardStats>('/api/admin/dashboard/stats').then((r) => r.data),
  getActivity: () => api.get<ActivityItem[]>('/api/admin/dashboard/activity').then((r) => r.data),
  getUpcomingSessions: () =>
    api.get<UpcomingSession[]>('/api/admin/dashboard/upcoming-sessions').then((r) => r.data),
  getAttendanceTrend: () =>
    api.get<{ data: AttendanceTrendPoint[] }>('/api/admin/dashboard/attendance-trend').then((r) => r.data),
  getStudentGrowth: () =>
    api.get<{ data: StudentGrowthPoint[] }>('/api/admin/dashboard/student-growth').then((r) => r.data),
  getRevenueExpenses: () =>
    api.get<{ data: RevenueExpensesPoint[] }>('/api/admin/dashboard/revenue-expenses').then((r) => r.data),
};
