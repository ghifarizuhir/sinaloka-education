import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/src/services/dashboard.service';

export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardService.getStats });
}
export function useDashboardActivity() {
  return useQuery({ queryKey: ['dashboard', 'activity'], queryFn: dashboardService.getActivity });
}
export function useDashboardUpcomingSessions() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-sessions'],
    queryFn: dashboardService.getUpcomingSessions,
  });
}
export function useDashboardAttendanceTrend() {
  return useQuery({ queryKey: ['dashboard', 'attendance-trend'], queryFn: dashboardService.getAttendanceTrend });
}
export function useDashboardStudentGrowth() {
  return useQuery({ queryKey: ['dashboard', 'student-growth'], queryFn: dashboardService.getStudentGrowth });
}
export function useDashboardRevenueExpenses() {
  return useQuery({ queryKey: ['dashboard', 'revenue-expenses'], queryFn: dashboardService.getRevenueExpenses });
}
