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
