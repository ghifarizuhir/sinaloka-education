import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/src/services/reports.service';
import type { AttendanceReportParams, FinanceReportParams, StudentProgressReportParams } from '@/src/types/report';

export function useAttendanceReport(params: AttendanceReportParams, enabled = false) {
  return useQuery({ queryKey: ['reports', 'attendance', params], queryFn: () => reportsService.getAttendanceReport(params), enabled, staleTime: Infinity });
}
export function useFinanceReport(params: FinanceReportParams, enabled = false) {
  return useQuery({ queryKey: ['reports', 'finance', params], queryFn: () => reportsService.getFinanceReport(params), enabled, staleTime: Infinity });
}
export function useStudentProgressReport(params: StudentProgressReportParams, enabled = false) {
  return useQuery({ queryKey: ['reports', 'student-progress', params], queryFn: () => reportsService.getStudentProgressReport(params), enabled, staleTime: Infinity });
}
